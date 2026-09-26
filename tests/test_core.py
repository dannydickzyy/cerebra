import json

import numpy as np
import pandas as pd
import pytest

from cerebra.config import ARTIFACT_DIR, DATA_PATH, FEATURES
from cerebra.database import list_screenings, save_screening, set_contacted
from cerebra.model import load_bundle, predict, validate_profile


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
