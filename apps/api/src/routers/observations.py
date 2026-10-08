"""Observations Router for Weather and Air Quality Measurements (Phase 4).

Serves verified observations from TimescaleDB or the processed historical dataset.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
import pandas as pd

from database.connection import get_db
from database.models import AirQualityObservation, WeatherObservation
from apps.api.src.schemas.observation import AirQualityObservationRead, WeatherObservationRead

router = APIRouter(prefix="/observations", tags=["Observations"])

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
PROCESSED_FILE = REPO_ROOT / "data" / "processed" / "delhi_ncr_winter_2023_2024.csv"
FEATURES_FILE = REPO_ROOT / "data" / "features" / "delhi_ncr_features.csv"


def get_observation_dataframe() -> Optional[pd.DataFrame]:
    """Resolves processed observation dataset from primary or features fallback paths."""
    if PROCESSED_FILE.exists():
        return pd.read_csv(PROCESSED_FILE)
    if FEATURES_FILE.exists():
        return pd.read_csv(FEATURES_FILE)
    return None


@router.get("/latest")
def get_latest_observations(db: Session = Depends(get_db)):
    """Returns the latest observed criteria pollutants and meteorology across anchor stations."""
    df = get_observation_dataframe()
    if df is not None and not df.empty:
        latest_records = []
        for stn_code, grp in df.groupby("station_code"):
            grp = grp.sort_values("timestamp_utc")
            row = grp.iloc[-1]
            latest_records.append({
                "station_code": stn_code,
                "station_name": row.get("station_name", stn_code),
                "timestamp_utc": str(row["timestamp_utc"]),
                "pm25": round(float(row["pm25_ugm3"]), 1),
                "pm10": round(float(row["pm10_ugm3"]), 1),
                "no2": round(float(row["no2_ugm3"]), 1),
                "so2": round(float(row["so2_ugm3"]), 1),
                "co_mgm3": round(float(row["co_mgm3"]), 2),
                "o3": round(float(row["o3_ugm3"]), 1),
                "temp_c": round(float(row["temp_2m_c"]), 1),
                "rh_pct": round(float(row["rh_2m_pct"]), 1),
                "wind_speed_ms": round(float(row["wind_speed_10m_ms"]), 1),
                "pblh_m": round(float(row["pblh_m"]), 0),
                "itsi": round(float(row["itsi"]), 1)
            })
        return {"status": "SUCCESS", "stations_count": len(latest_records), "records": latest_records}

    # Fallback to database queries
    aq_records = db.query(AirQualityObservation).order_by(AirQualityObservation.time.desc()).limit(20).all()
    if not aq_records:
        return {"status": "EMPTY", "message": "No observation data available."}

    latest_records = []
    seen = set()
    for aq in aq_records:
        if aq.station_id not in seen:
            seen.add(aq.station_id)
            w = db.query(WeatherObservation).filter(WeatherObservation.time == aq.time).first()
            latest_records.append({
                "station_code": aq.station_id.replace("stn_", "").upper(),
                "station_name": aq.station_id.replace("stn_", "").replace("_", " ").title(),
                "timestamp_utc": aq.time.isoformat(),
                "pm25": round(float(aq.pm25 or 0), 1),
                "pm10": round(float(aq.pm10 or 0), 1),
                "no2": round(float(aq.no2 or 0), 1),
                "so2": round(float(aq.so2 or 0), 1),
                "co_mgm3": round(float(aq.co or 0), 2),
                "o3": round(float(aq.o3 or 0), 1),
                "temp_c": round(float(w.temperature_2m if w else 20.0), 1),
                "rh_pct": round(float(w.relative_humidity_2m if w else 50.0), 1),
                "wind_speed_ms": round(float(w.wind_speed_10m if w else 2.0), 1),
                "pblh_m": round(float(w.boundary_layer_height_m if w else 300.0), 0),
                "itsi": round(float(w.lapse_rate_low * 20 if w and w.lapse_rate_low else 35.0), 1)
            })
    return {"status": "SUCCESS", "stations_count": len(latest_records), "records": latest_records}


@router.get("/stations/{station_id}/history")
def get_station_observation_history(
    station_id: str,
    limit: int = Query(48, ge=1, le=500)
):
    """Returns historical hourly time series for a station."""
    df = get_observation_dataframe()
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail="Historical dataset not found.")

    stn_df = df[df["station_code"] == station_id].copy()
    if stn_df.empty:
        raise HTTPException(status_code=404, detail=f"Station '{station_id}' not found.")

    stn_df.sort_values("timestamp_utc", ascending=False, inplace=True)
    recent = stn_df.head(limit).iloc[::-1]  # Return in chronological order
    history = []
    for _, row in recent.iterrows():
        pbl_val = round(float(row["pblh_m"]), 0)
        ws_val = round(float(row["wind_speed_10m_ms"]), 1)
        itsi_val = round(float(row["itsi"]), 1)

        # Retrieve direct lapse rate or derive from scientific inversion balance
        lapse_val = row.get("lapse_rate_c_100m")
        if pd.isnull(lapse_val):
            f_pbl = max(0.0, min(1.0, (800.0 - pbl_val) / 750.0))
            f_wind = max(0.0, min(1.0, (4.0 - ws_val) / 3.5))
            f_gamma = max(0.0, (itsi_val / 100.0 - 0.35 * f_pbl - 0.20 * f_wind) / 0.45)
            lapse_val = round(f_gamma * 3.0, 2)
        else:
            lapse_val = round(float(lapse_val), 2)

        history.append({
            "timestamp_utc": row["timestamp_utc"],
            "pm25": round(float(row["pm25_ugm3"]), 1),
            "pm10": round(float(row["pm10_ugm3"]), 1),
            "no2": round(float(row.get("no2_ugm3", 0.0) if pd.notnull(row.get("no2_ugm3")) else 0.0), 1),
            "o3": round(float(row.get("o3_ugm3", 0.0) if pd.notnull(row.get("o3_ugm3")) else 0.0), 1),
            "temp_c": round(float(row["temp_2m_c"]), 1),
            "wind_speed_ms": ws_val,
            "pblh_m": pbl_val,
            "itsi": itsi_val,
            "lapse_rate_c_100m": lapse_val,
            "rh_pct": round(float(row.get("rh_2m_pct", 70.0) if pd.notnull(row.get("rh_2m_pct")) else 70.0), 1)
        })

    return {
        "status": "SUCCESS",
        "station_code": station_id,
        "records_count": len(history),
        "history": history
    }


@router.get("/air-quality", response_model=List[AirQualityObservationRead])
def get_air_quality_observations(
    station_id: Optional[str] = Query(None, description="Filter by station ID"),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Fetches recent verified air quality observations from database."""
    query = db.query(AirQualityObservation).order_by(AirQualityObservation.time.desc())
    if station_id:
        query = query.filter(AirQualityObservation.station_id == station_id)
    return query.limit(limit).all()


@router.get("/weather", response_model=List[WeatherObservationRead])
def get_weather_observations(
    location_id: Optional[str] = Query(None, description="Filter by location ID"),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Fetches recent meteorological observations from database."""
    query = db.query(WeatherObservation).order_by(WeatherObservation.time.desc())
    if location_id:
        query = query.filter(WeatherObservation.location_id == location_id)
    return query.limit(limit).all()
