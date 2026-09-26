# CEREBRA · Stroke Risk Prediction & Health Analytics

A working **local academic prototype** based on the provided proposal, Model.pdf, Figma design, logo, and 50,000-row synthetic dataset.

The app uses **Python + Streamlit**, **HTML/CSS + Bootstrap + vanilla JavaScript**, and **SQLite**. Pandas and NumPy handle data preparation; scikit-learn, imbalanced-learn **SMOTE**, and XGBoost handle modeling. There is no React, Node, Flask, or npm requirement for the running app.

## Open the app

From this folder in PowerShell:

```powershell
.\.venv\Scripts\python -m streamlit run app.py
```

Open **http://localhost:8501**. Alternatively, run `./run.ps1`.

The supplied model is already trained. The app works offline after setup; Bootstrap, chart JavaScript, CSS, and the logo are local files. Only the external dataset-attribution link needs an internet connection.

## Features

- Dashboard with actual dataset distributions and a separate live-screening view.
- Prediction form with all 10 model features, decimal age, Unknown smoking status, and optional missing BMI.
- Real Python inference, experimental High/Low labels, and individual signed Shapley contributions.
- Explicit save to SQLite with duplicate-save protection and model-version retention.
- Patient name/ID search, risk/site/smoking/date filters, pagination, and filtered CSV export.
- Individual record details and persisted follow-up status.
- Population summaries computed from actual saved screenings and sites.
- Measured candidate-model metrics, confusion matrices, ROC and precision–recall curves, evaluation JSON export.
- Light/dark themes, collapsible sidebar, mobile layout, appearance preferences, and methodology help.

## Model results and limitations

The validation-selected research model is **Logistic Regression + SMOTE**. On the 10,000-row held-out test set:

| Metric | Measured result |
| --- | ---: |
| Accuracy | 51.46% |
| Precision | 4.74% |
| Recall | 47.22% |
| F1 | 0.0862 |
| ROC-AUC | 0.4932 |
| Average precision | 0.0498 |

These reproduce the supplied PDF's SMOTE logistic-regression findings. The proposal's **70% recall target is not met**. The dataset does not demonstrate useful class discrimination in these experiments. High accuracy from an unbalanced baseline mostly reflects predicting the majority class.

Scores are **uncalibrated model outputs**, not validated clinical probabilities or estimates of future stroke risk. The supplied data has no prediction time horizon. The 50% cutoff is an experimental classification rule. This prototype is not suitable for clinical decisions.

All app metrics come from generated artifacts or saved records. The attractive sample metrics, named patients, historical screening volumes, and named sites in the Figma export are not used as real data.

## Fresh setup

Use Python 3.13 (the tested version is 3.13.7):

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python train.py
.\.venv\Scripts\python -m streamlit run app.py
```

If the environment does not contain pip but system Python does:

```powershell
python -m pip --python .venv install -r requirements.txt
```

Training creates `artifacts/model.joblib`, `report.json`, `dataset_summary.json`, and `split_indices.npz`. **Restart Streamlit after retraining** to reload its cached model and report.

The artifact is a trusted local joblib file. Do not replace it with an untrusted uploaded pickle. Keep the pinned dependency versions when loading it; retrain when changing ML library versions.

## Methodology

1. Preserve the original CSV, exclude `id` and `stroke` from the 10 predictors.
2. Stratified 80/20 train/test split, random seed 42: 40,000 train and 10,000 test rows.
3. For model selection, split only the training portion into 32,000 fit and 8,000 validation rows. Fit preprocessing and SMOTE only on the selection-fit rows.
4. Compare Logistic Regression, Random Forest, and XGBoost with SMOTE. Select by validation recall, then F1, then ROC-AUC, at a fixed 0.50 cutoff.
5. Refit the chosen workflow and all comparison candidates on the full 40,000 training rows. Fit median imputation, scaling, and one-hot encoding on training only. SMOTE balances 38,058/1,942 rows to 38,058/38,058.
6. Evaluate each candidate on untouched test rows. Report an additional unbalanced logistic-regression baseline.
7. Save the selected estimator with its fitted preprocessor and 16 seeded training reference profiles.

Plain SMOTE after one-hot encoding intentionally follows the supplied PDF. It can interpolate encoded categorical and binary features into fractional values. This exploratory limitation is displayed in the app. SMOTENC is a sensible separate future experiment, rather than silently changing the method being reproduced.

Individual explanations enumerate all 1,024 subsets of the 10 original features and average predictions over 16 training reference profiles. The baseline plus signed contributions reconciles to the model score. This is interventional Shapley attribution with a sampled background; it does not preserve all feature correlations or establish causality.

Global importance is the mean ROC-AUC decrease across three feature permutations on a fixed 2,000-row held-out sample. Near-zero and negative effects must not be interpreted as medical importance rankings.

## Project layout

```text
app.py                         Streamlit host and server-side event handling
frontend/index.html            Custom component HTML
frontend/styles.css            Responsive design and themes
frontend/app.js                Vanilla JS views and Streamlit bridge
frontend/vendor/               Local Bootstrap and Plotly JavaScript
frontend/assets/logo.png       Provided CEREBRA logo
cerebra/config.py              Features, categories, ranges, and paths
cerebra/model.py               Validation, inference, Shapley explanations
cerebra/database.py            Parameterized SQLite persistence
cerebra/analytics.py           Descriptive source-data statistics
train.py                       Reproducible training and evaluation
data/stroke.csv                Original provided synthetic dataset
data/cerebra.sqlite3            Local screening database (created on first use)
artifacts/                     Trained model, measured metrics, split audit
tests/                         Backend and browser integration checks
docs/                          Methodology notes and UAT checklist
references/figma-original/      Original extracted React/Figma reference
```

The Figma source was preserved as a reference. Its environment-specific instructions and hardcoded model are not part of this runtime.

## Verification

```powershell
python -m pip --python .venv install -r requirements-dev.txt
.\.venv\Scripts\python -m pytest tests/test_core.py -q
.\.venv\Scripts\python tests/browser_smoke.py
```

The browser suite uses installed Microsoft Edge and a separate database/server on port 8502. It saves screenshots under `artifacts/browser-tests/`. It checks prediction, missing-BMI handling, save persistence, literal text rendering, CSV escaping, filters, follow-up, model pages, themes, and mobile layout. Intended-user acceptance testing still needs your team; a checklist is provided in `docs/UAT.md`.

## Local data

The server binds to `127.0.0.1` by default. This is a local prototype without authentication, role-based access, encryption at rest, or multi-organization isolation. Do not expose it publicly with real patient information. Use research aliases for demonstrations.

SQLite persists profiles, model scores, signed explanations, model versions, timestamps, and follow-up status. Browser storage contains appearance preferences and workspace display name only. There are no fake patients seeded into the production database.

For backup, stop the server and copy `data/cerebra.sqlite3` together with any companion `-wal`/`-shm` files if present. Keep model artifacts with the database for reproducibility. `CEREBRA_DB_PATH` can set a different local database path for tests or another research workspace.

## Attribution and references

- Dataset: Mohammed Borhan Uddin, *Synthetic Stroke Prediction Dataset*, Mendeley Data (2025), [DOI 10.17632/s2nh6fm925.1](https://doi.org/10.17632/s2nh6fm925.1), CC BY 4.0 as stated in the supplied proposal. The original dataset is preserved; preprocessing transformations are documented above.
- Design and logo: user-provided CEREBRA/Figma references.
- [Streamlit custom components](https://docs.streamlit.io/develop/concepts/custom-components/components-v1/intro) support the HTML/JavaScript interface and Python event bridge.
- [SMOTE documentation](https://imbalanced-learn.org/stable/references/generated/imblearn.over_sampling.SMOTE.html) and [SMOTENC](https://imbalanced-learn.org/stable/references/generated/imblearn.over_sampling.SMOTENC.html).
- Bootstrap 5.3.8 and Plotly.js are vendored with their original license headers.
