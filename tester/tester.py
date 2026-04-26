import asyncio
import os
import json
import base64
import io
import requests
import google.generativeai as genai
from playwright.async_api import async_playwright
from PIL import Image

TELEGRAM_WEB_SESSION_B64 = os.environ['TELEGRAM_WEB_SESSION']
BOT_USERNAME = 'petpath_app_bot'
REPORT_BOT_TOKEN = os.environ['REPORT_BOT_TOKEN']
REPORT_CHAT_ID = os.environ['REPORT_CHAT_ID']
GEMINI_API_KEY = os.environ['GEMINI_API_KEY']

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

TEST_SCENARIOS = [
    "Открыть мини-апп и пройти онбординг — добавить питомца с именем Тест",
    "Записать приём пищи питомца",
    "Посмотреть историю питания",
    "Проверить настройки и профиль питомца",
]


async def screenshot_as_pil(target):
    data = await target.screenshot()
    return Image.open(io.BytesIO(data)), data


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
    """Go to bot chat and click open mini app."""
    await page.goto(f'https://web.telegram.org/k/#@{BOT_USERNAME}')
    await asyncio.sleep(6)

    # Try clicking bot menu button (the coloured button next to input)
    for selector in [
        '.bot-menu-button',
        'button[class*="bot-menu"]',
        '.btn-menu-toggle',
    ]:
        try:
            await page.click(selector, timeout=3000)
            await asyncio.sleep(2)
            break
        except Exception:
            pass

    # Find mini app iframe
    await asyncio.sleep(3)
    for frame in page.frames:
        if frame.url and 'telegram' not in frame.url and frame.url.startswith('http'):
            return frame
    return None


async def run_scenario(page, frame_or_none, scenario):
    target = frame_or_none or page
    history = []
    last_screenshots = []

    print(f"\n--- {scenario}")

    for step in range(30):
        img, raw = await screenshot_as_pil(target if frame_or_none else page)
        last_screenshots.append(raw)
        if len(last_screenshots) > 5:
            last_screenshots.pop(0)

        decision = await ask_gemini(img, scenario, step, history)
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
            return {'scenario': scenario, 'status': 'PASS', 'steps': step}

        if action == 'fail':
            return {'scenario': scenario, 'status': 'FAIL',
                    'issue': decision.get('issue', ''), 'steps': step}

        if action == 'click':
            sel = decision.get('selector', '').strip()
            clicked = False
            if sel:
                try:
                    await target.click(sel, timeout=3000)
                    clicked = True
                except Exception:
                    pass
            if not clicked:
                vp = await page.evaluate('() => ({w: window.innerWidth, h: window.innerHeight})')
                x = int(decision.get('x', 0.5) * vp['w'])
                y = int(decision.get('y', 0.5) * vp['h'])
                await page.mouse.click(x, y)

        elif action == 'type':
            await target.keyboard.type(decision.get('text', ''))

        await asyncio.sleep(2)

    return {'scenario': scenario, 'status': 'TIMEOUT', 'steps': 30}


def send_report(text):
    requests.post(
        f'https://api.telegram.org/bot{REPORT_BOT_TOKEN}/sendMessage',
        json={'chat_id': REPORT_CHAT_ID, 'text': text, 'parse_mode': 'HTML'}
    )


async def main():
    padded = TELEGRAM_WEB_SESSION_B64 + '=' * (-len(TELEGRAM_WEB_SESSION_B64) % 4)
    storage_state = json.loads(base64.b64decode(padded).decode())

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            storage_state=storage_state,
            viewport={'width': 1280, 'height': 800}
        )
        page = await context.new_page()

        print("Открываем Telegram Web...")
        mini_frame = await open_miniapp(page)
        print(f"Мини-апп frame: {mini_frame.url if mini_frame else 'не найден, используем page'}")

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
