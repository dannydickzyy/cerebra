"""Real-browser integration checks against an isolated SQLite test workspace.

Run with: python tests/browser_smoke.py
Requires Playwright and installed Microsoft Edge; no browser download is needed.
"""
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request
import uuid

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.stdout.reconfigure(encoding="utf-8")
from cerebra.database import list_screenings

OUT = ROOT / "artifacts" / "browser-tests"
OUT.mkdir(exist_ok=True)
DB = OUT / f"screenings-{uuid.uuid4().hex[:8]}.sqlite3"
env = {**os.environ, "CEREBRA_DB_PATH": str(DB), "PYTHONIOENCODING": "utf-8"}
log = (OUT / "server.log").open("w", encoding="utf-8")


def start():
    server = subprocess.Popen([sys.executable, "-m", "streamlit", "run", "app.py", "--server.port=8502"],
        cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
    for _ in range(100):
        if server.poll() is not None:
            raise RuntimeError("Test server exited; see artifacts/browser-tests/server.log")
        try:
            with urllib.request.urlopen("http://127.0.0.1:8502/_stcore/health", timeout=1) as response:
                if response.status == 200:
                    return server
        except OSError:
            time.sleep(.3)
    raise RuntimeError("Test server did not start")


server = start()
errors = []
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        page = browser.new_page(viewport={"width": 1536, "height": 1000}, device_scale_factor=1)
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto("http://127.0.0.1:8502")
        frame = page.frame_locator("iframe")
        expect(frame.locator(".app-shell")).to_be_visible(timeout=45000)
        expect(frame.locator("#throughput .main-svg").first).to_be_visible(timeout=15000)
        page.screenshot(path=str(OUT / "dashboard-light.png"))
        print("PASS dashboard and actual dataset metrics")

        frame.locator("#theme-toggle").click()
        expect(frame.locator("body")).to_have_class("dark")
        page.screenshot(path=str(OUT / "dashboard-dark.png"))
        frame.locator("#theme-toggle").click()
        frame.locator('aside [data-nav="patients"]').click()
        expect(frame.get_by_text("Your screening history starts here")).to_be_visible()
        frame.locator('aside [data-nav="breakdown"]').click()
        expect(frame.get_by_text("No saved screenings yet")).to_be_visible()
        frame.locator('aside [data-nav="population"]').click()
        expect(frame.get_by_text("No population records yet")).to_be_visible()
        print("PASS empty states")

        frame.locator('aside [data-nav="predict"]').click()
        form = frame.locator("#prediction-form")
        form.locator('button[type="submit"]').click()
        expect(frame.locator("#save-screening")).to_have_count(0)
        # Decimal age, all ten predictors, literal HTML in a name, and an apostrophe in a site.
        for key, value in {"name": "=Demo <b>Research</b>", "age": "67.5", "avg_glucose_level": "198",
                           "bmi": "31.4", "site": "Researcher's clinic"}.items():
            form.locator(f"#{key}").fill(value)
        for key, value in {"gender": "Female", "smoking_status": "formerly smoked",
                           "work_type": "Private", "Residence_type": "Urban"}.items():
            form.locator(f"#{key}").select_option(value)
        for key in ["hypertension", "heart_disease", "married"]:
            form.locator(f'input[name="{key}"][value="1"]').check(force=True)
        form.locator('button[type="submit"]').click()
        expect(frame.locator("#save-screening")).to_be_visible(timeout=45000)
        expect(frame.locator(".result-name")).to_have_text("=Demo <b>Research</b>")
        expect(frame.locator(".result-name b")).to_have_count(0)
        page.screenshot(path=str(OUT / "prediction.png"))
        frame.locator("#save-screening").click()
        expect(frame.locator("#save-screening")).to_contain_text("Saved as", timeout=20000)
        assert len(list_screenings(DB)) == 1
        print("PASS prediction, literal text rendering, and SQLite save")

        # Editing the input must invalidate the previous result and prevent a stale save.
        form.locator("#age").fill("58.2")
        expect(frame.locator("#save-screening")).to_have_count(0)
        form.locator("#name").fill("Missing BMI participant")
        form.locator("#bmi_missing").check()
        expect(form.locator("#bmi")).to_be_disabled()
        form.locator('button[type="submit"]').click()
        expect(frame.locator("#save-screening")).to_be_visible(timeout=45000)
        frame.locator("#save-screening").click()
        expect(frame.locator("#save-screening")).to_contain_text("Saved as", timeout=20000)
        records = list_screenings(DB)
        assert len(records) == 2 and any(r["profile"]["bmi"] is None for r in records)
        print("PASS missing-BMI inference and stale-result invalidation")

        frame.locator('aside [data-nav="patients"]').click()
        expect(frame.locator("#record-count")).to_have_text("2 records")
        frame.locator("#patient-search").fill("=Demo")
        expect(frame.locator("tbody tr")).to_have_count(1)
        with page.expect_download() as info:
            frame.locator("#export-csv").click()
        downloaded = info.value
        downloaded.save_as(str(OUT / "screenings.csv"))
        assert "'=Demo <b>Research</b>" in (OUT / "screenings.csv").read_text(encoding="utf-8-sig")
        frame.locator("#patient-search").fill("no-such-person")
        expect(frame.get_by_text("No matching screenings")).to_be_visible()
        frame.locator("#patient-search").fill("")
        for risk in ["High", "Low", "All"]:
            frame.locator(f'[data-risk="{risk}"]').click()
            expected = len([r for r in records if risk == "All" or r["risk"] == risk])
            expect(frame.locator("#record-count")).to_have_text(f"{expected} records")
        frame.locator("#date-toggle").click()
        frame.locator('[data-date="today"]').click()
        expect(frame.locator("#record-count")).to_have_text("2 records")
        frame.locator("#date-toggle").click()
        frame.locator("#date-from").fill("2000-01-01")
        frame.locator("#date-to").fill("2000-12-31")
        frame.locator('#date-form button[type="submit"]').click()
        expect(frame.locator("#record-count")).to_have_text("0 records")
        frame.locator("#date-toggle").click()
        frame.locator('[data-date="all"]').click()
        page.screenshot(path=str(OUT / "patients.png"))
        frame.locator("tbody tr").first.click()
        expect(frame.locator("#saved-contributions .main-svg").first).to_be_visible()
        frame.locator("#follow-up").click()
        expect(frame.locator("#follow-up")).to_have_text("Mark pending", timeout=15000)
        assert any(r["contacted"] for r in list_screenings(DB))
        print("PASS search, risk/date filters, CSV export, breakdown, and follow-up")

        for target in ["population", "model", "settings", "help"]:
            frame.locator(f'aside [data-nav="{target}"]').click()
            expect(frame.locator(".content .panel").first).to_be_visible()
            page.screenshot(path=str(OUT / f"{target}.png"))
        frame.locator('aside [data-nav="model"]').click()
        frame.locator("#model-select").select_option("XGBoost + SMOTE")
        expect(frame.locator(".cm-grid")).to_contain_text("44")
        print("PASS population, all model views, settings, and help")

        # A fresh browser session must still see both persisted rows.
        page.reload()
        expect(frame.locator(".app-shell")).to_be_visible(timeout=30000)
        frame.locator('aside [data-nav="patients"]').click()
        expect(frame.locator("#record-count")).to_have_text("2 records")
        print("PASS persistence across browser reload")
        frame.locator('aside [data-nav="dashboard"]').click()
        frame.locator('[data-source="screenings"]').click()
        expect(frame.locator(".stat-value").first).to_have_text("2")

        # Mobile reflow: no document-level horizontal overflow and usable navigation.
        page.set_viewport_size({"width":390,"height":844})
        expect(frame.locator("#mobile-nav")).to_be_visible()
        frame.locator("#mobile-nav").click()
        frame.locator('aside [data-nav="predict"]').click()
        expect(frame.locator("#prediction-form")).to_be_visible()
        iframe = page.frames[1]
        assert iframe.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
        page.screenshot(path=str(OUT / "mobile.png"))
        print("PASS mobile layout")
        assert not errors, errors
        browser.close()
    (OUT / "result.json").write_text(json.dumps({"passed":True,"javascript_errors":errors,"test_database":str(DB)},indent=2))
finally:
    server.terminate()
    server.wait(timeout=15)
    log.close()
