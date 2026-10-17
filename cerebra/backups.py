"""Server-side SQLite backups for admins: create, list, and restore.

Backups are full copies of the database (screenings, accounts, audit log) saved next to it
in a `backups` folder. Only file names this module created can be restored.
"""
import re
import sqlite3
from datetime import datetime
from zoneinfo import ZoneInfo

from .config import DB_PATH
from .database import connect

BACKUP_NAME = re.compile(r"cerebra-\d{8}-\d{6}(-\d+)?(-before-restore)?\.sqlite3")


def backup_dir(path=DB_PATH):
    return path.parent / "backups"


def _copy(source, target):
    src, dst = sqlite3.connect(source), sqlite3.connect(target)
    try:
        src.backup(dst)
    finally:
        dst.close()
        src.close()


def _summary(file):
    """Record and account counts, or None when the file is not a CEREBRA database."""
    try:
        db = sqlite3.connect(f"file:{file.as_posix()}?mode=ro", uri=True)
        try:
            screenings = db.execute("SELECT COUNT(*) FROM screenings").fetchone()[0]
            users = db.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            admins = db.execute("SELECT COUNT(*) FROM users WHERE role = 'admin' AND active = 1").fetchone()[0]
        finally:
            db.close()
    except sqlite3.Error:
        return None
    return {"screenings": screenings, "users": users, "admins": admins}


def create_backup(path=DB_PATH, suffix=""):
    folder = backup_dir(path)
    folder.mkdir(parents=True, exist_ok=True)
    with connect(path):  # Make sure every table exists before copying.
        pass
    stamp = datetime.now(ZoneInfo("Asia/Manila")).strftime("%Y%m%d-%H%M%S")
    target, n = folder / f"cerebra-{stamp}{suffix}.sqlite3", 1
    while target.exists():
        n += 1
        target = folder / f"cerebra-{stamp}-{n}{suffix}.sqlite3"
    _copy(path, target)
    return target.name


def list_backups(path=DB_PATH, limit=30):
    folder = backup_dir(path)
    files = sorted((f for f in folder.glob("cerebra-*.sqlite3") if BACKUP_NAME.fullmatch(f.name)),
                   key=lambda f: f.stat().st_mtime, reverse=True)[:limit] if folder.exists() else []
    items = []
    for f in files:
        summary = _summary(f) or {}
        items.append({"name": f.name, "size": f.stat().st_size,
                      "created_at": datetime.fromtimestamp(f.stat().st_mtime, ZoneInfo("Asia/Manila"))
                      .isoformat(timespec="seconds"),
                      "screenings": summary.get("screenings"), "users": summary.get("users"),
                      "valid": bool(summary), "safety": f.name.endswith("-before-restore.sqlite3")})
    return items


def restore_backup(name, path=DB_PATH):
    """Replace the live database with a backup. Returns the safety backup of the data it replaced."""
    if not isinstance(name, str) or not BACKUP_NAME.fullmatch(name):
        raise ValueError("Backup not found.")
    file = backup_dir(path) / name
    if not file.is_file():
        raise ValueError("Backup not found.")
    summary = _summary(file)
    if summary is None:
        raise ValueError("That backup is not a valid CEREBRA database.")
    if not summary["admins"]:
        raise ValueError("That backup has no active admin account, so restoring it would lock everyone out.")
    safety = create_backup(path, "-before-restore")
    _copy(file, path)
    return safety
