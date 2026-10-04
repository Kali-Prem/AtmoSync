"""Baseline Models Implementation for VayuDrishti NCR (Phase 4).

Implements three required benchmark approaches:
1. BASELINE 1: Naive Persistence (y_hat(t+h) = y(t))
2. BASELINE 2: Statistical 24-Hour Diurnal + Rolling Mean
3. BASELINE 3: Machine Learning (Direct Multi-Horizon LightGBM)
"""

import logging
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
import lightgbm as lgb
import joblib

logger = logging.getLogger("vayudrishti.baselines")


class NaivePersistenceModel:
    """Baseline 1: Persists the latest observed PM2.5 value across all lead horizons."""

    def __init__(self, model_version: str = "v1.0.0-baseline-persistence"):
        self.model_name = "Naive Persistence"
        self.model_version = model_version

    def predict(self, df: pd.DataFrame, horizon: int) -> np.ndarray:
        """Predicts y(t+h) using pm25_lag_1h (latest observation at t)."""
        return df["pm25_lag_1h"].values


class DiurnalRollingBaselineModel:
    """Baseline 2: Statistical hybrid of station-specific diurnal hour profile and 24h rolling mean."""

    def __init__(self, alpha: float = 0.5, model_version: str = "v1.0.0-baseline-statistical"):
        self.model_name = "Statistical Diurnal+Rolling"
        self.model_version = model_version
        self.alpha = alpha
        self.diurnal_profiles: Dict[str, Dict[int, float]] = {}

    def fit(self, train_df: pd.DataFrame) -> None:
        """Computes mean PM2.5 per station per hour-of-day on the training set."""
        for stn_code, stn_group in train_df.groupby("station_code"):
            self.diurnal_profiles[stn_code] = (
                stn_group.groupby("hour")["pm25_ugm3"].mean().to_dict()
            )
        logger.info(f"Fitted diurnal profiles for {len(self.diurnal_profiles)} stations.")

    def predict(self, df: pd.DataFrame, horizon: int) -> np.ndarray:
        """Forecasts t+h combining diurnal profile at target hour and rolling mean."""
        preds = []
        for _, row in df.iterrows():
            stn = row["station_code"]
            curr_hour = int(row["hour"])
            target_hour = (curr_hour + horizon) % 24
            diurnal_val = self.diurnal_profiles.get(stn, {}).get(target_hour, row["pm25_lag_1h"])
            rolling_val = row["pm25_rolling_mean_24h"]
            if pd.isna(rolling_val):
                rolling_val = row["pm25_lag_1h"]
            pred = self.alpha * diurnal_val + (1.0 - self.alpha) * rolling_val
            preds.append(max(0.0, pred))
        return np.array(preds)


class LightGBMHorizonModel:
    """Baseline 3: Direct multi-horizon LightGBM gradient boosted decision tree ensemble."""

    def __init__(
        self,
        horizon: int,
        feature_cols: List[str],
        params: Optional[Dict[str, Any]] = None,
        model_version: str = "v1.0.0-baseline-lightgbm"
    ):
        self.model_name = f"LightGBM (+{horizon}h)"
        self.model_version = model_version
        self.horizon = horizon
        self.feature_cols = feature_cols
        self.params = params or {
            "objective": "regression",
            "metric": "mae",
            "boosting_type": "gbdt",
            "n_estimators": 150,
            "learning_rate": 0.05,
            "num_leaves": 31,
            "max_depth": 6,
            "min_child_samples": 20,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "random_state": 42,
            "verbosity": -1,
            "n_jobs": -1
        }
        self.model = lgb.LGBMRegressor(**self.params)
        self.is_trained = False

    def fit(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_val: Optional[pd.DataFrame] = None,
        y_val: Optional[pd.Series] = None
    ) -> None:
        """Trains LightGBM regressor on training partition with early stopping on validation."""
        valid_sets = None
        callbacks = None
        if X_val is not None and y_val is not None:
            valid_sets = [(X_val[self.feature_cols], y_val)]
            callbacks = [lgb.early_stopping(stopping_rounds=15, verbose=False)]

        self.model.fit(
            X_train[self.feature_cols],
            y_train,
            eval_set=valid_sets,
            callbacks=callbacks
        )
        self.is_trained = True

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Generates PM2.5 concentration predictions enforcing physical non-negativity."""
        if not self.is_trained:
            raise RuntimeError(f"Model for horizon +{self.horizon}h is not trained yet.")
        raw_preds = self.model.predict(X[self.feature_cols])
        # Inviolable Physical Non-Negativity Guardrail
        return np.clip(raw_preds, a_min=0.0, a_max=1200.0)

    def save(self, filepath: str) -> None:
        """Saves model to disk using joblib."""
        joblib.dump(self, filepath)

    @classmethod
    def load(cls, filepath: str) -> "LightGBMHorizonModel":
        """Loads model artifact from disk."""
        return joblib.load(filepath)
