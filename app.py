"""Streamlit host for the vanilla HTML / Bootstrap / JavaScript interface."""
import json
import logging
import sqlite3
import uuid

import streamlit as st
import streamlit.components.v1 as components

from cerebra.config import ARTIFACT_DIR, ROOT
from cerebra.database import list_screenings, save_screening, set_contacted
from cerebra.model import predict

st.set_page_config(page_title="CEREBRA · Stroke Analytics", page_icon=str(ROOT / "frontend/assets/logo.png"),
                   layout="wide", initial_sidebar_state="collapsed")
st.markdown("""<style>
header[data-testid="stHeader"], [data-testid="stToolbar"], #MainMenu, footer {display:none!important}
.stMainBlockContainer {padding:0!important;max-width:100%!important}
[data-testid="stVerticalBlock"] {gap:0!important}
[data-testid="stElementContainer"]:has(style) {height:0!important;min-height:0!important}
[data-testid="stMain"] {overflow:hidden!important}
[data-testid="stElementContainer"]:has(iframe) {height:100dvh!important}
iframe {height:100dvh!important;width:100%!important;border:0}
.stApp {background:#f8f9fb}
</style>""", unsafe_allow_html=True)


@st.cache_data
def read_artifacts():
    return (json.loads((ARTIFACT_DIR / "report.json").read_text(encoding="utf-8")),
            json.loads((ARTIFACT_DIR / "dataset_summary.json").read_text(encoding="utf-8")))


if not (ARTIFACT_DIR / "model.joblib").exists():
    st.title("CEREBRA")
    st.info("Train the local model first, then refresh this page.")
    st.code(r".\.venv\Scripts\python train.py", language="powershell")
    st.stop()

report, dataset = read_artifacts()
workspace = components.declare_component("workspace", path=str(ROOT / "frontend"))
try:
    records = list_screenings()
except sqlite3.Error:
    st.error("The screening database is unavailable. Check the data folder permissions and restart.")
    st.stop()

event = workspace(report=report, dataset=dataset, patients=records,
                  response=st.session_state.get("response"), key="cerebra", default=None)

if isinstance(event, dict) and event.get("request_id") != st.session_state.get("last_event"):
    request_id = event.get("request_id")
    if not isinstance(request_id, str) or len(request_id) > 100:
        st.stop()
    st.session_state.last_event = request_id
    try:
        action = event.get("action")
        response = {"request_id": request_id, "action": action, "ok": True}
        if action == "predict":
            result = predict(event.get("profile"))
            token = uuid.uuid4().hex
            st.session_state.prediction = {"token": token, "result": result}
            response.update(result=result, token=token)
        elif action == "save":
            cached = st.session_state.get("prediction")
            if not cached or cached["token"] != event.get("token"):
                raise ValueError("Run a prediction before saving this screening.")
            # Idempotency uses the prediction token, not a browser-provided patient payload.
            response["id"] = save_screening(cached["result"], cached["token"])
        elif action == "follow_up":
            set_contacted(event.get("id"), event.get("contacted"))
        elif action != "refresh":
            raise ValueError("Unknown action.")
    except ValueError as error:
        response = {"request_id": request_id, "ok": False, "error": str(error)}
    except Exception:
        logging.exception("CEREBRA action failed")
        response = {"request_id": request_id, "ok": False,
                    "error": "The operation could not be completed. Your saved records are unchanged. Please retry."}
    st.session_state.response = response
    st.rerun()
