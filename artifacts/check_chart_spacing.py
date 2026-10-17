import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path.cwd()
payload = {'report': json.loads((ROOT/'artifacts/report.json').read_text()), 'dataset': json.loads((ROOT/'artifacts/dataset_summary.json').read_text()), 'patients': [], 'response': None, 'audit': [], 'user': {"id": 2, "username": "test-worker", "display_name": "Test Worker", "role": "worker", "role_label": "Healthcare worker"}}
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width':1440,'height':1000})
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto((ROOT/'frontend/index.html').as_uri())
    page.wait_for_function("typeof nav === 'function'")
    page.evaluate("args => window.postMessage({type:'streamlit:render',args}, '*')", payload)
    for width in [1440,390]:
        page.set_viewport_size({'width':width,'height':1000})
        for dark in [False,True]:
            page.evaluate('dark => {state.dark=dark; nav("dashboard");}', dark)
            page.wait_for_function('!chartsLoading && !!document.querySelector("#global-importance .main-svg")')
            for chart in ['global-importance','age-risk','bmi','work','glucose']:
                el=page.locator('#'+chart)
                data=el.evaluate('(el) => ({x:el._fullLayout.xaxis.ticklabelstandoff,y:el._fullLayout.yaxis.ticklabelstandoff,zero:el.querySelectorAll(".zerolinelayer path").length})')
                assert data['x'] == 12 and data['y'] == 12, data
                assert data['zero'] > 0, (chart,data)
            for chart in ['global-importance','age-risk']:
                page.locator('#'+chart).locator('..').screenshot(path=str(ROOT/f'artifacts/browser-tests/spacing-{chart}-{width}-{dark}.png'))
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        page.evaluate('nav("model")')
        page.wait_for_function('!chartsLoading')
        page.locator('#model-select').select_option('Random Forest + SMOTE')
        page.wait_for_function('!chartsLoading')
        page.locator('#roc').locator('..').screenshot(path=str(ROOT/f'artifacts/browser-tests/spacing-roc-{width}.png'))
    assert not errors, errors
    browser.close()
print('PASS: chart spacing and zero lines at desktop/mobile sizes in both themes; model curves and no page overflow.')
