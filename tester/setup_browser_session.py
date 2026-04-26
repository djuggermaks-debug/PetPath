import asyncio
import json
import base64
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
        storage_b64 = base64.b64encode(json.dumps(storage).encode()).decode()

        print("\n✅ Твой TELEGRAM_WEB_SESSION (сохрани как GitHub Secret):")
        print(storage_b64)

        await browser.close()

asyncio.run(main())
