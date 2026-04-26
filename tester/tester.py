import asyncio
import os
import json
import base64
import io
import requests
import google.generativeai as genai
from playwright.async_api import async_playwright
from PIL import Image
from pathlib import Path

TELEGRAM_WEB_SESSION = os.environ['TELEGRAM_WEB_SESSION']
BOT_USERNAME = 'petpath_app_bot'
REPORT_BOT_TOKEN = os.environ['REPORT_BOT_TOKEN']
REPORT_CHAT_ID = os.environ['REPORT_CHAT_ID']
GEMINI_API_KEY = os.environ['GEMINI_API_KEY']

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

SCREENSHOTS_DIR = Path('tester/screenshots')
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
_counter = 0

# Messages to send through the InputBar — AI will parse and route them
TEST_MESSAGES = [
    "My pet's name is Барсик",
    "Today ate Royal Canin dry food 50g in the morning",
    "Vet checkup today, weight 4.2kg, all normal",
    "Rabies vaccine done today",
]


async def save_screenshot(frame_el, page, label=''):
    global _counter
    _counter += 1
    path = SCREENSHOTS_DIR / f'{_counter:03d}_{label[:30]}.png'
    try:
        data = await frame_el.screenshot()
    except Exception:
        data = await page.screenshot()
    path.write_bytes(data)
    return Image.open(io.BytesIO(data))


async def ask_gemini_check(img: Image.Image, question: str) -> dict:
    """Ask Gemini to verify something visible on the screenshot."""
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    img_b64 = base64.b64encode(buf.getvalue()).decode()

    resp = model.generate_content([
        f"""Посмотри на скриншот мини-приложения PetPath и ответь на вопрос.
Ответь ТОЛЬКО валидным JSON без markdown:
{{"ok": true/false, "details": "что видишь"}}

Вопрос: {question}""",
        {'mime_type': 'image/png', 'data': img_b64}
    ])

    text = resp.text.strip()
    if '```' in text:
        parts = text.split('```')
        text = parts[1] if len(parts) > 1 else parts[0]
        if text.startswith('json'):
            text = text[4:]
    return json.loads(text.strip())


async def type_and_send(frame, text: str) -> bool:
    """Type text into InputBar and send it. Returns True if successful."""
    try:
        await frame.click('.input-textarea', timeout=5000)
        await asyncio.sleep(0.5)
        await frame.fill('.input-textarea', text)
        await asyncio.sleep(0.5)
        await frame.click('.send-btn', timeout=5000)
        await asyncio.sleep(3)
        return True
    except Exception as e:
        print(f'  type_and_send failed: {e}')
        return False


async def open_miniapp(page):
    await page.goto(f'https://web.telegram.org/k/#@{BOT_USERNAME}')
    await asyncio.sleep(8)

    opened = False
    for sel in ['.bot-menu-button', 'button.bot-menu', '[class*="bot-menu"]']:
        try:
            await page.click(sel, timeout=2000)
            opened = True
            break
        except Exception:
            pass
    if not opened:
        await page.mouse.click(622, 752)

    await asyncio.sleep(3)

    for sel in ['button >> text=LAUNCH', 'button >> text=Launch', '.popup-button.btn.primary']:
        try:
            await page.click(sel, timeout=3000)
            print(f'  Dialog: {sel}')
            break
        except Exception:
            pass

    await asyncio.sleep(5)

    frame = None
    for f in page.frames:
        if f.url and 'github.io' in f.url:
            frame = f
            break
    if not frame:
        for f in page.frames:
            if f.url and 'telegram' not in f.url and f.url.startswith('http'):
                frame = f
                break

    frame_el = None
    for sel in ['iframe[src*="github.io"]', 'iframe[src*="petpath"]', 'iframe']:
        el = await page.query_selector(sel)
        if el:
            frame_el = el
            break

    print(f'  Frame: {"found" if frame else "NOT FOUND"}')
    return frame, frame_el


async def main():
    storage_state = json.loads(TELEGRAM_WEB_SESSION)
    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            storage_state=storage_state,
            viewport={'width': 1280, 'height': 800},
        )
        page = await context.new_page()

        print('Opening Telegram Web...')
        frame, frame_el = await open_miniapp(page)

        if not frame:
            send_report('❌ Не удалось открыть мини-апп')
            await browser.close()
            return

        # Step 1: Handle Welcome Screen if present
        img = await save_screenshot(frame_el, page, '01_start')
        check = await ask_gemini_check(img, 'Видна ли кнопка "Start for free →"?')
        print(f'Welcome screen: {check}')
        if check.get('ok'):
            try:
                await frame.click('text=Start for free', timeout=5000)
                await asyncio.sleep(3)
                print('  Clicked Start for free')
            except Exception as e:
                print(f'  Could not click Start for free: {e}')

        await save_screenshot(frame_el, page, '02_after_welcome')

        # Step 2: Send each test message through InputBar
        for i, message in enumerate(TEST_MESSAGES):
            print(f'\n--- Sending: {message[:50]}')
            success = await type_and_send(frame, message)
            img = await save_screenshot(frame_el, page, f'03_msg{i}')

            if success:
                check = await ask_gemini_check(
                    img,
                    f'Была ли успешно обработана запись "{message[:40]}"? Видны ли какие-то изменения в UI или подтверждение?'
                )
                results.append({
                    'message': message[:60],
                    'sent': True,
                    'processed': check.get('ok', False),
                    'details': check.get('details', ''),
                })
                print(f'  Processed: {check.get("ok")} — {check.get("details", "")[:80]}')
            else:
                results.append({
                    'message': message[:60],
                    'sent': False,
                    'processed': False,
                    'details': 'Failed to type/send',
                })

            await asyncio.sleep(2)

        # Step 3: Final screenshot
        await save_screenshot(frame_el, page, '04_final')
        await browser.close()

    # Build report
    sent = sum(1 for r in results if r['sent'])
    processed = sum(1 for r in results if r['processed'])
    total = len(results)
    emoji = '✅' if processed == total else '⚠️'

    report = f'<b>🤖 PetPath UI Test Report</b>\n'
    report += f'<b>{emoji} Отправлено {sent}/{total}, обработано {processed}/{total}</b>\n\n'
    for r in results:
        icon = '✅' if r['processed'] else ('📤' if r['sent'] else '❌')
        report += f'{icon} {r["message"]}\n'
        if r['details']:
            report += f'   └ {r["details"][:100]}\n'

    print('\n' + report)
    send_report(report)


if __name__ == '__main__':
    asyncio.run(main())
