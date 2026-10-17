from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[1]


def _load_env_file(path=ROOT / ".env"):
    """Read KEY=VALUE lines from the local .env file (ignored by git); real env vars win."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        key, sep, value = line.strip().partition("=")
        if sep and key and not key.startswith("#"):
            os.environ.setdefault(key.strip(), value.strip().strip("'\""))


_load_env_file()
DATA_PATH = ROOT / "data" / "stroke.csv"
ARTIFACT_DIR = ROOT / "artifacts"
DB_PATH = Path(os.environ.get("CEREBRA_DB_PATH", ROOT / "data" / "cerebra.sqlite3"))
FEATURES = ["gender", "age", "hypertension", "heart_disease", "ever_married",
            "work_type", "Residence_type", "avg_glucose_level", "bmi", "smoking_status"]
NUMERIC = ["age", "hypertension", "heart_disease", "avg_glucose_level", "bmi"]
CATEGORICAL = ["gender", "ever_married", "work_type", "Residence_type", "smoking_status"]
CATEGORIES = {
    "gender": ["Female", "Male"],
    "ever_married": ["No", "Yes"],
    "work_type": ["Private", "Self-employed", "Govt_job", "Children"],
    "Residence_type": ["Urban", "Rural"],
    "smoking_status": ["never smoked", "formerly smoked", "smokes", "Unknown"],
}
LABELS = {"gender": "Gender", "age": "Age", "hypertension": "Hypertension",
          "heart_disease": "Heart disease", "ever_married": "Ever married",
          "work_type": "Work type", "Residence_type": "Residence",
          "avg_glucose_level": "Avg. glucose", "bmi": "BMI", "smoking_status": "Smoking status"}
THRESHOLD = 0.5
SEED = 42
