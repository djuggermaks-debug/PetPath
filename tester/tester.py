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


def send_report(text: str):
    url = f'https://api.telegram.org/bot{REPORT_BOT_TOKEN}/sendMessage'
    resp = requests.post(url, data={'chat_id': REPORT_CHAT_ID, 'text': text, 'parse_mode': 'HTML'})
    print(f'  Telegram report: {resp.status_code} {resp.text[:200]}')


# (message, tab_to_check, check_question)
TEST_CASES = [
    (
        "My pet's name is Барсик",
        None,
        'Отображается ли имя питомца "Барсик" в интерфейсе?',
    ),
    (
        'Today ate Royal Canin dry food 50g in the morning',
        'Nutrition',
        'Видна ли запись о питании с Royal Canin или 50g во вкладке Nutrition?',
    ),
    (
        'Vet checkup today, weight 4.2kg, all normal',
        'Health',
        'Видна ли запись о визите к ветеринару или вес 4.2 во вкладке Health?',
    ),
    (
        'Rabies vaccine done today',
        'Vaccines',
        'Видна ли запись о прививке от бешенства во вкладке Vaccines?',
    ),
    (
        'фывафыва 123 !!!',
        None,
        'Приложение работает нормально (не белый экран, не заморожено)? Есть ли какой-то ответ на бессмысленный ввод?',
    ),
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
    try:
        await frame.click('.input-textarea', timeout=5000)
        await asyncio.sleep(0.5)
        await frame.fill('.input-textarea', text)
        await asyncio.sleep(0.5)
        await frame.click('.send-btn', timeout=5000)
        await asyncio.sleep(4)
        return True
    except Exception as e:
        print(f'  type_and_send failed: {e}')
        return False


async def open_tab(frame, tab_name: str) -> bool:
    """Click a side tab by its label text."""
    try:
        await frame.click(f'.side-tab:has-text("{tab_name}")', timeout=4000)
        await asyncio.sleep(2)
        return True
    except Exception:
        # fallback: try partial match via evaluate
        try:
            await frame.evaluate(f"""
                Array.from(document.querySelectorAll('.side-tab-label'))
                    .find(el => el.textContent.includes('{tab_name}'))
                    ?.closest('.side-tab')?.click()
            """)
            await asyncio.sleep(2)
            return True
        except Exception as e:
            print(f'  open_tab({tab_name}) failed: {e}')
            return False


async def go_back_to_chat(frame):
    """Return to main chat view."""
    try:
        await frame.click('.side-tab--active', timeout=3000)
        await asyncio.sleep(1)
    except Exception:
        pass


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

        # Welcome screen
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

        # Run test cases
        for i, (message, tab, verify_question) in enumerate(TEST_CASES):
            print(f'\n--- [{i+1}/{len(TEST_CASES)}] Sending: {message[:50]}')
            success = await type_and_send(frame, message)
            img_after_send = await save_screenshot(frame_el, page, f'03_send_{i}')

            sent_ok = False
            tab_ok = None
            details_send = ''
            details_tab = ''

            if success:
                send_check = await ask_gemini_check(
                    img_after_send,
                    f'Была ли успешно обработана запись "{message[:40]}"? Видно ли подтверждение сохранения?'
                )
                sent_ok = send_check.get('ok', False)
                details_send = send_check.get('details', '')
                print(f'  Sent: {sent_ok} — {details_send[:80]}')

                # Check tab if specified
                if tab:
                    tab_opened = await open_tab(frame, tab)
                    if tab_opened:
                        img_tab = await save_screenshot(frame_el, page, f'04_tab_{tab}_{i}')
                        tab_check = await ask_gemini_check(img_tab, verify_question)
                        tab_ok = tab_check.get('ok', False)
                        details_tab = tab_check.get('details', '')
                        print(f'  Tab {tab}: {tab_ok} — {details_tab[:80]}')
                        # Go back to chat
                        await go_back_to_chat(frame)
                        await asyncio.sleep(1)
                    else:
                        tab_ok = False
                        details_tab = f'Не удалось открыть вкладку {tab}'
            else:
                details_send = 'Failed to type/send'

            results.append({
                'message': message[:60],
                'sent': success,
                'processed': sent_ok,
                'tab': tab,
                'tab_ok': tab_ok,
                'details_send': details_send,
                'details_tab': details_tab,
            })

            await asyncio.sleep(2)

        await save_screenshot(frame_el, page, '05_final')
        await browser.close()

    # Build report
    total = len(results)
    processed = sum(1 for r in results if r['processed'])
    tabs_checked = [r for r in results if r['tab'] is not None]
    tabs_ok = sum(1 for r in tabs_checked if r['tab_ok'])
    all_ok = processed == total and tabs_ok == len(tabs_checked)
    emoji = '✅' if all_ok else '⚠️'

    report = f'<b>🤖 PetPath UI Test Report</b>\n'
    report += f'<b>{emoji} Записи: {processed}/{total} | Вкладки: {tabs_ok}/{len(tabs_checked)}</b>\n\n'

    for r in results:
        icon = '✅' if r['processed'] else ('📤' if r['sent'] else '❌')
        report += f'{icon} {r["message"]}\n'
        if r['details_send']:
            report += f'   └ {r["details_send"][:100]}\n'
        if r['tab'] is not None:
            tab_icon = '✅' if r['tab_ok'] else '❌'
            report += f'   {tab_icon} Вкладка {r["tab"]}: {r["details_tab"][:100]}\n'

    print('\n' + report)
    send_report(report)


if __name__ == '__main__':
    asyncio.run(main())
