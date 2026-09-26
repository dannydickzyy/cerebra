"""Reproducible experiments matching the PDF preprocessing and SMOTE workflow.

Model selection uses a validation subset of training data, never the held-out test.
Run: python train.py (inside the project virtual environment)
"""
import hashlib
import json
import platform
from datetime import datetime, timezone
from importlib.metadata import version

import joblib
import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, precision_score, recall_score, f1_score,
                             roc_auc_score, average_precision_score, confusion_matrix, roc_curve,
                             precision_recall_curve)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier

from cerebra.analytics import summarize
from cerebra.config import DATA_PATH, ARTIFACT_DIR, FEATURES, NUMERIC, CATEGORICAL, LABELS, SEED


def preprocessor():
    return ColumnTransformer([
        ("num", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]), NUMERIC),
        ("cat", Pipeline([("imputer", SimpleImputer(strategy="most_frequent")),
                          ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False))]), CATEGORICAL),
    ])


def metrics(y, score):
    labels = score >= .5
    tn, fp, fn, tp = confusion_matrix(y, labels, labels=[0, 1]).ravel()
    return {"accuracy": float(accuracy_score(y, labels)),
            "precision": float(precision_score(y, labels, zero_division=0)),
            "recall": float(recall_score(y, labels, zero_division=0)),
            "f1": float(f1_score(y, labels, zero_division=0)),
            "roc_auc": float(roc_auc_score(y, score)), "average_precision": float(average_precision_score(y, score)),
            "cm": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)}}


def distribution(y):
    return {str(k): int(v) for k, v in pd.Series(y).value_counts().sort_index().items()}


def main():
    ARTIFACT_DIR.mkdir(exist_ok=True)
    df = pd.read_csv(DATA_PATH)
    if list(df.columns) != ["id", *FEATURES, "stroke"]:
        raise ValueError("Unexpected CSV columns.")
    if not df.stroke.isin([0, 1]).all() or df.id.duplicated().any():
        raise ValueError("Invalid target or duplicate dataset identifiers.")
    X, y = df[FEATURES], df.stroke
    train, test = train_test_split(np.arange(len(df)), test_size=.2, random_state=SEED, stratify=y)
    fit, validation = train_test_split(train, test_size=.2, random_state=SEED, stratify=y.iloc[train])
    candidates = {
        "Logistic Regression + SMOTE": LogisticRegression(max_iter=1000, random_state=SEED),
        "Random Forest + SMOTE": RandomForestClassifier(n_estimators=100, random_state=SEED, n_jobs=4),
        "XGBoost + SMOTE": XGBClassifier(n_estimators=100, random_state=SEED, eval_metric="logloss", n_jobs=4),
    }
    print("Fitting preprocessing and SMOTE on selection-training rows only...", flush=True)
    prep_selection = preprocessor()
    fit_X = prep_selection.fit_transform(X.iloc[fit])
    balanced_X, balanced_y = SMOTE(random_state=SEED).fit_resample(fit_X, y.iloc[fit])
    val_X = prep_selection.transform(X.iloc[validation])
    selection = {}
    for name, model in candidates.items():
        estimator = clone(model).fit(balanced_X, balanced_y)
        selection[name] = metrics(y.iloc[validation], estimator.predict_proba(val_X)[:, 1])
        print(name, "validation recall", round(selection[name]["recall"], 4), flush=True)
    selected = max(selection, key=lambda name: (selection[name]["recall"], selection[name]["f1"], selection[name]["roc_auc"]))
    print("Selected using validation recall:", selected, flush=True)

    prep = preprocessor()
    train_X = prep.fit_transform(X.iloc[train])
    test_X = prep.transform(X.iloc[test])
    smote_X, smote_y = SMOTE(random_state=SEED).fit_resample(train_X, y.iloc[train])
    results, fitted = {}, {}
    for name, model in candidates.items():
        print("Training", name, flush=True)
        fitted[name] = clone(model).fit(smote_X, smote_y)
        results[name] = metrics(y.iloc[test], fitted[name].predict_proba(test_X)[:, 1])
        print(json.dumps(results[name]), flush=True)
    baseline = LogisticRegression(max_iter=1000, random_state=SEED).fit(train_X, y.iloc[train])
    results["Logistic Regression baseline"] = metrics(y.iloc[test], baseline.predict_proba(test_X)[:, 1])
    dataset_hash = hashlib.sha256(DATA_PATH.read_bytes()).hexdigest()
    stamp = datetime.now(timezone.utc).isoformat()
    model_version = hashlib.sha256((dataset_hash + stamp).encode()).hexdigest()[:12]
    background = X.iloc[train].sample(n=16, random_state=SEED).copy()
    bundle = {"preprocessor": prep, "model": fitted[selected], "name": selected,
              "version": model_version, "background": background}
    joblib.dump(bundle, ARTIFACT_DIR / "model.joblib", compress=3)

    # Permutation importance uses original features on a fixed held-out subset.
    rng = np.random.default_rng(SEED)
    ix = rng.choice(len(test), size=min(2000, len(test)), replace=False)
    importance_X = X.iloc[test[ix]].copy()
    importance_y = y.iloc[test[ix]]
    base_auc = roc_auc_score(importance_y, fitted[selected].predict_proba(prep.transform(importance_X))[:, 1])
    importance = []
    for feature in FEATURES:
        drops = []
        for _ in range(3):
            shuffled = importance_X.copy()
            shuffled[feature] = rng.permutation(shuffled[feature].values)
            auc = roc_auc_score(importance_y, fitted[selected].predict_proba(prep.transform(shuffled))[:, 1])
            drops.append(base_auc - auc)
        importance.append({"feature": feature, "label": LABELS[feature], "value": float(np.mean(drops)),
                           "std": float(np.std(drops))})
    importance.sort(key=lambda item: item["value"], reverse=True)
    scores = fitted[selected].predict_proba(test_X)[:, 1]
    fpr, tpr, _ = roc_curve(y.iloc[test], scores)
    precision, recall, _ = precision_recall_curve(y.iloc[test], scores)
    # Keep useful curve resolution without shipping every test prediction to the browser.
    def curve(a, b):
        indices = np.unique(np.linspace(0, len(a)-1, min(150, len(a))).astype(int))
        return {"x": a[indices].tolist(), "y": b[indices].tolist()}
    report = {"selected": selected, "version": model_version, "trained_at": stamp,
              "threshold": .5, "selection_rule": "Highest validation recall, then F1, then ROC-AUC; fixed 0.50 threshold",
              "results": results, "validation": selection, "importance": importance,
              "roc_curve": curve(fpr, tpr), "pr_curve": curve(recall, precision),
              "train_count": len(train), "test_count": len(test), "selection_fit_count": len(fit),
              "validation_count": len(validation), "train_distribution": distribution(y.iloc[train]),
              "test_distribution": distribution(y.iloc[test]), "smote_distribution": distribution(smote_y),
              "bmi_training_median": float(prep.named_transformers_["num"].named_steps["imputer"].statistics_[-1]),
              "dataset_sha256": dataset_hash, "features": FEATURES,
              "versions": {p: version(p) for p in ["pandas", "numpy", "scikit-learn", "imbalanced-learn", "xgboost"]},
              "python": platform.python_version(), "clinical_validation": False,
              "limitations": ["Synthetic data; no prospective or Filipino population validation.",
                  "Scores from SMOTE-trained models are not calibrated clinical probabilities.",
                  "Plain SMOTE interpolates one-hot and binary columns; exploratory replication of supplied PDF.",
                  "Feature effects explain model behavior, not causal medical risk.",
                  "Fixed 50% threshold is an experimental classification rule, not a clinical protocol."]}
    (ARTIFACT_DIR / "report.json").write_text(json.dumps(report, indent=2, allow_nan=False), encoding="utf-8")
    (ARTIFACT_DIR / "dataset_summary.json").write_text(json.dumps(summarize(df), indent=2, allow_nan=False), encoding="utf-8")
    np.savez_compressed(ARTIFACT_DIR / "split_indices.npz", train=train, test=test, selection_fit=fit, validation=validation)
    print("Saved model, metrics, dataset summary, and split audit.", flush=True)


if __name__ == "__main__":
    main()
