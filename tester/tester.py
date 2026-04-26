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

# App structure reference for Gemini:
APP_CONTEXT = """
Приложение PetPath — Telegram Mini App (React), трекер здоровья питомцев.

UI элементы:
- Welcome screen: кнопка "Start for free →" — появляется только при первом запуске
- Главный экран: карточка питомца сверху, слева вертикальный сайдбар с иконками модулей
- Сайдбар: Health, Meds, Vaccines, Allergy, Food, Habits, Docs, Media, Items, Costs
- Карточка питомца: имя, вид, пол, фото. Кнопка редактирования (карандаш ✏️)
- Внизу: полоска QuestionPrompt с вопросом и текстом "tap to answer" — клик по ней вставляет подсказку в поле ввода
- Самый низ: InputBar — textarea с placeholder "Write anything about your pet...", кнопка отправки (стрелка →)
- Чтобы записать данные: кликнуть в textarea (.input-textarea), написать текст, нажать Send (.send-btn)
- Записи появляются в модуле после отправки текста через InputBar
- Имя питомца задаётся через InputBar (написать "My pet's name is Barсик" или через вопрос в QuestionPrompt)
"""

TEST_SCENARIOS = [
    {
        'name': 'Онбординг и имя питомца',
        'steps': [
            'Если видишь Welcome screen — нажми "Start for free →"',
            'Кликни на QuestionPrompt (полоска внизу с вопросом про имя, "tap to answer")',
            'Напечатай в поле ввода (.input-textarea) текст "Барсик" и отправь кнопкой Send',
            'Убедись что имя питомца обновилось в карточке',
        ],
    },
    {
        'name': 'Записать приём пищи',
        'steps': [
            'Кликни на иконку "Food" в левом сайдбаре',
            'Кликни в поле ввода (.input-textarea)',
            'Напечатай "сухой корм Royal Canin 50г" и отправь',
            'Убедись что запись появилась',
        ],
    },
    {
        'name': 'Записать здоровье',
        'steps': [
            'Кликни на иконку "Health" в левом сайдбаре',
            'Кликни в поле ввода (.input-textarea)',
            'Напечатай "осмотр у ветеринара, всё в норме" и отправь',
            'Убедись что запись появилась',
        ],
    },
    {
        'name': 'Профиль питомца',
        'steps': [
            'Кликни на кнопку редактирования ✏️ в карточке питомца',
            'Проверь что открылась форма редактирования',
            'Убедись что поля заполнены и форма работает',
        ],
    },
]


async def save_screenshot(target, label=''):
    global _counter
    _counter += 1
    path = SCREENSHOTS_DIR / f'{_counter:03d}_{label[:30]}.png'
    data = await target.screenshot()
    path.write_bytes(data)
    return Image.open(io.BytesIO(data))


async def ask_gemini(img: Image.Image, scenario_name: str, step_hint: str, history: list):
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    img_b64 = base64.b64encode(buf.getvalue()).decode()

    recent = '\n'.join(
        f"  шаг {h['step']}: {h['action']} — {h['value']!r} ({h['reasoning']})"
        for h in history[-4:]
    ) or '  (начало)'

    prompt = f"""{APP_CONTEXT}

Сценарий: {scenario_name}
Текущая задача: {step_hint}
Последние действия:
{recent}

Посмотри на скриншот и выполни следующее действие.
Ответь ТОЛЬКО валидным JSON (без markdown):
{{
  "action": "click" | "type" | "done" | "fail",
  "selector": "CSS селектор элемента для клика (только для action=click)",
  "x": 0.5,
  "y": 0.5,
  "text": "текст который нужно НАПЕЧАТАТЬ (только для action=type, пиши реальные слова)",
  "reasoning": "одна строка что делаешь",
  "status": "ok" | "bug",
  "issue": "описание бага если есть"
}}

Правила:
- action=type: поле text = реальный текст для печати (напр. "Барсик", "корм Royal Canin 50г")
- action=click: используй selector если знаешь CSS, иначе x/y координаты (0.0–1.0)
- done = задача выполнена успешно
- fail = элемент не найден или застрял 3+ шага
- Все элементы приложения находятся внутри iframe (правая половина экрана)
- textarea для ввода: selector=".input-textarea"
- кнопка отправки: selector=".send-btn--active"
- Перед вводом текста сначала кликни на textarea"""

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
    """Navigate to bot and open the mini app."""
    await page.goto(f'https://web.telegram.org/k/#@{BOT_USERNAME}')
    await asyncio.sleep(8)
    await save_screenshot(page, '00_loaded')

    # Click the blue WebApp button (left of emoji, coordinates from observed screenshots)
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

    # Confirm "LAUNCH" dialog
    for sel in ['button >> text=LAUNCH', 'button >> text=Launch', 'button >> text=Открыть', '.popup-button.btn.primary']:
        try:
            await page.click(sel, timeout=3000)
            print(f'  Confirmed dialog: {sel}')
            break
        except Exception:
            pass

    await asyncio.sleep(5)
    await save_screenshot(page, '01_after_launch')

    # Find mini app iframe
    for frame in page.frames:
        if frame.url and 'telegram' not in frame.url and 'github.io' in frame.url:
            print(f'  Frame found: {frame.url[:80]}')
            return frame

    # Fallback: any non-telegram http frame
    for frame in page.frames:
        if frame.url and 'telegram' not in frame.url and frame.url.startswith('http'):
            print(f'  Frame found (fallback): {frame.url[:80]}')
            return frame

    print('  No frame found')
    return None


async def execute_action(decision, frame, page):
    """Execute click or type action, preferring frame over page."""
    action = decision['action']
    target = frame or page

    if action == 'click':
        sel = (decision.get('selector') or '').strip()
        clicked = False
        if sel:
            try:
                await target.click(sel, timeout=3000)
                clicked = True
            except Exception:
                pass
        if not clicked:
            # Use coordinates relative to the full page viewport
            vp = await page.evaluate('() => ({w: window.innerWidth, h: window.innerHeight})')
            x = int(decision.get('x', 0.5) * vp['w'])
            y = int(decision.get('y', 0.5) * vp['h'])
            await page.mouse.click(x, y)

    elif action == 'type':
        text_to_type = decision.get('text', '')
        try:
            await target.keyboard.type(text_to_type)
        except Exception:
            await page.keyboard.type(text_to_type)


async def run_scenario(frame, page, scenario):
    name = scenario['name']
    steps = scenario['steps']
    history = []
    step_idx = 0
    max_steps_per_hint = 6

    print(f'\n=== {name}')

    for global_step in range(len(steps) * max_steps_per_hint):
        if step_idx >= len(steps):
            break

        step_hint = steps[step_idx]
        img = await save_screenshot(page, f'{name[:15]}_s{global_step}')

        decision = await ask_gemini(img, name, step_hint, history)
        action = decision['action']
        val = decision.get('selector') or decision.get('text', '') or ''
        print(f'  [{global_step}] {action} {val!r} — {decision["reasoning"]}')

        if decision.get('status') == 'bug':
            print(f'       ⚠ BUG: {decision["issue"]}')

        history.append({
            'step': global_step,
            'action': action,
            'value': val,
            'reasoning': decision['reasoning'],
        })

        if action == 'done':
            step_idx += 1
            if step_idx >= len(steps):
                return {'scenario': name, 'status': 'PASS', 'steps': global_step}
            continue

        if action == 'fail':
            return {'scenario': name, 'status': 'FAIL',
                    'issue': decision.get('issue', ''), 'steps': global_step}

        await execute_action(decision, frame, page)
        await asyncio.sleep(2)

    return {'scenario': name, 'status': 'PASS' if step_idx >= len(steps) else 'TIMEOUT',
            'steps': len(steps) * max_steps_per_hint}


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
        frame = await open_miniapp(page)
        print(f'Mini app frame: {"found" if frame else "not found — using page"}')

        # Clear localStorage in frame so we always start fresh
        if frame:
            try:
                await frame.evaluate("localStorage.removeItem('_welcomed')")
                await asyncio.sleep(1)
                await page.reload()
                await asyncio.sleep(6)
                # Re-find frame after reload
                for f in page.frames:
                    if f.url and 'github.io' in f.url:
                        frame = f
                        break
            except Exception:
                pass

        results = []
        for scenario in TEST_SCENARIOS:
            result = await run_scenario(frame, page, scenario)
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
