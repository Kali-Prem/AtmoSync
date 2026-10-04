"""Feature Engineering Pipeline for VayuDrishti NCR (Phase 4).

Generates time-causal atmospheric, chemical lag, rolling statistical,
temporal cyclical, and spatial features for multi-horizon PM2.5 forecasting.
Guarantees zero forward-looking leakage.
"""

import logging
import sys
from pathlib import Path
from typing import List, Tuple
import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from ml.features.leakage import DataLeakageAuditor

logger = logging.getLogger("vayudrishti.feature_pipeline")

PROCESSED_FILE = BASE_DIR / "data" / "processed" / "delhi_ncr_winter_2023_2024.csv"
FEATURES_DIR = BASE_DIR / "data" / "features"
FEATURES_DIR.mkdir(parents=True, exist_ok=True)

TARGET_HORIZONS = [1, 3, 6, 12, 24, 48, 72]


def build_features_for_station(df_station: pd.DataFrame) -> pd.DataFrame:
    """Builds lag, rolling, and target features for a single station's continuous time series."""
    df = df_station.copy()
    df.sort_values("timestamp_utc", inplace=True)
    df.reset_index(drop=True, inplace=True)

    # 1. Target Variables across all horizons (Forward Shifts: y(t+h))
    for h in TARGET_HORIZONS:
        df[f"target_{h}h"] = df["pm25_ugm3"].shift(-h)

    # 2. Historical Pollution Lags (Backward Shifts: y(t-l))
    # STRICT RULE: Only past values allowed (shift >= 1)
    df["pm25_lag_1h"] = df["pm25_ugm3"].shift(1)
    df["pm25_lag_3h"] = df["pm25_ugm3"].shift(3)
    df["pm25_lag_6h"] = df["pm25_ugm3"].shift(6)
    df["pm25_lag_12h"] = df["pm25_ugm3"].shift(12)
    df["pm25_lag_24h"] = df["pm25_ugm3"].shift(24)

    df["pm10_lag_1h"] = df["pm10_ugm3"].shift(1)
    df["pm10_lag_24h"] = df["pm10_ugm3"].shift(24)
    df["no2_lag_1h"] = df["no2_ugm3"].shift(1)
    df["co_lag_1h"] = df["co_mgm3"].shift(1)

    # 3. Backward-Looking Rolling Statistics (Using pm25_lag_1h to strictly avoid current t target leakage)
    # 6-hour rolling window on past observations
    df["pm25_rolling_mean_6h"] = df["pm25_lag_1h"].rolling(window=6, min_periods=3).mean()
    df["pm25_rolling_max_6h"] = df["pm25_lag_1h"].rolling(window=6, min_periods=3).max()
    df["pm25_rolling_std_6h"] = df["pm25_lag_1h"].rolling(window=6, min_periods=3).std().fillna(0.0)

    # 24-hour rolling window on past observations
    df["pm25_rolling_mean_24h"] = df["pm25_lag_1h"].rolling(window=24, min_periods=12).mean()
    df["pm25_rolling_max_24h"] = df["pm25_lag_1h"].rolling(window=24, min_periods=12).max()
    df["pm25_rolling_min_24h"] = df["pm25_lag_1h"].rolling(window=24, min_periods=12).min()

    # Rate of change / acceleration
    df["pm25_delta_1h"] = df["pm25_lag_1h"] - df["pm25_lag_3h"]

    # 4. Temporal Features (Cyclical Transformations)
    timestamps = pd.to_datetime(df["timestamp_utc"], utc=True)
    hours = timestamps.dt.hour
    dows = timestamps.dt.dayofweek
    months = timestamps.dt.month
    doys = timestamps.dt.dayofyear

    df["hour"] = hours
    df["hour_sin"] = np.sin(2 * np.pi * hours / 24.0)
    df["hour_cos"] = np.cos(2 * np.pi * hours / 24.0)
    df["day_of_week"] = dows
    df["dow_sin"] = np.sin(2 * np.pi * dows / 7.0)
    df["dow_cos"] = np.cos(2 * np.pi * dows / 7.0)
    df["day_of_year"] = doys
    df["month"] = months

    # 5. Atmospheric Inversion & Stability Features (Phase 5)
    # Binary presence flag and continuous positive strength
    df["inversion_present"] = (df["lapse_rate_c_100m"] > 0.0).astype(float)
    df["inversion_strength"] = np.clip(df["lapse_rate_c_100m"], 0.0, 10.0)
    
    # PBL volume contraction ratio relative to 1500m daytime reference
    df["pbl_contraction_ratio"] = 1500.0 / np.clip(df["pblh_m"], 20.0, 5000.0)

    # Cyclical wind components
    wind_rad = np.radians(df["wind_direction_10m_deg"])
    df["wind_dir_sin"] = np.sin(wind_rad)
    df["wind_dir_cos"] = np.cos(wind_rad)

    # Transport Alignment: Northwest wind (blowing toward SE ~135°) has maximum alignment (+1.0)
    # Wind direction indicates FROM where wind blows. Wind blowing from 315° (NW) blows towards 135° (SE).
    wind_to_rad = np.radians((df["wind_direction_10m_deg"] + 180.0) % 360.0)
    bearing_to_delhi_rad = np.radians(135.0)  # Northwest to Southeast corridor
    df["wind_transport_alignment"] = np.cos(wind_to_rad - bearing_to_delhi_rad)

    # 6. Meteorology Lagged / Stagnation Interactions
    # When wind speed is low and lapse rate is positive -> extreme stagnation
    df["stagnation_factor"] = (df["itsi"] / 100.0) / (df["wind_speed_10m_ms"] + 0.1)

    return df


def generate_feature_dataset() -> Tuple[pd.DataFrame, List[str], List[str]]:
    """Builds features for all stations, audits leakage, and saves feature matrix."""
    if not PROCESSED_FILE.exists():
        raise FileNotFoundError(f"Processed master file not found at {PROCESSED_FILE}")

    raw_df = pd.read_csv(PROCESSED_FILE)
    raw_df["timestamp_utc"] = pd.to_datetime(raw_df["timestamp_utc"], utc=True)

    station_dfs = []
    for stn_code, stn_group in raw_df.groupby("station_code"):
        logger.info(f"Generating features for station {stn_code} ({len(stn_group)} rows)...")
        stn_feat = build_features_for_station(stn_group)
        station_dfs.append(stn_feat)

    all_features_df = pd.concat(station_dfs, ignore_index=True)
    all_features_df.sort_values(["timestamp_utc", "station_code"], inplace=True)
    all_features_df.reset_index(drop=True, inplace=True)

    # Define Feature Columns (Input Predictors strictly observable at time t)
    feature_cols = [
        # Historical Pollution Lags
        "pm25_lag_1h", "pm25_lag_3h", "pm25_lag_6h", "pm25_lag_12h", "pm25_lag_24h",
        "pm10_lag_1h", "pm10_lag_24h", "no2_lag_1h", "co_lag_1h",
        # Rolling Statistics
        "pm25_rolling_mean_6h", "pm25_rolling_max_6h", "pm25_rolling_std_6h",
        "pm25_rolling_mean_24h", "pm25_rolling_max_24h", "pm25_rolling_min_24h",
        "pm25_delta_1h",
        # Surface & Boundary Layer Meteorology
        "temp_2m_c", "rh_2m_pct", "surface_pressure_hpa",
        "wind_speed_10m_ms", "wind_u_10m_ms", "wind_v_10m_ms",
        "wind_dir_sin", "wind_dir_cos", "wind_transport_alignment",
        "precip_mm", "pblh_m", "pbl_contraction_ratio",
        # Atmospheric Inversion Diagnostics (Phase 5)
        "lapse_rate_c_100m", "inversion_present", "inversion_strength",
        "itsi", "ventilation_index_m2s", "stagnation_factor",
        # Temporal Cyclical Embeddings
        "hour_sin", "hour_cos", "dow_sin", "dow_cos", "month",
        # Geographic Metadata
        "latitude", "longitude", "elevation_m"
    ]

    target_cols = [f"target_{h}h" for h in TARGET_HORIZONS]

    # Run Automated Leakage Audit
    DataLeakageAuditor.assert_no_target_in_features(feature_cols, target_cols)

    # Save features table
    feature_csv = FEATURES_DIR / "delhi_ncr_features.csv"
    all_features_df.to_csv(feature_csv, index=False)
    logger.info(f"Feature dataset generated successfully: {all_features_df.shape} -> {feature_csv}")

    return all_features_df, feature_cols, target_cols


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    df, f_cols, t_cols = generate_feature_dataset()
    print("Features count:", len(f_cols))
    print("Feature columns:", f_cols)
    print("Target columns:", t_cols)
    print("Sample row target vs lags:")
    print(df[["timestamp_utc", "station_code", "pm25_lag_1h", "target_1h", "target_24h"]].head())
