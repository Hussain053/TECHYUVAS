import json
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.cluster import KMeans
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
import joblib

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "dataset.csv"
ARTIFACTS_DIR = BASE_DIR / "ml" / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

def train_and_evaluate():
    print(f"Loading dataset from: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    print(f"Dataset shape: {df.shape[0]} rows, {df.shape[1]} columns")

    num_features = [
        "Total_Screen_Time_Hrs",
        "Active_Work_Hrs",
        "Social_Media_Hrs",
        "Entertainment_Hrs",
        "Late_Night_Usage_Hrs",
        "Break_Count",
        "Avg_Break_Duration_Mins"
    ]
    cat_features = ["Age_Group", "Occupation"]
    target_col = "Productivity_Score_100"

    X = df[num_features + cat_features]
    y = df[target_col]

    # 80/20 train/test split with fixed random_state for reproducibility
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), num_features),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_features),
        ]
    )

    # 1. Dummy Baseline
    dummy_pipe = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", DummyRegressor(strategy="mean"))
    ])
    dummy_pipe.fit(X_train, y_train)
    dummy_preds = dummy_pipe.predict(X_test)
    dummy_mae = mean_absolute_error(y_test, dummy_preds)
    dummy_rmse = root_mean_squared_error(y_test, dummy_preds)
    dummy_r2 = r2_score(y_test, dummy_preds)

    # 2. Linear Baseline (Ridge)
    ridge_pipe = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", Ridge(alpha=1.0))
    ])
    ridge_pipe.fit(X_train, y_train)
    ridge_preds = ridge_pipe.predict(X_test)
    ridge_mae = mean_absolute_error(y_test, ridge_preds)
    ridge_rmse = root_mean_squared_error(y_test, ridge_preds)
    ridge_r2 = r2_score(y_test, ridge_preds)

    # 3. Random Forest Regressor
    rf_pipe = Pipeline([
        ("preprocessor", preprocessor),
        ("regressor", RandomForestRegressor(n_estimators=150, max_depth=7, random_state=42))
    ])
    rf_pipe.fit(X_train, y_train)
    rf_preds = rf_pipe.predict(X_test)
    rf_mae = mean_absolute_error(y_test, rf_preds)
    rf_rmse = root_mean_squared_error(y_test, rf_preds)
    rf_r2 = r2_score(y_test, rf_preds)

    print("=== Supervised Regression Results on Test Set (50 samples) ===")
    print(f"Dummy Baseline: MAE={dummy_mae:.2f}, RMSE={dummy_rmse:.2f}, R2={dummy_r2:.4f}")
    print(f"Ridge Baseline: MAE={ridge_mae:.2f}, RMSE={ridge_rmse:.2f}, R2={ridge_r2:.4f}")
    print(f"Random Forest:  MAE={rf_mae:.2f}, RMSE={rf_rmse:.2f}, R2={rf_r2:.4f}")

    # Select winning model
    best_pipe = rf_pipe if rf_r2 >= ridge_r2 else ridge_pipe
    model_name = "RandomForestRegressor" if best_pipe == rf_pipe else "Ridge"

    # Save regression pipeline
    regressor_path = ARTIFACTS_DIR / "productivity_regressor.joblib"
    joblib.dump(best_pipe, regressor_path)
    print(f"Saved winning regression model ({model_name}) to {regressor_path}")

    # 4. Unsupervised Habit Profiling (KMeans Clustering on numerical habits)
    cluster_features = num_features
    scaler = StandardScaler()
    X_cluster_scaled = scaler.fit_transform(df[cluster_features])

    kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
    df["cluster"] = kmeans.fit_predict(X_cluster_scaled)

    # Calculate cluster profiles
    cluster_profiles = {}
    cluster_labels = {
        0: "Balanced Pacer",
        1: "Deep Work Sprint",
        2: "Late-Night Crunch Risk",
        3: "Leisure / Fragmented Day"
    }

    # Inspect centroids to map appropriate archetype names
    centroids = kmeans.cluster_centers_
    # Let's inspect centroid means per feature
    cluster_summary = df.groupby("cluster")[cluster_features + [target_col]].mean().to_dict(orient="index")

    for c_id, stats in cluster_summary.items():
        # Tag name based on active work and late night
        if stats["Late_Night_Usage_Hrs"] > 2.0:
            name = "Late-Night Crunch & Fatigue Risk"
            desc = "Characterized by elevated late-night hours and reduced rest intervals."
        elif stats["Active_Work_Hrs"] > 5.5 and stats["Break_Count"] >= 5:
            name = "High-Focus & Rest-Balanced"
            desc = "Characterized by solid active study/work hours with consistent breaks."
        elif stats["Social_Media_Hrs"] + stats["Entertainment_Hrs"] > 3.0:
            name = "High Entertainment & Distraction Drift"
            desc = "Higher proportion of screen time allocated to leisure and social media."
        else:
            name = "Moderate & Sustainable Routine"
            desc = "Paced daily activity within standard baseline boundaries."

        cluster_profiles[int(c_id)] = {
            "name": name,
            "description": desc,
            "averages": {k: round(v, 2) for k, v in stats.items()}
        }

    cluster_artifact = {
        "scaler": scaler,
        "kmeans": kmeans,
        "features": cluster_features,
        "profiles": cluster_profiles
    }
    cluster_path = ARTIFACTS_DIR / "habit_clusterer.joblib"
    joblib.dump(cluster_artifact, cluster_path)
    print(f"Saved habit clustering model to {cluster_path}")

    # 5. Save metrics metadata
    metrics = {
        "dataset_rows": int(df.shape[0]),
        "dataset_cols": int(df.shape[1]),
        "features": num_features + cat_features,
        "numerical_features": num_features,
        "categorical_features": cat_features,
        "test_size": 0.20,
        "test_samples": int(len(y_test)),
        "models": {
            "dummy_baseline": {
                "mae": round(dummy_mae, 2),
                "rmse": round(dummy_rmse, 2),
                "r2": round(dummy_r2, 4)
            },
            "ridge_regression": {
                "mae": round(ridge_mae, 2),
                "rmse": round(ridge_rmse, 2),
                "r2": round(ridge_r2, 4)
            },
            "random_forest": {
                "mae": round(rf_mae, 2),
                "rmse": round(rf_rmse, 2),
                "r2": round(rf_r2, 4)
            }
        },
        "selected_model": model_name,
        "selected_metrics": {
            "mae": round(rf_mae if model_name == "RandomForestRegressor" else ridge_mae, 2),
            "rmse": round(rf_rmse if model_name == "RandomForestRegressor" else ridge_rmse, 2),
            "r2": round(rf_r2 if model_name == "RandomForestRegressor" else ridge_r2, 4)
        },
        "habit_clusters": cluster_profiles
    }

    metrics_path = ARTIFACTS_DIR / "metrics.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    print(f"Saved evaluation metrics to {metrics_path}")

if __name__ == "__main__":
    train_and_evaluate()
