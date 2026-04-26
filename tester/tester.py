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

APP_CONTEXT = """
Ты видишь скриншот мини-приложения PetPath (трекер здоровья питомцев).

Элементы интерфейса:
- Welcome screen: большая кнопка "Start for free →" — только при первом запуске
- Главный экран: карточка питомца сверху (имя, вид "Cat", пол "Male", фото)
- Левый сайдбар: иконки Health, Meds, Vaccines, Allergy, Food, Habits, Docs, Media, Items, Costs
- QuestionPrompt: полоска над полем ввода с вопросом и подписью "tap to answer" — клик вставляет подсказку
- InputBar внизу: textarea с placeholder "Write anything about your pet..." и кнопка отправки (стрелка)
- Кнопка редактирования питомца: иконка карандаша ✏️ в заголовке карточки

Как записать данные: кликнуть в textarea → напечатать текст → нажать кнопку отправки.
CSS selectors: textarea = .input-textarea, кнопка отправки = .send-btn
"""

TEST_SCENARIOS = [
    {
        'name': 'Имя питомца',
        'steps': [
            'Если видишь кнопку "Start for free →" — нажми её. Иначе переходи к следующему шагу.',
            'Кликни на QuestionPrompt (полоска с текстом "What\'s your pet\'s name?" и "tap to answer")',
            'Кликни на textarea (.input-textarea) и напечатай имя питомца',
            'Нажми кнопку отправки (.send-btn) чтобы сохранить имя',
        ],
    },
    {
        'name': 'Записать питание',
        'steps': [
            'Кликни на иконку "Food" в левом сайдбаре',
            'Кликни на textarea (.input-textarea)',
            'Напечатай текст о питании питомца',
            'Нажми кнопку отправки (.send-btn)',
        ],
    },
    {
        'name': 'Записать здоровье',
        'steps': [
            'Кликни на иконку "Health" в левом сайдбаре',
            'Кликни на textarea (.input-textarea)',
            'Напечатай текст о здоровье питомца',
            'Нажми кнопку отправки (.send-btn)',
        ],
    },
    {
        'name': 'Редактировать профиль',
        'steps': [
            'Найди и кликни кнопку с иконкой карандаша ✏️ в карточке питомца',
            'Убедись что открылась форма редактирования с полями',
        ],
    },
]

STEP_TEXTS = {
    'Напечатай текст о питании питомца': 'сухой корм Royal Canin 50г',
    'Напечатай текст о здоровье питомца': 'осмотр у ветеринара, всё в норме',
    'Напечатай имя питомца': 'Барсик',
}


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


async def ask_gemini(img: Image.Image, scenario_name: str, step_hint: str, history: list):
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    img_b64 = base64.b64encode(buf.getvalue()).decode()

    recent = '\n'.join(
        f"  шаг {h['step']}: {h['action']} {h['value']!r} — {h['reasoning']}"
        for h in history[-4:]
    ) or '  (начало)'

    prompt = f"""{APP_CONTEXT}

Сценарий: {scenario_name}
Текущий шаг: {step_hint}
Последние действия:
{recent}

Посмотри на скриншот (это только мини-приложение, без Telegram) и выполни шаг.
Ответь ТОЛЬКО валидным JSON без markdown:
{{
  "action": "click" | "type" | "done" | "fail",
  "selector": "CSS селектор (для click если знаешь точный)",
  "x": 0.5,
  "y": 0.5,
  "text": "реальный текст для печати (только для action=type)",
  "reasoning": "одна строка",
  "status": "ok" | "bug",
  "issue": "описание если bug"
}}

Правила:
- Координаты x/y от 0.0 до 1.0 относительно ЭТОГО скриншота
- action=type: text = реальные слова (напр. "Барсик", "корм 50г"), НЕ placeholder
- done = этот шаг выполнен, переходим к следующему
- fail = элемент не найден после 3 попыток
- Если шаг говорит "Иначе переходи к следующему" и условие не выполнено — сразу done"""

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
            print(f'  Dialog confirmed: {sel}')
            break
        except Exception:
            pass

    await asyncio.sleep(5)

    # Find frame
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

    # Find iframe element for screenshots
    frame_el = None
    for sel in ['iframe[src*="github.io"]', 'iframe[src*="petpath"]', 'iframe']:
        el = await page.query_selector(sel)
        if el:
            frame_el = el
            break

    print(f'  Frame: {"found" if frame else "not found"}')
    print(f'  Frame element: {"found" if frame_el else "not found"}')
    return frame, frame_el


async def execute_action(decision, frame, frame_el, page):
    action = decision['action']

    if action == 'click':
        sel = (decision.get('selector') or '').strip()
        clicked = False

        if sel and frame:
            try:
                await frame.click(sel, timeout=3000)
                clicked = True
            except Exception:
                pass

        if not clicked and frame_el:
            bbox = await frame_el.bounding_box()
            if bbox:
                x = int(bbox['x'] + decision.get('x', 0.5) * bbox['width'])
                y = int(bbox['y'] + decision.get('y', 0.5) * bbox['height'])
                await page.mouse.click(x, y)
                clicked = True

        if not clicked:
            vp = await page.evaluate('() => ({w: window.innerWidth, h: window.innerHeight})')
            await page.mouse.click(
                int(decision.get('x', 0.5) * vp['w']),
                int(decision.get('y', 0.5) * vp['h'])
            )

    elif action == 'type':
        text_to_type = decision.get('text', '')
        if frame:
            try:
                await frame.keyboard.type(text_to_type)
            except Exception:
                await page.keyboard.type(text_to_type)
        else:
            await page.keyboard.type(text_to_type)


async def run_scenario(frame, frame_el, page, scenario):
    name = scenario['name']
    steps = scenario['steps']
    history = []
    step_idx = 0

    print(f'\n=== {name}')

    for global_step in range(len(steps) * 8):
        if step_idx >= len(steps):
            break

        step_hint = steps[step_idx]
        img = await save_screenshot(frame_el, page, f'{name[:12]}_s{global_step}')

        decision = await ask_gemini(img, name, step_hint, history)
        action = decision['action']
        val = decision.get('selector') or decision.get('text', '') or ''
        print(f'  [{global_step}] step{step_idx} {action} {val!r} — {decision["reasoning"]}')

        if decision.get('status') == 'bug':
            print(f'       ⚠ BUG: {decision["issue"]}')

        history.append({'step': global_step, 'action': action, 'value': val, 'reasoning': decision['reasoning']})

        if action == 'done':
            step_idx += 1
            print(f'  → Step {step_idx-1} done, moving to step {step_idx}')
            continue

        if action == 'fail':
            return {'scenario': name, 'status': 'FAIL', 'issue': decision.get('issue', ''), 'steps': global_step}

        await execute_action(decision, frame, frame_el, page)
        await asyncio.sleep(2)

    status = 'PASS' if step_idx >= len(steps) else 'TIMEOUT'
    return {'scenario': name, 'status': status, 'steps': step_idx * 8}


def send_report(text):
    requests.post(
        f'https://api.telegram.org/bot{REPORT_BOT_TOKEN}/sendMessage',
        json={'chat_id': REPORT_CHAT_ID, 'text': text, 'parse_mode': 'HTML'},
    )


async def main():
    storage_state = json.loads(TELEGRAM_WEB_SESSION)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            storage_state=storage_state,
            viewport={'width': 1280, 'height': 800},
        )
        page = await context.new_page()

        print('Opening Telegram Web...')
        frame, frame_el = await open_miniapp(page)

        results = []
        for scenario in TEST_SCENARIOS:
            result = await run_scenario(frame, frame_el, page, scenario)
            results.append(result)
            await asyncio.sleep(3)

        await browser.close()

    passed = sum(1 for r in results if r['status'] == 'PASS')
    total = len(results)
    emoji = '✅' if passed == total else '⚠️'

    report = f'<b>🤖 PetPath UI Test Report</b>\n'
    report += f'<b>{emoji} {passed}/{total} сценариев прошло</b>\n\n'
    for r in results:
        icon = '✅' if r['status'] == 'PASS' else '❌'
        report += f'{icon} {r["scenario"]}\n'
        if r['status'] != 'PASS':
            report += f'   └ {r.get("issue", r["status"])} (шаг {r["steps"]})\n'

    print('\n' + report)
    send_report(report)


if __name__ == '__main__':
    asyncio.run(main())
