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

PROCESSED_FILE = Path(__file__).resolve().parent.parent.parent.parent.parent / "data" / "processed" / "delhi_ncr_winter_2023_2024.csv"


@router.get("/latest")
def get_latest_observations():
    """Returns the latest observed criteria pollutants and meteorology across anchor stations."""
    if not PROCESSED_FILE.exists():
        return {"status": "EMPTY", "message": "No observation data available."}

    df = pd.read_csv(PROCESSED_FILE)
    latest_records = []
    for stn_code, grp in df.groupby("station_code"):
        grp.sort_values("timestamp_utc", inplace=True)
        row = grp.iloc[-1]
        latest_records.append({
            "station_code": stn_code,
            "station_name": row.get("station_name", stn_code),
            "timestamp_utc": row["timestamp_utc"],
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


@router.get("/stations/{station_id}/history")
def get_station_observation_history(
    station_id: str,
    limit: int = Query(48, ge=1, le=500)
):
    """Returns historical hourly time series for a station."""
    if not PROCESSED_FILE.exists():
        raise HTTPException(status_code=404, detail="Historical dataset not found.")

    df = pd.read_csv(PROCESSED_FILE)
    stn_df = df[df["station_code"] == station_id].copy()
    if stn_df.empty:
        raise HTTPException(status_code=404, detail=f"Station '{station_id}' not found.")

    stn_df.sort_values("timestamp_utc", ascending=False, inplace=True)
    recent = stn_df.head(limit).iloc[::-1]  # Return in chronological order

    history = []
    for _, row in recent.iterrows():
        history.append({
            "timestamp_utc": row["timestamp_utc"],
            "pm25": round(float(row["pm25_ugm3"]), 1),
            "pm10": round(float(row["pm10_ugm3"]), 1),
            "temp_c": round(float(row["temp_2m_c"]), 1),
            "wind_speed_ms": round(float(row["wind_speed_10m_ms"]), 1),
            "pblh_m": round(float(row["pblh_m"]), 0),
            "itsi": round(float(row["itsi"]), 1)
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
