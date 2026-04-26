# Запусти этот скрипт ОДИН РАЗ локально чтобы получить TELEGRAM_SESSION
# После получения строки — сохрани её как GitHub Secret

import asyncio
from telethon import TelegramClient
from telethon.sessions import StringSession

API_ID = input("Введи api_id: ").strip()
API_HASH = input("Введи api_hash: ").strip()

async def main():
    client = TelegramClient(StringSession(), int(API_ID), API_HASH)
    await client.start()
    session_string = client.session.save()
    print("\n✅ Твой TELEGRAM_SESSION (сохрани как GitHub Secret):")
    print(session_string)
    await client.disconnect()

asyncio.run(main())
