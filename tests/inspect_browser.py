from pathlib import Path
from playwright.sync_api import sync_playwright
import sys
sys.stdout.reconfigure(encoding="utf-8")

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page(viewport={"width": 1536, "height": 1000})
    page.on("pageerror", lambda error: print("JS ERROR:", error))
    page.on("console", lambda msg: print("CONSOLE:", msg.type, msg.text[:500]) if msg.type == "error" else None)
    page.on("response", lambda response: print("HTTP:", response.status, response.url) if response.status >= 400 else None)
    page.goto("http://127.0.0.1:8501")
    frame = page.frame_locator("iframe")
    try:
        frame.locator(".app-shell").wait_for(timeout=40000)
    except Exception as error:
        print("WAIT:", str(error)[:300])
    print("IFRAME", page.locator("iframe").get_attribute("title"))
    print("FRAME TEXT", frame.locator("body").inner_text()[:2500])
    print("SIZES", page.locator("iframe").bounding_box())
    page.screenshot(path="artifacts/browser-inspect.png", full_page=True)
    page.set_viewport_size({"width": 390, "height": 844})
    frame.locator("#mobile-nav").click()
    frame.locator('aside [data-nav="predict"]').click()
    assert page.frames[1].evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
    assert frame.locator(".sidebar").evaluate("el => getComputedStyle(el).boxShadow") == "none"
    page.screenshot(path="artifacts/mobile-browser.png")
    print("FINAL MOBILE: no overflow or offscreen sidebar shadow")
    browser.close()
