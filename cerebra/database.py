"""SQLite persistence with parameterized queries and idempotent screening saves."""
from contextlib import contextmanager
from datetime import datetime
from zoneinfo import ZoneInfo
import json
import sqlite3
import uuid

from .config import DB_PATH


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
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def save_screening(result, request_id, path=DB_PATH):
    identifier = "PT-" + uuid.uuid4().hex[:10].upper()
    timestamp = datetime.now(ZoneInfo("Asia/Manila")).isoformat(timespec="seconds")
    with connect(path) as db:
        db.execute("""INSERT INTO screenings
            (id,request_id,created_at,name,site,risk,score,payload) VALUES(?,?,?,?,?,?,?,?)
            ON CONFLICT(request_id) DO NOTHING""",
            (identifier, request_id, timestamp, result["profile"]["name"], result["profile"]["site"],
             result["risk"], result["score"], json.dumps(result, allow_nan=False)))
        row = db.execute("SELECT id FROM screenings WHERE request_id=?", (request_id,)).fetchone()
    return row["id"]


def list_screenings(path=DB_PATH):
    with connect(path) as db:
        rows = db.execute("SELECT * FROM screenings ORDER BY created_at DESC, rowid DESC").fetchall()
    return [{**json.loads(r["payload"]), "id": r["id"], "created_at": r["created_at"],
             "contacted": bool(r["contacted"])} for r in rows]


def set_contacted(identifier, contacted, path=DB_PATH):
    if not isinstance(contacted, bool):
        raise ValueError("Follow-up status must be true or false.")
    with connect(path) as db:
        count = db.execute("UPDATE screenings SET contacted=? WHERE id=?", (int(contacted), identifier)).rowcount
        if not count:
            raise ValueError("Screening record not found.")
