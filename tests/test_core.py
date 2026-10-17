import json

import numpy as np
import pandas as pd
import pytest

from cerebra.config import ARTIFACT_DIR, DATA_PATH, FEATURES
from cerebra.database import list_screenings, save_screening, set_contacted
from cerebra.model import load_bundle, predict, validate_profile


@pytest.fixture(autouse=True)
def test_accounts(monkeypatch):
    """Test-only first-run accounts; real ones live in the local, git-ignored .env file."""
    for key, value in {'CEREBRA_ADMIN_USERNAME': 'test-admin', 'CEREBRA_ADMIN_PASSWORD': 'test-pass-123', 'CEREBRA_ADMIN_NAME': 'Test Admin', 'CEREBRA_WORKER_USERNAME': 'test-worker', 'CEREBRA_WORKER_PASSWORD': 'test-pass-123', 'CEREBRA_WORKER_NAME': 'Test Worker'}.items():
        monkeypatch.setenv(key, value)


@pytest.fixture
def profile():
    return {"name": "Research participant", "site": "Test site", "age": 67.5, "gender": "Female",
            "hypertension": 1, "heart_disease": 1, "ever_married": "Yes", "work_type": "Private",
            "Residence_type": "Urban", "avg_glucose_level": 198.0, "bmi": 31.4,
            "smoking_status": "formerly smoked"}


@pytest.mark.parametrize("key,value", [("age", 10), ("age", float("nan")), ("bmi", 80),
    ("avg_glucose_level", float("inf")), ("gender", "unsupported"), ("hypertension", 2),
    ("heart_disease", None), ("work_type", "Never worked"), ("smoking_status", ""), ("age", True)])
def test_rejects_invalid_profiles(profile, key, value):
    profile[key] = value
    with pytest.raises(ValueError):
        validate_profile(profile)


def test_explanation_reconciles_and_persistence_is_idempotent(profile, tmp_path):
    result = predict(profile)
    assert 0 <= result["score"] <= 1
    assert result["risk"] == ("High" if result["score"] >= .5 else "Low")
    exp = result["explanation"]
    assert len(exp["contributions"]) == len(FEATURES)
    assert exp["baseline"] + sum(c["value"] for c in exp["contributions"]) == pytest.approx(result["score"], abs=1e-7)
    database = tmp_path / "test.sqlite3"
    first = save_screening(result, "prediction-token", database)
    assert save_screening(result, "prediction-token", database) == first
    assert len(list_screenings(database)) == 1
    # A new prediction can have the same name; it must still be a separate screening.
    assert save_screening(result, "another-token", database) != first
    set_contacted(first, True, database)
    persisted = next(p for p in list_screenings(database) if p["id"] == first)
    assert persisted["contacted"]
    assert persisted["explanation"] == exp
    assert persisted["profile"]["name"] == profile["name"]


def test_missing_bmi_is_supported_and_inference_is_repeatable(profile):
    profile["bmi"] = None
    first, second = predict(profile), predict(profile)
    assert first["profile"]["bmi"] is None
    assert np.isfinite(first["score"])
    assert first["score"] == second["score"]
    assert first["explanation"]["baseline"] + sum(c["value"] for c in first["explanation"]["contributions"]) == pytest.approx(first["score"], abs=1e-7)


def test_no_split_leakage_and_report_matches_artifact():
    split = np.load(ARTIFACT_DIR / "split_indices.npz")
    train, test = set(split["train"]), set(split["test"])
    fit, validation = set(split["selection_fit"]), set(split["validation"])
    assert not train & test and len(train | test) == 50000
    assert not fit & validation and fit | validation == train
    report = json.loads((ARTIFACT_DIR / "report.json").read_text())
    assert report["train_count"] == len(train) == 40000
    assert report["test_count"] == len(test) == 10000
    assert report["smote_distribution"]["0"] == report["smote_distribution"]["1"] == 38058
    for result in report["results"].values():
        cm = result["cm"]
        assert sum(cm.values()) == 10000
        assert cm["tp"] + cm["fn"] == 485
        assert result["recall"] == pytest.approx(cm["tp"] / 485)
    df = pd.read_csv(DATA_PATH)
    assert df.iloc[split["train"]].bmi.median() == report["bmi_training_median"]
    bundle = load_bundle()
    assert bundle["name"] == report["selected"]
    assert bundle["version"] == report["version"]
    assert "id" not in FEATURES and "stroke" not in FEATURES
    assert set(bundle["background"].index).issubset(train)


def test_parameterized_storage_accepts_text_without_running_sql(profile, tmp_path):
    profile["name"] = "Robert'); DROP TABLE screenings;--"
    result = {"profile": validate_profile(profile), "score": .3, "risk": "Low"}
    db = tmp_path / "quotes.sqlite3"
    save_screening(result, "request", db)
    assert list_screenings(db)[0]["profile"]["name"] == profile["name"]
    with pytest.raises(ValueError):
        set_contacted("nonexistent", True, db)


def test_default_accounts_sign_in_with_roles(tmp_path):
    from cerebra.auth import authenticate, ensure_default_users
    db = tmp_path / "users.sqlite3"
    ensure_default_users(db)
    ensure_default_users(db)  # Seeding only happens once.
    admin = authenticate("test-admin", "test-pass-123", db)
    worker = authenticate("Test-Worker", "test-pass-123", db)  # Usernames are case-insensitive.
    assert admin["role"] == "admin" and worker["role"] == "worker"
    assert "password_hash" not in admin
    for username, password in [("test-admin", "wrong-pass"), ("nobody", "test-pass-123"), ("test-admin", None),
                               (["test-admin"], "test-pass-123"), ("test-admin", "x" * 101)]:
        assert authenticate(username, password, db) is None


def test_passwords_are_hashed_and_can_be_changed(tmp_path):
    from cerebra.auth import authenticate, change_password, ensure_default_users, hash_password, verify_password
    from cerebra.database import connect
    stored = hash_password("test-pass-123")
    assert "test-pass-123" not in stored and verify_password("test-pass-123", stored) and not verify_password("danny124", stored)
    assert hash_password("test-pass-123") != stored  # Unique salt per hash.
    db = tmp_path / "users.sqlite3"
    ensure_default_users(db)
    with connect(db) as conn:
        assert all(row[0].startswith("scrypt$") for row in conn.execute("SELECT password_hash FROM users"))
    worker = authenticate("test-worker", "test-pass-123", db)
    for current, new in [("wrong-pass", "new-password"), ("test-pass-123", "short"), ("test-pass-123", "test-pass-123")]:
        with pytest.raises(ValueError):
            change_password(worker["id"], current, new, db)
    change_password(worker["id"], "test-pass-123", "new-password", db)
    assert authenticate("test-worker", "test-pass-123", db) is None
    assert authenticate("test-worker", "new-password", db)["id"] == worker["id"]


def test_audit_log_is_newest_first(tmp_path):
    from cerebra.database import list_events, log_event
    db = tmp_path / "audit.sqlite3"
    log_event("test-admin", "admin", "login", path=db)
    log_event("test-worker", "worker", "screening_saved", "PT-1", path=db)
    events = list_events(path=db)
    assert [e["action"] for e in events] == ["screening_saved", "login"]
    assert events[0]["detail"] == "PT-1" and events[0]["role"] == "worker"


def test_admin_can_create_and_update_accounts(tmp_path):
    from cerebra.auth import authenticate, create_user, ensure_default_users, get_user, list_users, update_user
    db = tmp_path / "users.sqlite3"
    ensure_default_users(db)
    admin = authenticate("test-admin", "test-pass-123", db)
    nurse = create_user("nurse.ana", "Nurse Ana", "worker", "Barangay 1", "secret-pass", db)
    assert nurse["site"] == "Barangay 1" and authenticate("nurse.ana", "secret-pass", db)["role"] == "worker"
    assert create_user("admin2", "Second Admin", "admin", "ignored", "secret-pass", db)["site"] is None
    for args in [("nurse.ana", "Dup", "worker", "B1", "secret-pass"), ("x", "Short", "worker", "B1", "secret-pass"),
                 ("no site", "Bad", "worker", "B1", "secret-pass"), ("nosite", "No site", "worker", "", "secret-pass"),
                 ("weakpw", "Weak", "worker", "B1", "short"), ("badrole", "Bad", "owner", "B1", "secret-pass")]:
        with pytest.raises(ValueError):
            create_user(*args, path=db)
    # Deactivation needs the acting admin's own password.
    for wrong in [None, "", "wrong-pass"]:
        with pytest.raises(ValueError, match="Your password is incorrect"):
            update_user(admin["id"], nurse["id"], "Nurse Ana", "worker", "Barangay 1", False, actor_password=wrong, path=db)
    assert get_user(nurse["id"], db) is not None
    username, changes = update_user(admin["id"], nurse["id"], "Nurse Ana R.", "worker", "Barangay 2", False,
                                    "reset-pass-1", actor_password="test-pass-123", path=db)
    assert username == "nurse.ana" and changes == ["name", "site", "status", "password reset"]
    assert get_user(nurse["id"], db) is None  # Disabled accounts lose their session.
    assert authenticate("nurse.ana", "reset-pass-1", db) is None
    update_user(admin["id"], nurse["id"], "Nurse Ana R.", "worker", "Barangay 2", True, path=db)
    assert authenticate("nurse.ana", "reset-pass-1", db)["site"] == "Barangay 2"
    assert {u["username"] for u in list_users(db)} == {"test-admin", "admin2", "test-worker", "nurse.ana"}


def test_admins_cannot_lock_everyone_out(tmp_path):
    from cerebra.auth import authenticate, ensure_default_users, update_user
    db = tmp_path / "users.sqlite3"
    ensure_default_users(db)
    admin = authenticate("test-admin", "test-pass-123", db)
    worker = authenticate("test-worker", "test-pass-123", db)
    for role, site, active in [("worker", "Site", True), ("admin", None, False)]:
        with pytest.raises(ValueError, match="your own account"):
            update_user(admin["id"], admin["id"], "Test Admin", role, site, active, path=db)
    # Promote then demote the worker: allowed while another admin stays active.
    update_user(admin["id"], worker["id"], "Test Worker", "admin", None, True, path=db)
    update_user(worker["id"], admin["id"], "Test Admin", "admin", None, False, actor_password="test-pass-123", path=db)
    with pytest.raises(ValueError, match="at least one active admin"):
        update_user(admin["id"], worker["id"], "Test Worker", "worker", "Site", True, path=db)


def test_workers_only_see_and_update_their_site(profile, tmp_path):
    db = tmp_path / "sites.sqlite3"
    ids = {}
    for site in ["Site A", "Site B"]:
        result = predict({**profile, "site": site})
        ids[site] = save_screening(result, f"token-{site}", db)
    assert len(list_screenings(db)) == 2
    assert [p["profile"]["site"] for p in list_screenings(db, site="Site A")] == ["Site A"]
    assert list_screenings(db, site="") == []
    with pytest.raises(ValueError):
        set_contacted(ids["Site B"], True, db, site="Site A")
    set_contacted(ids["Site A"], True, db, site="Site A")


def test_existing_user_tables_gain_sites(tmp_path):
    import sqlite3
    from cerebra.auth import authenticate, hash_password
    db = tmp_path / "old.sqlite3"
    with sqlite3.connect(db) as conn:  # Schema from before sites were added.
        conn.execute("""CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
            display_name TEXT NOT NULL, role TEXT NOT NULL, password_hash TEXT NOT NULL,
            active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL)""")
        conn.execute("INSERT INTO users VALUES (1, 'w', 'W', 'worker', ?, 1, 'now')", (hash_password("test-pass-123"),))
    assert authenticate("w", "test-pass-123", db)["site"] == "Local workspace"


def test_admin_can_delete_screenings_and_confirm_with_password(profile, tmp_path):
    from cerebra.auth import authenticate, ensure_default_users, verify_user_password
    from cerebra.database import delete_screening
    db = tmp_path / "delete.sqlite3"
    ensure_default_users(db)
    admin = authenticate("test-admin", "test-pass-123", db)
    assert verify_user_password(admin["id"], "test-pass-123", db)
    for wrong in ["wrong", "", None, 123, "x" * 101]:
        assert not verify_user_password(admin["id"], wrong, db)
    record = save_screening(predict(profile), "delete-token", db)
    delete_screening(record, db)
    assert list_screenings(db) == []
    for missing in [record, None, ["PT-1"]]:
        with pytest.raises(ValueError):
            delete_screening(missing, db)


def test_backups_restore_data_and_keep_a_safety_copy(profile, tmp_path):
    from cerebra.auth import authenticate, ensure_default_users
    from cerebra.backups import create_backup, list_backups, restore_backup, backup_dir
    db = tmp_path / "live.sqlite3"
    ensure_default_users(db)
    save_screening(predict(profile), "first", db)
    name = create_backup(db)
    assert create_backup(db) != name  # Same-second backups get unique names.
    save_screening(predict(profile), "second", db)
    assert len(list_screenings(db)) == 2
    safety = restore_backup(name, db)
    assert len(list_screenings(db)) == 1 and safety.endswith("-before-restore.sqlite3")
    assert authenticate("test-admin", "test-pass-123", db)  # Accounts come back with the data.
    items = {i["name"]: i for i in list_backups(db)}
    assert items[safety]["screenings"] == 2 and items[safety]["safety"] and items[name]["screenings"] == 1
    # Only well-formed names inside the backups folder can be restored.
    for bad in ["../live.sqlite3", "cerebra-20260101-000000.sqlite3", "notes.txt", None]:
        with pytest.raises(ValueError):
            restore_backup(bad, db)
    (backup_dir(db) / "cerebra-20260101-000000.sqlite3").write_text("not a database")
    with pytest.raises(ValueError, match="not a valid"):
        restore_backup("cerebra-20260101-000000.sqlite3", db)


def test_restore_refuses_backups_without_an_admin(tmp_path):
    from cerebra.auth import ensure_default_users
    from cerebra.backups import create_backup, restore_backup
    from cerebra.database import connect
    db = tmp_path / "live.sqlite3"
    ensure_default_users(db)
    with connect(db) as conn:
        conn.execute("UPDATE users SET active = 0 WHERE role = 'admin'")
    name = create_backup(db)
    with pytest.raises(ValueError, match="no active admin"):
        restore_backup(name, db)


def test_missing_first_run_password_becomes_a_random_logged_one(monkeypatch, tmp_path, caplog):
    import re
    from cerebra.auth import authenticate, ensure_default_users
    monkeypatch.delenv("CEREBRA_ADMIN_PASSWORD")
    db = tmp_path / "fresh.sqlite3"
    with caplog.at_level("WARNING"):
        ensure_default_users(db)
    password = re.search(r"admin account 'test-admin' with password ([\w-]+)\.", caplog.text).group(1)
    assert len(password) >= 12 and authenticate("test-admin", password, db)["role"] == "admin"
