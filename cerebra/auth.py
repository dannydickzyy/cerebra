"""Local user accounts: salted scrypt password hashes, roles, sites, and admin management."""
import hashlib
import hmac
import logging
import os
import re
import secrets
import sqlite3

from .config import DB_PATH
from .database import connect, now

ROLES = {"admin": "Admin", "worker": "Healthcare worker"}
# Workers only see screenings from their site; admins see every site.
DEFAULT_SITE = "Local workspace"
MIN_PASSWORD_LENGTH = 8
MAX_FIELD_LENGTH = 100
USERNAME_PATTERN = re.compile(r"[A-Za-z0-9._@-]{3,40}")
_SCRYPT = {"n": 2**14, "r": 8, "p": 1, "dklen": 32}


def hash_password(password):
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, **_SCRYPT)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password, stored):
    try:
        scheme, salt, digest = stored.split("$")
    except (AttributeError, ValueError):
        return False
    if scheme != "scrypt":
        return False
    candidate = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), **_SCRYPT)
    return hmac.compare_digest(candidate.hex(), digest)


# Checked when a username does not exist, so both cases take the same time.
_DUMMY_HASH = hash_password(secrets.token_hex(8))


def public_user(row):
    """The account fields that may be sent to the browser (never the hash)."""
    return {"id": row["id"], "username": row["username"], "display_name": row["display_name"],
            "role": row["role"], "role_label": ROLES[row["role"]], "site": row["site"]}


def default_accounts():
    """First-run accounts, configured in the local .env file (see .env.example), never in git.

    A missing password is replaced by a random one that is printed once to the server log.
    """
    env = os.environ.get
    accounts = []
    for prefix, role, name, site in [("ADMIN", "admin", "Administrator", None),
                                     ("WORKER", "worker", "Healthcare worker", DEFAULT_SITE)]:
        username = env(f"CEREBRA_{prefix}_USERNAME") or role
        password = env(f"CEREBRA_{prefix}_PASSWORD")
        if not password:
            password = secrets.token_urlsafe(9)
            logging.warning("Created %s account '%s' with password %s. Change it after signing in.",
                            role, username, password)
        accounts.append((username, password, role, env(f"CEREBRA_{prefix}_NAME") or name, site))
    return accounts


def ensure_default_users(path=DB_PATH):
    """Create the first admin and healthcare worker when the users table is empty."""
    with connect(path) as db:
        if db.execute("SELECT COUNT(*) FROM users").fetchone()[0]:
            return
        for username, password, role, display_name, site in default_accounts():
            db.execute("""INSERT INTO users (username, display_name, role, site, password_hash, created_at)
                          VALUES (?,?,?,?,?,?)""", (username, display_name, role, site, hash_password(password), now()))


def _text(value):
    return value if isinstance(value, str) and len(value) <= MAX_FIELD_LENGTH else None


def authenticate(username, password, path=DB_PATH):
    """Return the public user for valid, active credentials; otherwise None."""
    username, password = _text(username), _text(password)
    if not username or not password:
        return None
    with connect(path) as db:
        row = db.execute("SELECT * FROM users WHERE username = ? COLLATE NOCASE", (username.strip(),)).fetchone()
    if row is None:
        verify_password(password, _DUMMY_HASH)
        return None
    if not verify_password(password, row["password_hash"]) or not row["active"]:
        return None
    return public_user(row)


def get_user(user_id, path=DB_PATH):
    """Reload a signed-in account so role, site, and disabled status apply immediately."""
    with connect(path) as db:
        row = db.execute("SELECT * FROM users WHERE id = ? AND active = 1", (user_id,)).fetchone()
    return public_user(row) if row else None


def list_users(path=DB_PATH):
    with connect(path) as db:
        rows = db.execute("SELECT * FROM users ORDER BY role, username COLLATE NOCASE").fetchall()
    return [{**public_user(r), "active": bool(r["active"]), "created_at": r["created_at"]} for r in rows]


def _plain(value, label, limit, required=True):
    value = "" if value is None else value
    if not isinstance(value, str) or len(value.strip()) > limit or any(ord(c) < 32 for c in value):
        raise ValueError(f"{label} must be plain text up to {limit} characters.")
    if required and not value.strip():
        raise ValueError(f"{label} is required.")
    return value.strip()


def _validate_new_password(password):
    if not isinstance(password, str) or not MIN_PASSWORD_LENGTH <= len(password) <= MAX_FIELD_LENGTH:
        raise ValueError(f"Passwords must be {MIN_PASSWORD_LENGTH} to {MAX_FIELD_LENGTH} characters.")
    return password


def _validate_account(display_name, role, site):
    display_name = _plain(display_name, "Display name", 60)
    if role not in ROLES:
        raise ValueError("Choose a valid role.")
    if role == "admin":
        return display_name, role, None
    return display_name, role, _plain(site, "Site", MAX_FIELD_LENGTH)


def create_user(username, display_name, role, site, password, path=DB_PATH):
    if not isinstance(username, str) or not USERNAME_PATTERN.fullmatch(username.strip()):
        raise ValueError("Usernames need 3 to 40 letters, numbers, or . _ @ - characters.")
    display_name, role, site = _validate_account(display_name, role, site)
    password = _validate_new_password(password)
    try:
        with connect(path) as db:
            cursor = db.execute("""INSERT INTO users (username, display_name, role, site, password_hash, created_at)
                                   VALUES (?,?,?,?,?,?)""",
                                (username.strip(), display_name, role, site, hash_password(password), now()))
            row = db.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
    except sqlite3.IntegrityError:
        raise ValueError("That username is already taken.") from None
    return public_user(row)


def update_user(actor_id, user_id, display_name, role, site, active, password=None, actor_password=None,
                path=DB_PATH):
    """Admin edit of an account. Returns a list of what changed, for the audit log.

    Deactivating an account requires the acting admin's own password (`actor_password`).
    """
    if not isinstance(user_id, int) or isinstance(user_id, bool) or not isinstance(active, bool):
        raise ValueError("Account details are incomplete.")
    display_name, role, site = _validate_account(display_name, role, site)
    if password:
        _validate_new_password(password)
    if user_id == actor_id and (role != "admin" or not active):
        raise ValueError("You cannot disable or remove the admin role from your own account.")
    with connect(path) as db:
        row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if row is None:
            raise ValueError("Account not found.")
        if row["active"] and not active:
            actor = db.execute("SELECT password_hash FROM users WHERE id = ?", (actor_id,)).fetchone()
            if not isinstance(actor_password, str) or actor is None                     or not verify_password(actor_password[:MAX_FIELD_LENGTH], actor["password_hash"]):
                raise ValueError("Your password is incorrect. The account was not deactivated.")
        if row["role"] == "admin" and row["active"] and (role != "admin" or not active):
            others = db.execute("SELECT COUNT(*) FROM users WHERE role = 'admin' AND active = 1 AND id != ?",
                                (user_id,)).fetchone()[0]
            if not others:
                raise ValueError("Keep at least one active admin account.")
        changes = [label for label, old, new in [("name", row["display_name"], display_name), ("role", row["role"], role),
                                                 ("site", row["site"], site), ("status", bool(row["active"]), active)]
                   if old != new]
        db.execute("UPDATE users SET display_name = ?, role = ?, site = ?, active = ? WHERE id = ?",
                   (display_name, role, site, int(active), user_id))
        if password:
            db.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(password), user_id))
            changes.append("password reset")
    return row["username"], changes


def change_password(user_id, current, new, path=DB_PATH):
    current, new = _text(current), _text(new)
    if not current or not new:
        raise ValueError(f"Passwords must be up to {MAX_FIELD_LENGTH} characters.")
    if len(new) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"The new password must have at least {MIN_PASSWORD_LENGTH} characters.")
    if new == current:
        raise ValueError("Choose a new password that is different from the current one.")
    with connect(path) as db:
        row = db.execute("SELECT password_hash FROM users WHERE id = ? AND active = 1", (user_id,)).fetchone()
        if row is None or not verify_password(current, row["password_hash"]):
            raise ValueError("The current password is incorrect.")
        db.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(new), user_id))


def verify_user_password(user_id, password, path=DB_PATH):
    """True when `password` belongs to this active account; confirms risky admin actions."""
    if not isinstance(password, str) or not password or len(password) > MAX_FIELD_LENGTH:
        return False
    with connect(path) as db:
        row = db.execute("SELECT password_hash FROM users WHERE id = ? AND active = 1", (user_id,)).fetchone()
    return bool(row) and verify_password(password, row["password_hash"])
