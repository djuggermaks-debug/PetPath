import asyncio
import os
import json
import requests
import google.generativeai as genai
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.tl.types import ReplyInlineMarkup, ReplyKeyboardMarkup

API_ID = int(os.environ['TELEGRAM_API_ID'])
API_HASH = os.environ['TELEGRAM_API_HASH']
SESSION_STRING = os.environ['TELEGRAM_SESSION']
BOT_USERNAME = 'petpath_app_bot'
REPORT_BOT_TOKEN = os.environ['REPORT_BOT_TOKEN']
REPORT_CHAT_ID = os.environ['REPORT_CHAT_ID']
GEMINI_API_KEY = os.environ['GEMINI_API_KEY']

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

TEST_SCENARIOS = [
    "Запустить бота /start и пройти онбординг — добавить питомца",
    "Записать приём пищи питомца",
    "Посмотреть историю питания",
    "Проверить настройки профиля питомца",
]


def extract_buttons(message):
    buttons = []
    if not message.reply_markup:
        return buttons
    if isinstance(message.reply_markup, ReplyInlineMarkup):
        for row in message.reply_markup.rows:
            for btn in row.buttons:
                buttons.append({'text': btn.text, 'type': 'inline'})
    elif isinstance(message.reply_markup, ReplyKeyboardMarkup):
        for row in message.reply_markup.rows:
            for btn in row.buttons:
                buttons.append({'text': btn.text, 'type': 'keyboard'})
    return buttons


async def click_button_by_text(message, text):
    if not message.reply_markup:
        return False
    if isinstance(message.reply_markup, ReplyInlineMarkup):
        for row in message.reply_markup.rows:
            for btn in row.buttons:
                if btn.text == text:
                    await message.click(text=text)
                    return True
    return False


async def ask_gemini(log, buttons, scenario):
    prompt = f"""Ты QA-тестировщик Telegram бота PetPath (трекер питания домашних животных).
Сценарий: {scenario}

История диалога с ботом:
{json.dumps(log, ensure_ascii=False, indent=2)}

Доступные кнопки: {[b['text'] for b in buttons]}

Реши что делать дальше. Ответь ТОЛЬКО валидным JSON без markdown:
{{
  "action": "click_button" | "send_text" | "done" | "fail",
  "value": "текст кнопки или сообщения (пусто если done/fail)",
  "reasoning": "короткое объяснение",
  "status": "ok" | "bug",
  "issue": "описание бага если status=bug, иначе пусто"
}}

Правила:
- done = сценарий успешно завершён
- fail = бот не отвечает или поведение сломано
- bug = что-то работает неправильно но можно продолжить
- Не нажимай одну кнопку дважды подряд
- Если застрял больше 3 шагов — action: fail"""

    response = model.generate_content(prompt)
    text = response.text.strip()
    if '```' in text:
        text = text.split('```')[1]
        if text.startswith('json'):
            text = text[4:]
        text = text.split('```')[0].strip()
    return json.loads(text)


def send_report(text):
    url = f"https://api.telegram.org/bot{REPORT_BOT_TOKEN}/sendMessage"
    requests.post(url, json={
        'chat_id': REPORT_CHAT_ID,
        'text': text,
        'parse_mode': 'HTML'
    })


async def run_scenario(client, bot, scenario):
    log = []
    print(f"\n--- Сценарий: {scenario}")

    await client.send_message(bot, '/start')
    await asyncio.sleep(4)

    for step in range(20):
        messages = await client.get_messages(bot, limit=3)
        if not messages:
            return {'scenario': scenario, 'status': 'FAIL', 'issue': 'Бот не отвечает', 'steps': step}

        last = messages[0]
        buttons = extract_buttons(last)
        msg_text = last.text or last.message or ''

        log.append({
            'step': step,
            'bot': msg_text[:300],
            'buttons': [b['text'] for b in buttons]
        })

        decision = await ask_gemini(log, buttons, scenario)
        print(f"  [{step}] {decision['action']} '{decision.get('value', '')}' — {decision['reasoning']}")

        if decision['status'] == 'bug':
            print(f"  BUG: {decision['issue']}")

        if decision['action'] == 'done':
            return {'scenario': scenario, 'status': 'PASS', 'steps': step}

        if decision['action'] == 'fail':
            return {'scenario': scenario, 'status': 'FAIL', 'issue': decision.get('issue', ''), 'steps': step}

        if decision['action'] == 'click_button':
            clicked = await click_button_by_text(last, decision['value'])
            if not clicked:
                await client.send_message(bot, decision['value'])
        elif decision['action'] == 'send_text':
            await client.send_message(bot, decision['value'])

        await asyncio.sleep(3)

    return {'scenario': scenario, 'status': 'TIMEOUT', 'steps': 20}


async def main():
    client = TelegramClient(StringSession(SESSION_STRING), API_ID, API_HASH)
    await client.start()

    bot = await client.get_entity(BOT_USERNAME)
    results = []

    for scenario in TEST_SCENARIOS:
        result = await run_scenario(client, bot, scenario)
        results.append(result)
        await asyncio.sleep(5)

    await client.disconnect()

    passed = sum(1 for r in results if r['status'] == 'PASS')
    total = len(results)

    report = f"<b>🤖 PetPath Test Report</b>\n"
    report += f"<b>{'✅ Все тесты прошли!' if passed == total else f'⚠️ {passed}/{total} прошло'}</b>\n\n"

    for r in results:
        icon = "✅" if r['status'] == 'PASS' else "❌"
        report += f"{icon} {r['scenario'][:60]}\n"
        if r['status'] != 'PASS':
            report += f"   └ {r.get('issue', r['status'])} (шаг {r['steps']})\n"

    print("\n" + report)
    send_report(report)


if __name__ == '__main__':
    asyncio.run(main())
