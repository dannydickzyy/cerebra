"""Exercise pending/success/error UI states without writing patient records."""
import json
from pathlib import Path
import sys

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from cerebra.model import predict

profile = {"name": "Loading preview", "site": "Test workspace", "age": 67.5, "gender": "Female",
           "hypertension": 1, "heart_disease": 1, "ever_married": "Yes", "work_type": "Private",
           "Residence_type": "Urban", "avg_glucose_level": 198, "bmi": 31.4,
           "smoking_status": "formerly smoked"}
result = predict(profile)
payload = {"report": json.loads((ROOT / "artifacts/report.json").read_text()),
           "dataset": json.loads((ROOT / "artifacts/dataset_summary.json").read_text()),
           "patients": [], "response": None}
out = ROOT / "artifacts/browser-tests"
out.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto((ROOT / "frontend/index.html").as_uri())
    page.wait_for_function("typeof action === 'function'")
    # A standalone component harness substitutes only the Python message bridge.
    def send(response=None):
        payload["response"] = response
        page.evaluate("args => window.postMessage({type:'streamlit:render',args}, '*')", payload)

    send()
    expect(page.locator(".app-shell")).to_be_visible()
    page.evaluate("nav('predict'); action('predict')")
    modal = page.get_by_role("dialog")
    expect(modal).to_be_visible()
    expect(modal).to_contain_text("Analyzing health profile")
    request_id = page.evaluate("state.pending")
    page.keyboard.press("Escape")
    expect(modal).to_be_visible()
    page.evaluate("action('save')")
    assert page.evaluate("state.pending") == request_id
    send({"request_id": "stale-response", "ok": True, "action": "predict", "result": result})
    expect(modal).to_be_visible()
    page.screenshot(path=str(out / "loading-prediction.png"))
    send({"request_id": request_id, "ok": True, "action": "predict", "result": result, "token": "preview"})
    expect(modal).not_to_be_visible()
    expect(page.locator(".result-name")).to_be_focused()
    page.locator("#theme-toggle").click()
    page.locator("#save-screening").click()
    expect(modal).to_contain_text("Saving patient record")
    expect(modal).to_be_visible()
    page.screenshot(path=str(out / "loading-save-dark.png"))
    save_id = page.evaluate("state.pending")
    send({"request_id": save_id, "ok": False, "error": "Test save failure"})
    expect(modal).not_to_be_visible()
    expect(page.locator("#form-error")).to_contain_text("Test save failure")
    expect(page.locator('#prediction-form button[type="submit"]')).to_be_focused()
    page.locator("#save-screening").click()
    expect(modal).to_be_visible()
    save_id = page.evaluate("state.pending")
    send({"request_id": save_id, "ok": True, "action": "save", "id": "PT-PREVIEW"})
    expect(modal).not_to_be_visible()
    expect(page.locator("#save-screening")).to_contain_text("Saved as PT-PREVIEW")
    page.set_viewport_size({"width":390,"height":844})
    page.evaluate("action('predict')")
    expect(modal).to_be_visible()
    bounds = modal.bounding_box()
    assert bounds["x"] >= 0 and bounds["x"] + bounds["width"] <= 390
    page.screenshot(path=str(out / "loading-mobile.png"))
    assert not errors, errors
    browser.close()
print("PASS: prediction/save modals, success/error cleanup, stale responses, focus, duplicate protection, dark mode, mobile")
