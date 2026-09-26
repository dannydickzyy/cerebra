"""Descriptive statistics: observed dataset labels are not model predictions."""
import numpy as np
import pandas as pd


def grouped(frame, column, target="stroke"):
    result = frame.groupby(column, observed=False, dropna=False)[target].agg(["count", "sum", "mean"])
    return [{"label": str(label), "count": int(row["count"]), "positive": int(row["sum"]),
             "rate": round(float(row["mean"]) * 100, 3) if row["count"] else 0}
            for label, row in result.iterrows()]


def summarize(frame):
    df = frame.copy()
    df["age_band"] = pd.cut(df.age, [0, 30, 40, 50, 60, 70, np.inf],
                            labels=["18–29", "30–39", "40–49", "50–59", "60–69", "70+"], right=False)
    df["glucose_band"] = pd.cut(df.avg_glucose_level, [0, 90, 126, 161, 201, np.inf],
                                labels=["<90", "90–125", "126–160", "161–200", ">200"], right=False)
    df["bmi_band"] = pd.cut(df.bmi, [0, 18.5, 25, 30, 35, np.inf],
                           labels=["Under", "Normal", "Overweight", "Obese I", "Obese II+"], right=False)
    # Missing BMI stays explicitly missing in descriptive analytics; ML imputes separately.
    return {"rows": len(df), "positives": int(df.stroke.sum()),
            "prevalence": float(df.stroke.mean()), "missing_bmi": int(df.bmi.isna().sum()),
            "age": grouped(df, "age_band"), "glucose": grouped(df, "glucose_band"),
            "bmi": grouped(df.dropna(subset=["bmi"]), "bmi_band"),
            "smoking": grouped(df, "smoking_status"), "residence": grouped(df, "Residence_type"),
            "work": grouped(df, "work_type"), "gender": grouped(df, "gender"),
            "hypertension": grouped(df, "hypertension")}
