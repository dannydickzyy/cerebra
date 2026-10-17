"""SQLite persistence: screenings, user accounts, and the audit log (parameterized queries only)."""
from contextlib import contextmanager
from datetime import datetime
from zoneinfo import ZoneInfo
import json
import sqlite3
import uuid

from .config import DB_PATH


def now():
    return datetime.now(ZoneInfo("Asia/Manila")).isoformat(timespec="seconds")


@contextmanager
def connect(path=DB_PATH):
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path, timeout=15)
    db.row_factory = sqlite3.Row
    try:
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("""CREATE TABLE IF NOT EXISTS screenings (
            id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL, name TEXT NOT NULL, site TEXT NOT NULL,
            risk TEXT NOT NULL CHECK(risk IN ('High','Low')),
            score REAL NOT NULL CHECK(score BETWEEN 0 AND 1),
            payload TEXT NOT NULL, contacted INTEGER NOT NULL DEFAULT 0 CHECK(contacted IN (0,1)))""")
        db.execute("CREATE INDEX IF NOT EXISTS screenings_created ON screenings(created_at)")
        db.execute("""CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
            display_name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','worker')),
            site TEXT, password_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
            created_at TEXT NOT NULL)""")
        db.execute("""CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY, created_at TEXT NOT NULL, username TEXT NOT NULL,
            role TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '')""")
        # Accounts created before sites existed: workers default to the standard screening site.
        if "site" not in {c["name"] for c in db.execute("PRAGMA table_info(users)")}:
            db.execute("ALTER TABLE users ADD COLUMN site TEXT")
            db.execute("UPDATE users SET site = 'Local workspace' WHERE role = 'worker'")
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def save_screening(result, request_id, path=DB_PATH):
    identifier = "PT-" + uuid.uuid4().hex[:10].upper()
    timestamp = now()
    with connect(path) as db:
        db.execute("""INSERT INTO screenings
            (id,request_id,created_at,name,site,risk,score,payload) VALUES(?,?,?,?,?,?,?,?)
            ON CONFLICT(request_id) DO NOTHING""",
            (identifier, request_id, timestamp, result["profile"]["name"], result["profile"]["site"],
             result["risk"], result["score"], json.dumps(result, allow_nan=False)))
        row = db.execute("SELECT id FROM screenings WHERE request_id=?", (request_id,)).fetchone()
    return row["id"]


def list_screenings(path=DB_PATH, site=None):
    """All screenings, or only one site's when `site` is given (healthcare workers)."""
    query = "SELECT * FROM screenings" + (" WHERE site = ?" if site is not None else "")
    with connect(path) as db:
        rows = db.execute(query + " ORDER BY created_at DESC, rowid DESC", (() if site is None else (site,))).fetchall()
    return [{**json.loads(r["payload"]), "id": r["id"], "created_at": r["created_at"],
             "contacted": bool(r["contacted"])} for r in rows]


def set_contacted(identifier, contacted, path=DB_PATH, site=None):
    if not isinstance(contacted, bool):
        raise ValueError("Follow-up status must be true or false.")
    query = "UPDATE screenings SET contacted=? WHERE id=?" + (" AND site=?" if site is not None else "")
    with connect(path) as db:
        count = db.execute(query, (int(contacted), identifier) + (() if site is None else (site,))).rowcount
        if not count:
            raise ValueError("Screening record not found.")


def delete_screening(identifier, path=DB_PATH):
    if not isinstance(identifier, str):
        raise ValueError("Screening record not found.")
    with connect(path) as db:
        if not db.execute("DELETE FROM screenings WHERE id=?", (identifier,)).rowcount:
            raise ValueError("Screening record not found.")


def log_event(username, role, action, detail="", path=DB_PATH):
    with connect(path) as db:
        db.execute("INSERT INTO audit_log (created_at, username, role, action, detail) VALUES (?,?,?,?,?)",
                   (now(), str(username)[:100], role, action, str(detail)[:300]))


def list_events(limit=500, path=DB_PATH):
    with connect(path) as db:
        rows = db.execute("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return [dict(r) for r in rows]
