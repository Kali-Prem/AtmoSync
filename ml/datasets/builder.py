"""Dataset Builder for ATMOSYNC (SIH-26082 Phase 4).

Loads raw weather and atmospheric composition JSON files from data/raw/,
applies quality validation, converts units, computes physical inversion
and ventilation diagnostics, and creates clean interim and processed datasets.
"""

import json
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from scientific.preprocessing.inversion import InversionDiagnostics

logger = logging.getLogger("vayudrishti.dataset_builder")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
INTERIM_DIR = BASE_DIR / "data" / "interim"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
SEEDS_FILE = BASE_DIR / "database" / "seeds" / "001_delhi_stations.json"

INTERIM_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


def load_station_metadata() -> Dict[str, Dict[str, Any]]:
    """Load metadata mapping station_code to attributes."""
    if not SEEDS_FILE.exists():
        return {}
    with open(SEEDS_FILE, "r", encoding="utf-8") as f:
        stations = json.load(f)
    return {s["station_code"]: s for s in stations}


def process_station_raw(
    station_code: str,
    station_meta: Dict[str, Any],
    start_date: str = "2023-10-01",
    end_date: str = "2024-02-29"
) -> Optional[pd.DataFrame]:
    """Parse raw weather and air quality JSON files into a normalized station DataFrame."""
    weather_file = RAW_DIR / f"{station_code}_weather_{start_date}_{end_date}.json"
    aq_file = RAW_DIR / f"{station_code}_airquality_{start_date}_{end_date}.json"

    if not weather_file.exists() or not aq_file.exists():
        logger.warning(f"Missing raw files for station {station_code}")
        return None

    with open(weather_file, "r", encoding="utf-8") as f:
        w_data = json.load(f)
    with open(aq_file, "r", encoding="utf-8") as f:
        aq_data = json.load(f)

    w_hourly = w_data.get("hourly", {})
    aq_hourly = aq_data.get("hourly", {})

    w_df = pd.DataFrame(w_hourly)
    aq_df = pd.DataFrame(aq_hourly)

    if w_df.empty or aq_df.empty:
        logger.error(f"Empty hourly data for station {station_code}")
        return None

    # Standardize timestamp to UTC ISO-8601
    w_df["time"] = pd.to_datetime(w_df["time"], utc=True)
    aq_df["time"] = pd.to_datetime(aq_df["time"], utc=True)

    # Merge on timestamp
    merged = pd.merge(w_df, aq_df, on="time", how="inner")
    merged.sort_values("time", inplace=True)
    merged.reset_index(drop=True, inplace=True)

    # Attach station metadata
    merged["station_code"] = station_code
    merged["station_name"] = station_meta.get("name", station_code)
    merged["latitude"] = station_meta.get("latitude", w_data.get("latitude"))
    merged["longitude"] = station_meta.get("longitude", w_data.get("longitude"))
    merged["elevation_m"] = station_meta.get("elevation_m", 215.0)

    # Rename canonical columns
    rename_map = {
        "time": "timestamp_utc",
        "temperature_2m": "temp_2m_c",
        "relative_humidity_2m": "rh_2m_pct",
        "surface_pressure": "surface_pressure_hpa",
        "wind_speed_10m": "wind_speed_10m_kmh",
        "wind_direction_10m": "wind_direction_10m_deg",
        "precipitation": "precip_mm",
        "boundary_layer_height": "pblh_m",
        "temperature_80m": "temp_80m_c",
        "temperature_120m": "temp_120m_c",
        "temperature_180m": "temp_180m_c",
        "wind_speed_80m": "wind_speed_80m_kmh",
        "wind_speed_120m": "wind_speed_120m_kmh",
        "wind_speed_180m": "wind_speed_180m_kmh",
        "pm2_5": "pm25_ugm3",
        "pm10": "pm10_ugm3",
        "nitrogen_dioxide": "no2_ugm3",
        "ozone": "o3_ugm3",
        "sulphur_dioxide": "so2_ugm3",
        "carbon_monoxide": "co_ugm3"
    }
    merged.rename(columns=rename_map, inplace=True)

    # Unit Normalization: Convert wind speed km/h -> m/s
    merged["wind_speed_10m_ms"] = merged["wind_speed_10m_kmh"] / 3.6
    merged["wind_speed_80m_ms"] = merged["wind_speed_80m_kmh"] / 3.6
    merged["wind_speed_180m_ms"] = merged["wind_speed_180m_kmh"] / 3.6

    # Unit Normalization: CO from ug/m3 -> mg/m3
    merged["co_mgm3"] = merged["co_ugm3"] / 1000.0

    # Wind components (u, v vectors)
    rad = np.deg2rad(merged["wind_direction_10m_deg"])
    merged["wind_u_10m_ms"] = -merged["wind_speed_10m_ms"] * np.sin(rad)
    merged["wind_v_10m_ms"] = -merged["wind_speed_10m_ms"] * np.cos(rad)

    # Atmospheric Physics Diagnostics
    # Interpolate short gaps in continuous meteorology
    merged["pblh_m"] = pd.to_numeric(merged["pblh_m"], errors="coerce").interpolate(method="linear", limit=6).fillna(150.0)
    merged["temp_2m_c"] = pd.to_numeric(merged["temp_2m_c"], errors="coerce")
    merged["wind_speed_10m_ms"] = pd.to_numeric(merged["wind_speed_10m_ms"], errors="coerce")

    lapse_rates = []
    itsis = []
    ventilation_indices = []

    for _, row in merged.iterrows():
        t2 = row["temp_2m_c"] if pd.notna(row["temp_2m_c"]) else None
        t80 = row["temp_80m_c"] if pd.notna(row.get("temp_80m_c")) else None
        pblh = row["pblh_m"] if pd.notna(row["pblh_m"]) else None
        u10 = row["wind_speed_10m_ms"] if pd.notna(row["wind_speed_10m_ms"]) else None

        gamma = InversionDiagnostics.compute_low_level_lapse_rate(t2, t80)
        itsi = InversionDiagnostics.compute_trapping_severity_index(gamma, pblh, u10)
        vi = InversionDiagnostics.compute_ventilation_index(pblh, u10)

        lapse_rates.append(gamma)
        itsis.append(itsi)
        ventilation_indices.append(vi)

    merged["lapse_rate_c_100m"] = lapse_rates
    merged["itsi"] = itsis
    merged["ventilation_index_m2s"] = ventilation_indices

    # Quality control flags
    quality_flags = []
    for _, row in merged.iterrows():
        pm25 = row["pm25_ugm3"]
        pm10 = row["pm10_ugm3"]
        if pd.isna(pm25) or pm25 < 0.0 or pm25 > 1000.0:
            quality_flags.append("INVALID")
        elif pd.notna(pm10) and pm25 > pm10 * 1.05:
            quality_flags.append("INVALID")
        else:
            quality_flags.append("VALID")
    merged["quality_flag"] = quality_flags

    # Save interim station file
    interim_file = INTERIM_DIR / f"{station_code}_clean.csv"
    merged.to_csv(interim_file, index=False)
    logger.info(f"Station {station_code}: {len(merged)} records saved to {interim_file}")

    return merged


def build_historical_dataset() -> pd.DataFrame:
    """Build unified historical dataset from all available station files."""
    stn_metadata = load_station_metadata()
    target_codes = [
        "DL_ANAND_VIHAR",
        "DL_PUNJABI_BAGH",
        "DL_RK_PURAM",
        "DL_IGI_AIRPORT",
        "DL_BAWANA"
    ]

    dfs = []
    for code in target_codes:
        meta = stn_metadata.get(code, {"station_code": code, "name": code})
        df = process_station_raw(code, meta)
        if df is not None and not df.empty:
            dfs.append(df)

    if not dfs:
        raise RuntimeError("No station datasets could be processed.")

    combined = pd.concat(dfs, ignore_index=True)
    combined.sort_values(["timestamp_utc", "station_code"], inplace=True)
    combined.reset_index(drop=True, inplace=True)

    # Export processed master datasets
    csv_path = PROCESSED_DIR / "delhi_ncr_winter_2023_2024.csv"
    combined.to_csv(csv_path, index=False)
    logger.info(f"Master historical dataset saved: {len(combined)} rows -> {csv_path}")

    return combined


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    df = build_historical_dataset()
    print("Dataset build complete. Shape:", df.shape)
    print("Columns:", list(df.columns))
    print("Station distribution:\n", df["station_code"].value_counts())
