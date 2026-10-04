"""Forecasting Engine Service for ATMOSYNC (Phase 4).

Loads trained multi-horizon baseline models and generates real station forecasts
derived from actual historical observations and downscaled meteorology.
Computes official CPCB National AQI sub-indices for predicted particulate concentrations.
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from ml.models.baselines import LightGBMHorizonModel, NaivePersistenceModel
from services.ingestion.src.providers.aq_openaq import NAQI_BREAKPOINTS

logger = logging.getLogger("vayudrishti.forecast_engine")

def get_pm25_aqi_category(pm25_val: float):
    """Calculates official CPCB sub-index and category for PM2.5."""
    brackets = NAQI_BREAKPOINTS['PM2.5']
    aqi = 0
    for b_low, b_high, i_low, i_high in brackets:
        if b_low <= pm25_val <= b_high:
            sub = i_low + ((i_high - i_low) / (b_high - b_low)) * (pm25_val - b_low)
            aqi = int(round(sub))
            break
    else:
        if pm25_val > brackets[-1][1]:
            b_low, b_high, i_low, i_high = brackets[-1]
            slope = (i_high - i_low) / (b_high - b_low)
            sub = i_high + slope * (pm25_val - b_high)
            aqi = min(500, int(round(sub)))
        else:
            aqi = int(round(pm25_val))

    if aqi <= 50:
        cat = "Good"
    elif aqi <= 100:
        cat = "Satisfactory"
    elif aqi <= 200:
        cat = "Moderate"
    elif aqi <= 300:
        cat = "Poor"
    elif aqi <= 400:
        cat = "Very Poor"
    else:
        cat = "Severe"
    return aqi, cat

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
FEATURES_FILE = BASE_DIR / "data" / "features" / "delhi_ncr_features.csv"
ARTIFACTS_DIR = BASE_DIR / "ml" / "models" / "artifacts"
METRICS_FILE = BASE_DIR / "data" / "metadata" / "baseline_evaluation_metrics.json"

TARGET_HORIZONS = [1, 3, 6, 12, 24, 48, 72]


class BaselineForecastEngine:
    """Generates multi-horizon forecasts using trained LightGBM models."""

    def __init__(self):
        self.models: Dict[int, Any] = {}
        self.persistence = NaivePersistenceModel()
        self._load_models()

    def _load_models(self):
        """Loads trained LightGBM model artifacts if available on disk."""
        for h in TARGET_HORIZONS:
            model_path = ARTIFACTS_DIR / f"lightgbm_h{h}.joblib"
            if model_path.exists():
                try:
                    self.models[h] = LightGBMHorizonModel.load(str(model_path))
                    logger.info(f"Loaded LightGBM model for horizon +{h}h")
                except Exception as e:
                    logger.warning(f"Failed to load model +{h}h: {e}")
            else:
                logger.warning(f"No artifact found for +{h}h at {model_path}")

    def get_latest_station_forecast(self, station_code: str) -> Dict[str, Any]:
        """Generates 72-hour forecast curve for a station using latest feature row."""
        if not FEATURES_FILE.exists():
            return {
                "status": "DATA_UNAVAILABLE",
                "station_code": station_code,
                "message": "Feature matrix not found. Run training pipeline first."
            }

        df = pd.read_csv(FEATURES_FILE)
        stn_df = df[df["station_code"] == station_code].copy()
        if stn_df.empty:
            return {
                "status": "STATION_NOT_FOUND",
                "station_code": station_code,
                "message": f"No observation features found for station {station_code}."
            }

        stn_df.sort_values("timestamp_utc", inplace=True)
        latest_row = stn_df.iloc[-1:]  # Last observed row
        init_time = pd.to_datetime(latest_row["timestamp_utc"].values[0])
        current_pm25 = float(latest_row["pm25_lag_1h"].values[0])

        forecast_steps = []
        for h in TARGET_HORIZONS:
            target_time = init_time + pd.Timedelta(hours=h)
            
            # Predict using LightGBM if loaded, else fallback to Persistence
            if h in self.models:
                pred_val = float(self.models[h].predict(latest_row)[0])
                model_used = f"LightGBM (+{h}h)"
            else:
                pred_val = current_pm25
                model_used = "Naive Persistence"

            # Compute CPCB NAQI for the predicted PM2.5
            aqi_val, aqi_category = get_pm25_aqi_category(pred_val)

            forecast_steps.append({
                "horizon_hours": h,
                "target_time_utc": target_time.isoformat(),
                "predicted_pm25_ugm3": round(pred_val, 1),
                "derived_aqi": aqi_val,
                "aqi_category": aqi_category,
                "model_type": model_used
            })

        return {
            "status": "SUCCESS",
            "station_code": station_code,
            "station_name": latest_row["station_name"].values[0] if "station_name" in latest_row else station_code,
            "initialization_time_utc": init_time.isoformat(),
            "latest_observed_pm25": round(current_pm25, 1),
            "forecast_horizons": forecast_steps,
            "data_freshness": {
                "dataset_source": "Open-Meteo ERA5 Reanalysis & CAMS Atmospheric Composition",
                "last_pipeline_run": datetime.now(timezone.utc).isoformat(),
                "temporal_coverage": "Winter 2023-2024 Delhi NCR Benchmark"
            }
        }

    def get_models_metadata(self) -> Dict[str, Any]:
        """Returns model registry status and evaluation metrics."""
        metrics = {}
        if METRICS_FILE.exists():
            with open(METRICS_FILE, "r", encoding="utf-8") as f:
                metrics = json.load(f)

        return {
            "status": "OPERATIONAL",
            "active_models": [
                {
                    "name": "Naive Persistence Baseline",
                    "version": "v1.0.0-baseline-persistence",
                    "type": "Heuristic Zero-Order Hold",
                    "status": "ACTIVE"
                },
                {
                    "name": "Statistical Diurnal+Rolling Baseline",
                    "version": "v1.0.0-baseline-statistical",
                    "type": "Empirical Diurnal Climatology",
                    "status": "ACTIVE"
                },
                {
                    "name": "LightGBM Direct Multi-Horizon Regressor",
                    "version": "v1.0.0-baseline-lightgbm",
                    "type": "Gradient Boosted Decision Trees",
                    "horizons_loaded": list(self.models.keys()),
                    "status": "ACTIVE"
                }
            ],
            "benchmark_evaluation": metrics.get("horizon_results", {})
        }


# Singleton engine instance
engine = BaselineForecastEngine()
