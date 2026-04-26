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

TELEGRAM_WEB_SESSION_B64 = os.environ['TELEGRAM_WEB_SESSION']
BOT_USERNAME = 'petpath_app_bot'
REPORT_BOT_TOKEN = os.environ['REPORT_BOT_TOKEN']
REPORT_CHAT_ID = os.environ['REPORT_CHAT_ID']
GEMINI_API_KEY = os.environ['GEMINI_API_KEY']

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

SCREENSHOTS_DIR = Path('tester/screenshots')
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
screenshot_counter = 0

TEST_SCENARIOS = [
    "Открыть мини-апп и пройти онбординг — добавить питомца с именем Тест",
    "Записать приём пищи питомца",
    "Посмотреть историю питания",
    "Проверить настройки и профиль питомца",
]


async def save_screenshot(page, label=''):
    global screenshot_counter
    screenshot_counter += 1
    path = SCREENSHOTS_DIR / f'{screenshot_counter:03d}_{label}.png'
    data = await page.screenshot()
    path.write_bytes(data)
    img = Image.open(io.BytesIO(data))
    return img, data


async def ask_gemini(img: Image.Image, scenario: str, step: int, history: list):
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    img_b64 = base64.b64encode(buf.getvalue()).decode()

    recent = "\n".join(
        f"  шаг {h['step']}: {h['action']} '{h.get('value','')}' — {h['reasoning']}"
        for h in history[-5:]
    ) or "  (начало)"

    prompt = f"""Ты QA-тестировщик мини-приложения PetPath (трекер питания домашних животных).
Текущий сценарий: {scenario}
Шаг: {step}
Последние действия:
{recent}

Посмотри на скриншот и реши что делать дальше.
Ответь ТОЛЬКО валидным JSON без markdown-блоков:
{{
  "action": "click" | "type" | "done" | "fail",
  "selector": "CSS или текст элемента (для click, предпочти это)",
  "x": 0.5,
  "y": 0.5,
  "text": "текст для ввода (для type)",
  "reasoning": "одна строка",
  "status": "ok" | "bug",
  "issue": "описание если bug"
}}

Правила:
- done = сценарий завершён успешно
- fail = сломано или завис на 3+ шага
- selector важнее координат; координаты 0.0–1.0 от размера экрана
- не повторяй одно действие два раза подряд"""

    resp = model.generate_content([
        prompt,
        {'mime_type': 'image/png', 'data': img_b64}
    ])

    text = resp.text.strip()
    if '```' in text:
        parts = text.split('```')
        text = parts[1] if len(parts) > 1 else parts[0]
        if text.startswith('json'):
            text = text[4:]
    return json.loads(text.strip())


async def open_miniapp(page):
    """Navigate to bot chat and open the Mini App."""
    await page.goto(f'https://web.telegram.org/k/#@{BOT_USERNAME}')
    await asyncio.sleep(8)
    await save_screenshot(page, 'after_navigate')

    # Click the blue WebApp launch button (square icon left of emoji button)
    # Try selectors first, then fall back to coordinates
    opened = False
    selectors = [
        '.bot-menu-button',
        'button.bot-menu',
        '[class*="bot-menu"]',
        '.btn-icon.tgico-botmenu',
    ]
    for sel in selectors:
        try:
            await page.click(sel, timeout=2000)
            print(f"  Нажал по селектору: {sel}")
            opened = True
            break
        except Exception:
            pass

    if not opened:
        # Coordinates of the blue square button based on observed screenshots (1280x800)
        await page.mouse.click(622, 752)
        print("  Нажал по координатам (622, 752)")

    await asyncio.sleep(3)
    await save_screenshot(page, 'after_webapp_click')

    # Confirm "Open" dialog if it appears
    confirm_selectors = [
        'button.popup-button >> text=Open',
        'button >> text=Open',
        'button >> text=Открыть',
        '.popup-button.btn.primary',
        'button.confirm-dialog-button',
    ]
    for sel in confirm_selectors:
        try:
            await page.click(sel, timeout=3000)
            print(f"  Подтвердил диалог: {sel}")
            break
        except Exception:
            pass

    await asyncio.sleep(4)
    await save_screenshot(page, 'after_confirm')

    # Search for mini app iframe
    for frame in page.frames:
        if frame.url and 'telegram' not in frame.url and frame.url.startswith('http'):
            print(f"  Найден frame: {frame.url}")
            return frame

    print("  Iframe не найден — Gemini будет работать с основной страницей")
    return None


async def run_scenario(page, frame_or_none, scenario_name):
    target = frame_or_none or page
    history = []

    print(f"\n--- {scenario_name}")

    for step in range(30):
        img, _ = await save_screenshot(page, f'scenario_{scenario_name[:20]}_step{step}')

        decision = await ask_gemini(img, scenario_name, step, history)
        action = decision['action']
        print(f"  [{step}] {action} '{decision.get('selector') or decision.get('text','')}' — {decision['reasoning']}")

        if decision.get('status') == 'bug':
            print(f"       BUG: {decision['issue']}")

        history.append({
            'step': step,
            'action': action,
            'value': decision.get('selector') or decision.get('text', ''),
            'reasoning': decision['reasoning'],
        })

        if action == 'done':
            return {'scenario': scenario_name, 'status': 'PASS', 'steps': step}

        if action == 'fail':
            return {'scenario': scenario_name, 'status': 'FAIL',
                    'issue': decision.get('issue', ''), 'steps': step}

        if action == 'click':
            sel = decision.get('selector', '').strip()
            clicked = False
            if sel:
                try:
                    await page.click(sel, timeout=3000)
                    clicked = True
                except Exception:
                    pass
            if not clicked:
                vp = await page.evaluate('() => ({w: window.innerWidth, h: window.innerHeight})')
                x = int(decision.get('x', 0.5) * vp['w'])
                y = int(decision.get('y', 0.5) * vp['h'])
                await page.mouse.click(x, y)

        elif action == 'type':
            await page.keyboard.type(decision.get('text', ''))

        await asyncio.sleep(2)

    return {'scenario': scenario_name, 'status': 'TIMEOUT', 'steps': 30}


def send_report(text):
    requests.post(
        f'https://api.telegram.org/bot{REPORT_BOT_TOKEN}/sendMessage',
        json={'chat_id': REPORT_CHAT_ID, 'text': text, 'parse_mode': 'HTML'}
    )


async def main():
    storage_state = json.loads(TELEGRAM_WEB_SESSION_B64)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            storage_state=storage_state,
            viewport={'width': 1280, 'height': 800}
        )
        page = await context.new_page()

        print("Открываем Telegram Web...")
        await save_screenshot(page, '00_start')

        mini_frame = await open_miniapp(page)
        print(f"Мини-апп frame: {mini_frame.url if mini_frame else 'не найден'}")

        results = []
        for scenario in TEST_SCENARIOS:
            result = await run_scenario(page, mini_frame, scenario)
            results.append(result)
            await asyncio.sleep(4)

        await browser.close()

    passed = sum(1 for r in results if r['status'] == 'PASS')
    total = len(results)
    emoji = '✅' if passed == total else '⚠️'

    report = f"<b>🤖 PetPath UI Test Report</b>\n"
    report += f"<b>{emoji} {passed}/{total} сценариев прошло</b>\n\n"
    for r in results:
        icon = '✅' if r['status'] == 'PASS' else '❌'
        report += f"{icon} {r['scenario'][:60]}\n"
        if r['status'] != 'PASS':
            report += f"   └ {r.get('issue', r['status'])} (шаг {r['steps']})\n"

    print('\n' + report)
    send_report(report)


if __name__ == '__main__':
    asyncio.run(main())
