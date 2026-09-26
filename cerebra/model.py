"""Validated model inference and per-person probability-scale Shapley explanations."""
from functools import lru_cache
from math import comb
import numbers

import joblib
import numpy as np
import pandas as pd

from .config import ARTIFACT_DIR, CATEGORIES, FEATURES, LABELS, THRESHOLD


def validate_profile(raw):
    if not isinstance(raw, dict):
        raise ValueError("Patient profile must be an object.")
    profile = {}
    for key, (low, high) in {"age": (18, 90), "avg_glucose_level": (70.01, 250), "bmi": (15, 40)}.items():
        value = raw.get(key)
        if key == "bmi" and value is None:
            profile[key] = None
            continue
        if isinstance(value, bool) or not isinstance(value, numbers.Real) or not np.isfinite(value):
            raise ValueError(f"{LABELS[key]} must be a finite number.")
        if not low <= value <= high:
            raise ValueError(f"{LABELS[key]} must be between {low} and {high}, the dataset's supported range.")
        profile[key] = float(value)
    for key in ["hypertension", "heart_disease"]:
        if raw.get(key) not in [0, 1] or not isinstance(raw.get(key), (int, bool)):
            raise ValueError(f"Select Yes or No for {LABELS[key]}.")
        profile[key] = int(raw[key])
    for key, categories in CATEGORIES.items():
        if raw.get(key) not in categories:
            raise ValueError(f"Select a supported value for {LABELS[key]}.")
        profile[key] = raw[key]
    for key, limit, fallback in [("name", 100, "Unnamed participant"), ("site", 100, "Local workspace")]:
        value = raw.get(key, fallback)
        if not isinstance(value, str) or len(value.strip()) > limit or any(ord(c) < 32 for c in value):
            raise ValueError(f"{key.capitalize()} must be plain text up to {limit} characters.")
        profile[key] = value.strip() or fallback
    return profile


@lru_cache(maxsize=1)
def load_bundle():
    # Only load the locally generated trusted artifact, never a user-uploaded pickle.
    return joblib.load(ARTIFACT_DIR / "model.joblib")


def predict_frame(bundle, frame):
    return bundle["model"].predict_proba(bundle["preprocessor"].transform(frame[FEATURES]))[:, 1]


def explain(bundle, profile):
    """Exact subset enumeration over 10 features, averaged over 16 training references.

    This is interventional Shapley attribution of model output, not causal evidence.
    Correlations are not preserved by feature replacement. Reference integration is sampled.
    """
    background = bundle["background"][FEATURES].copy()
    count, width = len(background), len(FEATURES)
    frames = []
    for mask in range(1 << width):
        mixed = background.copy()
        for j, feature in enumerate(FEATURES):
            if mask & (1 << j):
                mixed[feature] = np.nan if profile[feature] is None else profile[feature]
        frames.append(mixed)
    values = predict_frame(bundle, pd.concat(frames, ignore_index=True)).reshape(-1, count).mean(axis=1)
    contributions = []
    for j, feature in enumerate(FEATURES):
        effect = sum((values[mask | (1 << j)] - values[mask]) /
                     (width * comb(width - 1, mask.bit_count()))
                     for mask in range(1 << width) if not mask & (1 << j))
        contributions.append({"feature": feature, "label": LABELS[feature], "value": float(effect)})
    contributions.sort(key=lambda x: abs(x["value"]), reverse=True)
    return {"baseline": float(values[0]), "contributions": contributions,
            "reference_count": count, "method": "Interventional Shapley; exact subsets, sampled training background"}


def predict(raw, bundle=None):
    profile = validate_profile(raw)
    bundle = bundle or load_bundle()
    frame = pd.DataFrame([profile])[FEATURES].replace({None: np.nan})
    probability = float(predict_frame(bundle, frame)[0])
    explanation = explain(bundle, profile)
    return {"profile": profile, "score": probability, "risk": "High" if probability >= THRESHOLD else "Low",
            "threshold": THRESHOLD, "model": bundle["name"], "model_version": bundle["version"],
            "explanation": explanation}
