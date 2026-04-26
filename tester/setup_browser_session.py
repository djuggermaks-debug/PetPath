import asyncio
import json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        await page.goto('https://web.telegram.org/k/')

        print("Открылся браузер — войди в Telegram Web со второго аккаунта.")
        print("Введи номер телефона, получи код, войди.")
        print("\nКогда увидишь свои чаты — нажми Enter здесь...")
        input()

        storage = await context.storage_state()
        storage_json = json.dumps(storage)

        print("\n✅ Твой TELEGRAM_WEB_SESSION (сохрани как GitHub Secret):")
        print(storage_json)

        await browser.close()

asyncio.run(main())
