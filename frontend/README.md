# Frontend file guide

The frontend keeps each page's HTML separate, with one JavaScript file for application behavior.

```text
frontend/
  index.html                     Entry point, startup view, loading dialog, toast
  templates/                     Editable HTML for each page
    dashboard.html
    risk-prediction.html
    risk-breakdown.html
    screened-patients.html
    population-health.html
    model-performance.html
    notifications.html
    settings.html
    help.html
  static/
    css/
      styles.css                 Shared styles, themes, responsive layout
      bootstrap.min.css          Local Bootstrap library
    js/
      app.js                     Shared helpers and all page behavior
      templates.generated.js     Generated HTML bundle; do not edit directly
      plotly.min.js              Local chart library
  assets/
    logo.png
```

`static/js/app.js` has labeled sections for shared template rendering, application
state/navigation, and each page. Function comments explain data preparation and
interactions. External libraries remain separate from the application code.

## Editing a screen

1. Edit its HTML in `templates/`. Each `<template id="...">` defines a page section
   or reusable fragment.
2. Edit the corresponding section in `static/js/app.js` for data or behavior.
   `renderTemplate("id", { slot_name: value })` fills `{{slot_name}}` placeholders.
3. Escape external text using `esc()` before passing it into a slot. Slots also
   accept intentional HTML from helpers such as `panel()` and `stat()`.
   Templates never evaluate JavaScript.
4. Edit `static/css/styles.css` for styling.
5. Rebuild the HTML bundle from the repository root:

   ```powershell
   .\.venv\Scripts\python -m cerebra.frontend
   ```

The Streamlit host also rebuilds changed templates on its next rerun. The generated
`static/js/templates.generated.js` is committed so standalone browser tests can
open `index.html` without a web server or asynchronous template fetches.

## Checking changes

```powershell
.\.venv\Scripts\python -m cerebra.frontend
.\.venv\Scripts\python tests/loading_modal_browser.py
.\.venv\Scripts\python tests/browser_smoke.py
```

The first browser script checks navigation, notifications, and processing dialogs.
The second checks the real Streamlit bridge, prediction, saving, filters, exports,
follow-up, and responsive layouts using an isolated test database.
