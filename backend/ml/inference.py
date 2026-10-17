from pathlib import Path
from typing import Dict, Any, Optional
import numpy as np
import pandas as pd
import joblib

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
REGRESSOR_PATH = ARTIFACTS_DIR / "productivity_regressor.joblib"
CLUSTERER_PATH = ARTIFACTS_DIR / "habit_clusterer.joblib"

_regressor = None
_cluster_artifact = None

def get_regressor():
    global _regressor
    if _regressor is None and REGRESSOR_PATH.exists():
        _regressor = joblib.load(REGRESSOR_PATH)
    return _regressor

def get_clusterer():
    global _cluster_artifact
    if _cluster_artifact is None and CLUSTERER_PATH.exists():
        _cluster_artifact = joblib.load(CLUSTERER_PATH)
    return _cluster_artifact

def simulate_routine(
    total_screen_time: float,
    active_work: float,
    social_media: float,
    entertainment: float,
    late_night: float,
    break_count: int,
    avg_break_duration: int,
    age_group: str = "25-34",
    occupation: str = "Software Engineer"
) -> Dict[str, Any]:
    regressor = get_regressor()
    if not regressor:
        raise RuntimeError("ML Regression model is not available. Ensure training has completed.")

    row_data = {
        "Total_Screen_Time_Hrs": [float(total_screen_time)],
        "Active_Work_Hrs": [float(active_work)],
        "Social_Media_Hrs": [float(social_media)],
        "Entertainment_Hrs": [float(entertainment)],
        "Late_Night_Usage_Hrs": [float(late_night)],
        "Break_Count": [int(break_count)],
        "Avg_Break_Duration_Mins": [int(avg_break_duration)],
        "Age_Group": [str(age_group)],
        "Occupation": [str(occupation)]
    }
    df = pd.DataFrame(row_data)
    pred_score = float(regressor.predict(df)[0])
    clamped_score = max(0.0, min(100.0, round(pred_score, 1)))

    # Feature contribution heuristics based on Ridge weights or delta from neutral baseline
    # Neutral reference
    ref_data = {
        "Total_Screen_Time_Hrs": [7.0],
        "Active_Work_Hrs": [4.0],
        "Social_Media_Hrs": [1.5],
        "Entertainment_Hrs": [1.5],
        "Late_Night_Usage_Hrs": [1.0],
        "Break_Count": [5],
        "Avg_Break_Duration_Mins": [15],
        "Age_Group": [str(age_group)],
        "Occupation": [str(occupation)]
    }
    ref_score = float(regressor.predict(pd.DataFrame(ref_data))[0])
    delta_from_baseline = round(clamped_score - ref_score, 1)

    # Key drivers explanation
    drivers = []
    if active_work >= 5.0:
        drivers.append("Strong active work/study duration contributes positively to output.")
    elif active_work < 2.5:
        drivers.append("Low active work hours limit direct task output.")

    if late_night > 2.0:
        drivers.append("Elevated late-night screen time has a negative impact on routine stability.")
    elif late_night <= 0.5:
        drivers.append("Minimal late-night screen use protects restorative focus.")

    if break_count >= 5 and 10 <= avg_break_duration <= 25:
        drivers.append("Regular, moderate break intervals support sustainable cognitive pacing.")
    elif break_count <= 2:
        drivers.append("Low break frequency risks mental fatigue during extended screen blocks.")

    return {
        "predicted_productivity_score": clamped_score,
        "delta_from_reference": delta_from_baseline,
        "contributing_factors": drivers,
        "confidence_band": {
            "lower": max(0.0, round(clamped_score - 8.84, 1)),  # MAE margin
            "upper": min(100.0, round(clamped_score + 8.84, 1))
        }
    }

def profile_habit(
    total_screen_time: float,
    active_work: float,
    social_media: float,
    entertainment: float,
    late_night: float,
    break_count: int,
    avg_break_duration: int
) -> Dict[str, Any]:
    clusterer = get_clusterer()
    if not clusterer:
        raise RuntimeError("Habit Clustering model is not available. Ensure training has completed.")

    scaler = clusterer["scaler"]
    kmeans = clusterer["kmeans"]
    profiles = clusterer["profiles"]

    df_vector = pd.DataFrame([{
        "Total_Screen_Time_Hrs": float(total_screen_time),
        "Active_Work_Hrs": float(active_work),
        "Social_Media_Hrs": float(social_media),
        "Entertainment_Hrs": float(entertainment),
        "Late_Night_Usage_Hrs": float(late_night),
        "Break_Count": float(break_count),
        "Avg_Break_Duration_Mins": float(avg_break_duration)
    }])

    scaled_vector = scaler.transform(df_vector)
    cluster_id = int(kmeans.predict(scaled_vector)[0])
    centroid = kmeans.cluster_centers_[cluster_id]
    distance = float(np.linalg.norm(scaled_vector[0] - centroid))

    profile_info = profiles.get(cluster_id, {
        "name": "Custom Profile",
        "description": "Routine pattern analyzed across digital activity indicators.",
        "averages": {}
    })

    # Anomaly / Drift threshold: euclidean distance > 2.2 standard deviations
    is_drift = distance > 2.2

    return {
        "cluster_id": cluster_id,
        "archetype_name": profile_info["name"],
        "description": profile_info["description"],
        "distance_to_center": round(distance, 2),
        "is_routine_drift": is_drift,
        "cluster_benchmark_averages": profile_info.get("averages", {})
    }
