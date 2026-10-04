"""Master Training & Benchmark Evaluation Pipeline for VayuDrishti NCR (Phase 4).

Trains and rigorously evaluates the three baseline models:
1. Naive Persistence Baseline
2. Statistical Diurnal + Rolling Baseline
3. LightGBM Direct Multi-Horizon Regressor

Generates:
- Comprehensive metrics (MAE, RMSE, R2, MBE) across horizons [+1h, +3h, +6h, +12h, +24h, +48h, +72h]
- Segmented metrics by pollution severity (Normal, High, Severe)
- Station-by-station performance breakdowns
- 8 publication-grade research plots in reports/figures/
- Serialized model artifacts in ml/models/artifacts/
"""

import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple
import matplotlib
matplotlib.use("Agg")  # Headless backend
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from ml.features.pipeline import generate_feature_dataset, TARGET_HORIZONS
from ml.features.leakage import DataLeakageAuditor
from ml.models.baselines import (
    NaivePersistenceModel,
    DiurnalRollingBaselineModel,
    LightGBMHorizonModel
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("vayudrishti.trainer")

ARTIFACTS_DIR = BASE_DIR / "ml" / "models" / "artifacts"
FIGURES_DIR = BASE_DIR / "reports" / "figures"
METADATA_DIR = BASE_DIR / "data" / "metadata"

ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
FIGURES_DIR.mkdir(parents=True, exist_ok=True)
METADATA_DIR.mkdir(parents=True, exist_ok=True)


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Calculates MAE, RMSE, R2, and MBE for valid pairs."""
    mask = ~np.isnan(y_true) & ~np.isnan(y_pred)
    if not np.any(mask):
        return {"mae": float("nan"), "rmse": float("nan"), "r2": float("nan"), "mbe": float("nan"), "count": 0}

    y_t = y_true[mask]
    y_p = y_pred[mask]

    mae = float(mean_absolute_error(y_t, y_p))
    rmse = float(np.sqrt(mean_squared_error(y_t, y_p)))
    r2 = float(r2_score(y_t, y_p)) if len(y_t) > 1 and np.var(y_t) > 1e-6 else float("nan")
    mbe = float(np.mean(y_p - y_t))

    return {
        "mae": round(mae, 2),
        "rmse": round(rmse, 2),
        "r2": round(r2, 4),
        "mbe": round(mbe, 2),
        "count": int(np.sum(mask))
    }


def run_pipeline():
    logger.info("Step 1: Generating feature dataset and auditing time-series leakage...")
    df, feature_cols, target_cols = generate_feature_dataset()

    logger.info("Step 2: Splitting dataset chronologically into Train (65%), Val (16%), Test (19%)...")
    df["timestamp_utc"] = pd.to_datetime(df["timestamp_utc"], utc=True)
    
    # Chronological Split Dates
    train_end = pd.to_datetime("2024-01-07 23:00:00+00:00")
    val_end = pd.to_datetime("2024-01-31 23:00:00+00:00")

    train_df = df[df["timestamp_utc"] <= train_end].copy()
    val_df = df[(df["timestamp_utc"] > train_end) & (df["timestamp_utc"] <= val_end)].copy()
    test_df = df[df["timestamp_utc"] > val_end].copy()

    # Enforce strict chronological separation
    DataLeakageAuditor.assert_chronological_splits(train_df, val_df, test_df)

    logger.info(f"Dataset Split Sizes -> Train: {len(train_df)} rows, Val: {len(val_df)} rows, Test: {len(test_df)} rows")

    logger.info("Step 3: Initializing and fitting Baseline 1 (Persistence) & Baseline 2 (Diurnal Statistical)...")
    persistence_model = NaivePersistenceModel()
    diurnal_model = DiurnalRollingBaselineModel(alpha=0.4)
    diurnal_model.fit(train_df)

    # Initialize results structures
    horizon_results = {
        "persistence": {},
        "diurnal_statistical": {},
        "lightgbm": {}
    }
    segmented_results = {
        "persistence": {},
        "diurnal_statistical": {},
        "lightgbm": {}
    }
    station_results = {}
    test_predictions_store = {}

    logger.info("Step 4: Training and evaluating across all target horizons [+1h to +72h]...")
    for h in TARGET_HORIZONS:
        target_col = f"target_{h}h"
        logger.info(f"--- Processing Horizon +{h}h (Target: {target_col}) ---")

        # Filter valid target rows for training and validation
        train_sub = train_df.dropna(subset=[target_col]).copy()
        val_sub = val_df.dropna(subset=[target_col]).copy()
        test_sub = test_df.dropna(subset=[target_col]).copy()

        y_test = test_sub[target_col].values

        # 1. Evaluate Persistence
        pred_persist = persistence_model.predict(test_sub, horizon=h)
        persist_metrics = compute_metrics(y_test, pred_persist)
        horizon_results["persistence"][f"+{h}h"] = persist_metrics

        # 2. Evaluate Diurnal Statistical
        pred_diurnal = diurnal_model.predict(test_sub, horizon=h)
        diurnal_metrics = compute_metrics(y_test, pred_diurnal)
        horizon_results["diurnal_statistical"][f"+{h}h"] = diurnal_metrics

        # 3. Train & Evaluate LightGBM
        lgb_model = LightGBMHorizonModel(horizon=h, feature_cols=feature_cols)
        lgb_model.fit(
            X_train=train_sub,
            y_train=train_sub[target_col],
            X_val=val_sub,
            y_val=val_sub[target_col]
        )
        # Save model artifact
        artifact_path = ARTIFACTS_DIR / f"lightgbm_h{h}.joblib"
        lgb_model.save(str(artifact_path))

        pred_lgb = lgb_model.predict(test_sub)
        lgb_metrics = compute_metrics(y_test, pred_lgb)
        horizon_results["lightgbm"][f"+{h}h"] = lgb_metrics

        logger.info(
            f"Horizon +{h}h -> "
            f"Persistence MAE: {persist_metrics['mae']:.2f} | "
            f"Diurnal MAE: {diurnal_metrics['mae']:.2f} | "
            f"LightGBM MAE: {lgb_metrics['mae']:.2f} (R2: {lgb_metrics['r2']:.3f})"
        )

        # Store test predictions for plotting and analysis
        test_sub[f"pred_persist_{h}h"] = pred_persist
        test_sub[f"pred_diurnal_{h}h"] = pred_diurnal
        test_sub[f"pred_lgb_{h}h"] = pred_lgb
        test_predictions_store[h] = test_sub

        # Segmented evaluation for key regulatory horizons (+1h, +24h, +72h)
        if h in [1, 24, 72]:
            segmented_results["persistence"][f"+{h}h"] = {
                "normal": compute_metrics(y_test[y_test <= 60], pred_persist[y_test <= 60]),
                "high": compute_metrics(y_test[(y_test > 60) & (y_test <= 120)], pred_persist[(y_test > 60) & (y_test <= 120)]),
                "severe": compute_metrics(y_test[y_test > 120], pred_persist[y_test > 120])
            }
            segmented_results["diurnal_statistical"][f"+{h}h"] = {
                "normal": compute_metrics(y_test[y_test <= 60], pred_diurnal[y_test <= 60]),
                "high": compute_metrics(y_test[(y_test > 60) & (y_test <= 120)], pred_diurnal[(y_test > 60) & (y_test <= 120)]),
                "severe": compute_metrics(y_test[y_test > 120], pred_diurnal[y_test > 120])
            }
            segmented_results["lightgbm"][f"+{h}h"] = {
                "normal": compute_metrics(y_test[y_test <= 60], pred_lgb[y_test <= 60]),
                "high": compute_metrics(y_test[(y_test > 60) & (y_test <= 120)], pred_lgb[(y_test > 60) & (y_test <= 120)]),
                "severe": compute_metrics(y_test[y_test > 120], pred_lgb[y_test > 120])
            }

    # Station-Level Evaluation for Day-Ahead Forecast (+24h)
    logger.info("Step 5: Computing station-by-station evaluation for Horizon +24h...")
    df_24 = test_predictions_store[24]
    for stn_code, stn_df in df_24.groupby("station_code"):
        y_stn = stn_df["target_24h"].values
        station_results[stn_code] = {
            "station_name": stn_df["station_name"].iloc[0],
            "persistence": compute_metrics(y_stn, stn_df["pred_persist_24h"].values),
            "diurnal_statistical": compute_metrics(y_stn, stn_df["pred_diurnal_24h"].values),
            "lightgbm": compute_metrics(y_stn, stn_df["pred_lgb_24h"].values)
        }

    # Save metrics manifest
    metrics_manifest = {
        "benchmark_dataset": "VayuDrishti-DelhiNCR-Winter2023-2024",
        "split": {
            "train": [str(train_df["timestamp_utc"].min()), str(train_end)],
            "val": [str(train_end), str(val_end)],
            "test": [str(val_end), str(test_df["timestamp_utc"].max())]
        },
        "horizons_evaluated": TARGET_HORIZONS,
        "horizon_results": horizon_results,
        "segmented_results": segmented_results,
        "station_results": station_results
    }
    metrics_file = METADATA_DIR / "baseline_evaluation_metrics.json"
    with open(metrics_file, "w", encoding="utf-8") as f:
        json.dump(metrics_manifest, f, indent=2)
    logger.info(f"Evaluation metrics saved to {metrics_file}")

    # Generate 8 Research Plots
    logger.info("Step 6: Generating 8 research publication plots...")
    generate_research_plots(df, train_df, val_df, test_df, test_predictions_store, horizon_results, station_results)

    logger.info("Pipeline execution completed successfully!")
    return metrics_manifest


def generate_research_plots(
    df: pd.DataFrame,
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
    test_preds: Dict[int, pd.DataFrame],
    horizon_results: Dict[str, Dict[str, Dict[str, float]]],
    station_results: Dict[str, Dict[str, Any]]
):
    """Generates the 8 rigorous research plots required by Phase 4."""
    plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")

    # Plot 1: PM2.5 Time Series with Train / Val / Test Partition
    fig, ax = plt.subplots(figsize=(14, 5))
    anand_df = df[df["station_code"] == "DL_ANAND_VIHAR"]
    ax.plot(anand_df["timestamp_utc"], anand_df["pm25_ugm3"], color="#64748b", alpha=0.6, label="Anand Vihar PM2.5")
    ax.axvspan(train_df["timestamp_utc"].min(), train_df["timestamp_utc"].max(), color="#3b82f6", alpha=0.15, label="Training Set (Oct 1 - Jan 7)")
    ax.axvspan(val_df["timestamp_utc"].min(), val_df["timestamp_utc"].max(), color="#f59e0b", alpha=0.15, label="Validation Set (Jan 8 - Jan 31)")
    ax.axvspan(test_df["timestamp_utc"].min(), test_df["timestamp_utc"].max(), color="#10b981", alpha=0.15, label="Test Set (Feb 1 - Feb 29)")
    ax.set_title("Delhi NCR Historical PM2.5 Time Series & Chronological Split (Winter 2023–2024)", fontsize=13, fontweight="bold")
    ax.set_ylabel("PM2.5 (µg/m³)")
    ax.set_xlabel("Date (UTC)")
    ax.legend(loc="upper left")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "pm25_time_series.png", dpi=150)
    plt.close()

    # Plot 2: Missing Data Distribution
    fig, ax = plt.subplots(figsize=(10, 5))
    missing_pct = df.isnull().mean() * 100
    top_missing = missing_pct.sort_values(ascending=False).head(15)
    top_missing.plot(kind="bar", color="#ef4444", ax=ax)
    ax.set_title("Missing Data Percentage by Variable (%)", fontsize=13, fontweight="bold")
    ax.set_ylabel("Missing Percentage (%)")
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "missing_data_distribution.png", dpi=150)
    plt.close()

    # Plot 3: Station PM2.5 Distribution
    fig, ax = plt.subplots(figsize=(10, 5))
    stations = df["station_code"].unique()
    data_by_stn = [df[df["station_code"] == s]["pm25_ugm3"].dropna() for s in stations]
    ax.boxplot(data_by_stn, tick_labels=[s.replace("DL_", "") for s in stations], patch_artist=True)
    ax.set_title("PM2.5 Concentration Distribution Across Delhi NCR Anchor Stations", fontsize=13, fontweight="bold")
    ax.set_ylabel("PM2.5 (µg/m³)")
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "station_distribution.png", dpi=150)
    plt.close()

    # Plot 4: Actual vs Predicted Scatter Plots (+1h, +24h, +72h)
    fig, axes = plt.subplots(1, 3, figsize=(16, 5))
    for idx, h in enumerate([1, 24, 72]):
        sub = test_preds[h]
        ax = axes[idx]
        y_act = sub[f"target_{h}h"].values
        y_pred = sub[f"pred_lgb_{h}h"].values
        ax.scatter(y_act, y_pred, alpha=0.25, color="#0ea5e9", s=12)
        max_val = max(np.nanmax(y_act), np.nanmax(y_pred), 300)
        ax.plot([0, max_val], [0, max_val], color="#ef4444", linestyle="--", linewidth=1.5, label="1:1 Ideal")
        ax.set_title(f"Horizon +{h}h (LightGBM)", fontsize=11, fontweight="bold")
        ax.set_xlabel("Actual PM2.5 (µg/m³)")
        ax.set_ylabel("Predicted PM2.5 (µg/m³)")
        ax.set_xlim(0, max_val)
        ax.set_ylim(0, max_val)
        ax.legend()
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "actual_vs_predicted.png", dpi=150)
    plt.close()

    # Plot 5: Error Distribution (Residuals at +24h)
    fig, ax = plt.subplots(figsize=(10, 5))
    sub_24 = test_preds[24]
    errors_lgb = sub_24["pred_lgb_24h"] - sub_24["target_24h"]
    errors_persist = sub_24["pred_persist_24h"] - sub_24["target_24h"]
    ax.hist(errors_persist, bins=60, range=(-150, 150), alpha=0.4, color="#64748b", label="Naive Persistence Residuals", density=True)
    ax.hist(errors_lgb, bins=60, range=(-150, 150), alpha=0.6, color="#0284c7", label="LightGBM Residuals", density=True)
    ax.axvline(0, color="#1e293b", linestyle="--")
    ax.set_title("Forecast Error Distribution at +24 Hours (Residual = Pred - Actual)", fontsize=13, fontweight="bold")
    ax.set_xlabel("Error (µg/m³)")
    ax.set_ylabel("Density")
    ax.legend()
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "error_distribution.png", dpi=150)
    plt.close()

    # Plot 6: Forecast Horizon Performance (MAE vs Lead Time)
    fig, ax = plt.subplots(figsize=(10, 5))
    horizons = TARGET_HORIZONS
    mae_persist = [horizon_results["persistence"][f"+{h}h"]["mae"] for h in horizons]
    mae_diurnal = [horizon_results["diurnal_statistical"][f"+{h}h"]["mae"] for h in horizons]
    mae_lgb = [horizon_results["lightgbm"][f"+{h}h"]["mae"] for h in horizons]

    ax.plot(horizons, mae_persist, marker="o", color="#64748b", linestyle="--", label="Baseline 1: Naive Persistence")
    ax.plot(horizons, mae_diurnal, marker="s", color="#f59e0b", linestyle="-.", label="Baseline 2: Diurnal Statistical")
    ax.plot(horizons, mae_lgb, marker="^", color="#0284c7", linewidth=2.0, label="Baseline 3: LightGBM Regressor")
    ax.set_title("Forecast Error Progression by Horizon (+1h to +72h)", fontsize=13, fontweight="bold")
    ax.set_xlabel("Lead Horizon (Hours)")
    ax.set_ylabel("Mean Absolute Error (µg/m³)")
    ax.set_xticks(horizons)
    ax.legend()
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "forecast_horizon_performance.png", dpi=150)
    plt.close()

    # Plot 7: Station-wise Performance at +24h
    fig, ax = plt.subplots(figsize=(10, 5))
    stn_codes = list(station_results.keys())
    x = np.arange(len(stn_codes))
    width = 0.25
    mae_stn_p = [station_results[s]["persistence"]["mae"] for s in stn_codes]
    mae_stn_d = [station_results[s]["diurnal_statistical"]["mae"] for s in stn_codes]
    mae_stn_l = [station_results[s]["lightgbm"]["mae"] for s in stn_codes]

    ax.bar(x - width, mae_stn_p, width, label="Persistence", color="#94a3b8")
    ax.bar(x, mae_stn_d, width, label="Diurnal Stat", color="#fcd34d")
    ax.bar(x + width, mae_stn_l, width, label="LightGBM", color="#0284c7")
    ax.set_xticks(x)
    ax.set_xticklabels([s.replace("DL_", "") for s in stn_codes])
    ax.set_title("Station-Wise Day-Ahead (+24h) MAE Comparison", fontsize=13, fontweight="bold")
    ax.set_ylabel("MAE (µg/m³)")
    ax.legend()
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "station_wise_performance.png", dpi=150)
    plt.close()

    # Plot 8: Pollution Event Analysis (Feb 2024 Test Set Smog Peak)
    fig, ax = plt.subplots(figsize=(14, 5))
    df_event = test_preds[24]
    anand_event = df_event[df_event["station_code"] == "DL_ANAND_VIHAR"].iloc[100:250]
    ax.plot(anand_event["timestamp_utc"], anand_event["target_24h"], color="#0f172a", linewidth=2.0, label="Observed PM2.5 (Truth)")
    ax.plot(anand_event["timestamp_utc"], anand_event["pred_persist_24h"], color="#94a3b8", linestyle="--", label="Persistence (+24h)")
    ax.plot(anand_event["timestamp_utc"], anand_event["pred_lgb_24h"], color="#0284c7", linewidth=2.0, label="LightGBM (+24h)")
    ax.set_title("Pollution Episode Tracking at Anand Vihar: Actual vs +24h Predicted", fontsize=13, fontweight="bold")
    ax.set_ylabel("PM2.5 (µg/m³)")
    ax.set_xlabel("Date (UTC)")
    ax.legend()
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "pollution_event_analysis.png", dpi=150)
    plt.close()

    logger.info("All 8 research plots successfully saved in reports/figures/")


if __name__ == "__main__":
    run_pipeline()
