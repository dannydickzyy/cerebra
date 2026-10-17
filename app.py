"""Streamlit host for the vanilla HTML / Bootstrap / JavaScript interface."""
import json
import logging
import os
import sqlite3
import time
import uuid

import streamlit as st
import streamlit.components.v1 as components

from cerebra.auth import (authenticate, change_password, create_user, ensure_default_users, get_user, list_users,
                          update_user, verify_user_password)
from cerebra.backups import backup_dir, create_backup, list_backups, restore_backup
from cerebra.config import ARTIFACT_DIR, ROOT
from cerebra.database import (delete_screening, list_events, list_screenings, log_event, save_screening,
                              set_contacted)
from cerebra.model import predict
from cerebra.frontend import build_templates

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
# Refresh the static template bundle before Streamlit serves the frontend.
build_templates()
workspace = components.declare_component("workspace", path=str(ROOT / "frontend"))

# Every action except sign-in needs a signed-in user; ADMIN_ACTIONS also need the admin role.
ADMIN_ACTIONS = {"user_create", "user_update", "screening_delete", "backup_create", "backup_restore"}
ACTIONS = {"predict", "save", "follow_up", "refresh", "change_password", "logout", "ping"} | ADMIN_ACTIONS
MAX_FAILED_LOGINS, LOCKOUT_SECONDS = 5, 30
# Sign out after this long without activity. The browser also signs out on its own idle timer
# and sends a quiet "ping" every few minutes while someone is actively using the page.
IDLE_SECONDS = int(os.environ.get("CEREBRA_IDLE_SECONDS", 30 * 60))
_IDLE_TEXT = f"{IDLE_SECONDS // 60} minutes" if IDLE_SECONDS >= 60 else f"{IDLE_SECONDS} seconds"
IDLE_NOTICE = f"You were signed out after {_IDLE_TEXT} of inactivity. Please sign in again."

try:
    ensure_default_users()
    # Reloaded on every run, so disabling an account or changing its site applies immediately.
    user = get_user(st.session_state["user_id"]) if "user_id" in st.session_state else None
    if user and time.time() - st.session_state.get("last_active", 0) > IDLE_SECONDS:
        log_event(user["username"], user["role"], "session_timeout")
        st.session_state.notice = IDLE_NOTICE
        user = None
    if user is None:
        for key in ("user_id", "prediction", "last_active"):
            st.session_state.pop(key, None)
    is_admin = bool(user) and user["role"] == "admin"
    # Workers only ever receive their own site's screenings; admins see every site.
    site_scope = None if is_admin else (user or {}).get("site") or ""
    # Nothing but the sign-in screen is sent to the browser before authentication.
    records = list_screenings(site=site_scope) if user else []
    audit = list_events() if is_admin else []
    users = list_users() if is_admin else []
    backups = {"folder": str(backup_dir()), "items": list_backups()} if is_admin else None
except sqlite3.Error:
    st.error("The screening database is unavailable. Check the data folder permissions and restart.")
    st.stop()

event = workspace(user=user, report=report if user else None, dataset=dataset if user else None,
                  patients=records, audit=audit, users=users, backups=backups, response=st.session_state.get("response"),
                  notice=None if user else st.session_state.get("notice"), idle_seconds=IDLE_SECONDS,
                  key="cerebra", default=None)


def sign_in(event):
    locked_until = st.session_state.get("locked_until", 0)
    if time.time() < locked_until:
        raise ValueError(f"Too many failed attempts. Try again in {int(locked_until - time.time()) + 1} seconds.")
    account = authenticate(event.get("username"), event.get("password"))
    if account is None:
        failures = st.session_state.get("failed_logins", 0) + 1
        st.session_state.failed_logins = failures
        if failures >= MAX_FAILED_LOGINS:
            st.session_state.failed_logins = 0
            st.session_state.locked_until = time.time() + LOCKOUT_SECONDS
        log_event(str(event.get("username") or "")[:100], "-", "login_failed")
        raise ValueError("Incorrect username or password.")
    st.session_state.failed_logins = 0
    st.session_state.user_id = account["id"]
    st.session_state.last_active = time.time()
    st.session_state.pop("notice", None)
    st.session_state.pop("prediction", None)
    log_event(account["username"], account["role"], "login")


if isinstance(event, dict) and event.get("request_id") != st.session_state.get("last_event"):
    request_id = event.get("request_id")
    if not isinstance(request_id, str) or len(request_id) > 100:
        st.stop()
    st.session_state.last_event = request_id
    if user:
        st.session_state.last_active = time.time()
    if event.get("action") == "ping":
        # Activity heartbeat only: nothing to answer and no need to rerun the page.
        st.stop()
    try:
        action = event.get("action")
        response = {"request_id": request_id, "action": action, "ok": True}
        if action == "login":
            sign_in(event)
        elif action not in ACTIONS:
            raise ValueError("Unknown action.")
        elif not user:
            raise ValueError(st.session_state.get("notice") or "Your session has ended. Please sign in again.")
        elif action in ADMIN_ACTIONS and user["role"] != "admin":
            raise ValueError("Only administrators can do this.")
        elif action == "logout":
            idle = event.get("reason") == "idle"
            log_event(user["username"], user["role"], "session_timeout" if idle else "logout")
            for key in ("user_id", "prediction", "last_active"):
                st.session_state.pop(key, None)
            if idle:
                st.session_state.notice = IDLE_NOTICE
                response["reason"] = "idle"
        elif action == "change_password":
            change_password(user["id"], event.get("current"), event.get("new"))
            log_event(user["username"], user["role"], "password_changed")
        elif action == "predict":
            profile = event.get("profile")
            if isinstance(profile, dict) and not is_admin:
                # Workers always screen for their assigned site.
                profile = {**profile, "site": site_scope}
            result = predict(profile)
            token = uuid.uuid4().hex
            st.session_state.prediction = {"token": token, "result": result}
            response.update(result=result, token=token)
        elif action == "save":
            cached = st.session_state.get("prediction")
            if not cached or cached["token"] != event.get("token"):
                raise ValueError("Run a prediction before saving this screening.")
            # Idempotency uses the prediction token, not a browser-provided patient payload.
            response["id"] = save_screening(cached["result"], cached["token"])
            log_event(user["username"], user["role"], "screening_saved", response["id"])
        elif action == "follow_up":
            set_contacted(event.get("id"), event.get("contacted"), site=site_scope)
            status = "contacted" if event.get("contacted") else "pending"
            log_event(user["username"], user["role"], "follow_up", f"{event.get('id')} marked {status}")
        elif action == "user_create":
            created = create_user(event.get("username"), event.get("display_name"), event.get("role"),
                                  event.get("site"), event.get("password"))
            response["username"] = created["username"]
            detail = f"{created['username']} · {created['role_label']}" + (f" · {created['site']}" if created["site"] else "")
            log_event(user["username"], user["role"], "user_created", detail)
        elif action == "user_update":
            username, changes = update_user(user["id"], event.get("id"), event.get("display_name"), event.get("role"),
                                            event.get("site"), event.get("active"), event.get("password") or None,
                                            event.get("confirm_password"))
            log_event(user["username"], user["role"], "user_updated",
                      f"{username}: {', '.join(changes) or 'no changes'}")
        elif action == "screening_delete":
            if not verify_user_password(user["id"], event.get("confirm_password")):
                raise ValueError("Your password is incorrect. Nothing was deleted.")
            delete_screening(event.get("id"))
            st.session_state.pop("prediction", None)
            log_event(user["username"], user["role"], "screening_deleted", event.get("id"))
        elif action == "backup_create":
            response["name"] = create_backup()
            log_event(user["username"], user["role"], "backup_created", response["name"])
        elif action == "backup_restore":
            if not verify_user_password(user["id"], event.get("confirm_password")):
                raise ValueError("Your password is incorrect. Nothing was restored.")
            response["safety"] = restore_backup(event.get("name"))
            st.session_state.pop("prediction", None)
            # Logged after the restore so the entry survives in the restored audit log.
            log_event(user["username"], user["role"], "backup_restored",
                      f"{event.get('name')} (previous data saved as {response['safety']})")
    except ValueError as error:
        response = {"request_id": request_id, "ok": False, "error": str(error)}
    except Exception:
        logging.exception("CEREBRA action failed")
        response = {"request_id": request_id, "ok": False,
                    "error": "The operation could not be completed. Your saved records are unchanged. Please retry."}
    st.session_state.response = response
    st.rerun()
