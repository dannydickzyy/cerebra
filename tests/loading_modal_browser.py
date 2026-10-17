"""Exercise pending/success/error UI states without writing patient records."""
import json
from pathlib import Path
import sys

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from cerebra.model import predict
from cerebra.frontend import build_templates

# Standalone file:// checks use the same HTML bundle as the Streamlit host.
build_templates()

profile = {"name": "Loading preview", "site": "Test workspace", "age": 67.5, "gender": "Female",
           "hypertension": 1, "heart_disease": 1, "ever_married": "Yes", "work_type": "Private",
           "Residence_type": "Urban", "avg_glucose_level": 198, "bmi": 31.4,
           "smoking_status": "formerly smoked"}
result = predict(profile)
payload = {"report": json.loads((ROOT / "artifacts/report.json").read_text()),
           "dataset": json.loads((ROOT / "artifacts/dataset_summary.json").read_text()),
           "patients": [], "response": None, "audit": [],
           "user": {"id": 2, "username": "test-worker", "display_name": "Test Worker", "role": "worker", "role_label": "Healthcare worker"}}
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
    page.locator('aside [data-nav="notifications"]').click()
    expect(page.get_by_text("No screening activity yet", exact=True)).to_be_visible()
    payload["patients"] = [{**result, "id": f"PT-TEST-{i}", "created_at": f"2026-09-{20+i}T12:00:00+08:00",
                            "risk": "High" if i < 2 else "Low", "contacted": i == 1}
                           for i in range(5)]
    send()
    expect(page.locator(".notification-list [data-patient]")).to_have_count(5)
    page.locator('[data-notification-filter="pending"]').click()
    expect(page.locator(".notification-list [data-patient]")).to_have_count(1)
    page.locator('[data-notification-filter="all"]').click()
    page.locator('#notifications').click()
    expect(page.locator('.notification-preview .notification-row')).to_have_count(3)
    page.locator('#notification-summary [data-nav="notifications"]').click()
    expect(page.locator('#notification-summary')).to_have_count(0)
    expect(page.locator('aside [data-nav="notifications"]')).to_have_attribute('aria-current', 'page')
    page.locator('.notification-list [data-patient="PT-TEST-0"]').click()
    expect(page.locator('#follow-up')).to_have_attribute('data-id', 'PT-TEST-0')
    page.evaluate("nav('notifications')")
    page.set_viewport_size({"width":390,"height":844})
    page.locator('#notifications').click()
    expect(page.locator('#notification-summary')).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    page.screenshot(path=str(out / 'notifications-mobile.png'))
    page.locator('#notification-summary [data-nav="notifications"]').click()
    page.set_viewport_size({"width":1440,"height":1000})
    page.screenshot(path=str(out / 'notifications-desktop.png'))
    payload['patients'] = []
    send()
    page.evaluate("nav('model')")
    expect(page.locator("#model-select")).to_have_value("all")
    expect(page.locator(".all-models-table tbody tr")).to_have_count(4)
    expect(page.locator(".cm-grid")).to_have_count(4)
    expect(page.get_by_role("dialog")).not_to_be_visible(timeout=15000)
    page.screenshot(path=str(out / "all-models.png"))
    page.locator("#model-select").select_option("Random Forest + SMOTE")
    expect(page.locator(".cm-grid")).to_have_count(1)
    page.locator("#model-select").select_option("all")
    expect(page.locator(".all-models-table tbody tr")).to_have_count(4)
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
    for operation, title in [("refresh", "Refreshing records"), ("follow_up", "Updating follow-up status")]:
        page.evaluate("name => action(name)", operation)
        expect(modal).to_be_visible()
        expect(modal).to_contain_text(title)
        pending = page.evaluate("state.pending")
        send({"request_id": pending, "ok": True, "action": operation})
        expect(modal).not_to_be_visible()
    # Even pending charts must leave navigation usable without flashing a modal.
    page.evaluate("""() => {
        window.modalShows = 0;
        const modal = document.getElementById('loading-modal');
        const originalShow = modal.showModal.bind(modal);
        modal.showModal = () => { window.modalShows++; originalShow(); };
        for (const destination of Object.keys(pages)) nav(destination);
    }""")
    assert page.evaluate("window.modalShows") == 0
    page.evaluate("window.originalPlot = Plotly.newPlot; Plotly.newPlot = () => new Promise(resolve => { window.finishChart = resolve; }); nav('model')")
    page.wait_for_function("typeof window.finishChart === 'function'")
    expect(modal).not_to_be_visible()
    assert page.evaluate("window.modalShows") == 0
    page.locator('aside [data-nav="predict"]').click()
    expect(page.locator("#prediction-form")).to_be_visible()
    page.evaluate("() => { window.finishChart(); Plotly.newPlot = window.originalPlot; }")
    expect(modal).not_to_be_visible()
    # Chart failure must also unblock the interface.
    page.evaluate("Plotly.newPlot = () => Promise.reject(new Error('Test chart failure')); nav('model')")
    expect(page.locator("#toast")).to_contain_text("Some charts could not load")
    expect(modal).not_to_be_visible()
    page.evaluate("Plotly.newPlot = window.originalPlot; nav('predict')")
    page.set_viewport_size({"width":390,"height":844})
    page.evaluate("action('predict')")
    expect(modal).to_be_visible()
    bounds = modal.bounding_box()
    assert bounds["x"] >= 0 and bounds["x"] + bounds["width"] <= 390
    page.screenshot(path=str(out / "loading-mobile.png"))
    assert not errors, errors
    browser.close()
print("PASS: all-model comparison, individual view, operation modals, nonblocking navigation/charts, success/error cleanup, stale responses, focus, duplicate protection, dark mode, mobile")
