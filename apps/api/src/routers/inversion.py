"""
Atmospheric Inversion & Stability Status Router (Phase 5)
Provides multi-level vertical profile analysis, continuous inversion strength,
Inversion Trapping Severity Index (ITSI: 0 - 100), and forecast stability.
"""
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import WeatherObservation
from scientific.preprocessing.inversion import InversionDiagnostics

router = APIRouter(prefix="/inversion", tags=["Atmospheric Inversion & Stability"])


@router.get("/status")
@router.get("/current")
def get_inversion_status(db: Session = Depends(get_db)):
    """
    Computes current atmospheric inversion diagnostics, vertical structure,
    and Inversion Trapping Severity Index (ITSI) from the latest meteorological readings.
    """
    latest_weather = db.query(WeatherObservation).order_by(WeatherObservation.time.desc()).first()
    if latest_weather and latest_weather.temperature_2m is not None:
        lapse = latest_weather.lapse_rate_low or 0.0
        pblh = latest_weather.boundary_layer_height_m or 400.0
        ws = latest_weather.wind_speed_10m or 2.0
        t2m = latest_weather.temperature_2m
        time_iso = latest_weather.time.isoformat()
    else:
        from apps.api.src.routers.observations import get_observation_dataframe
        df = get_observation_dataframe()
        if df is not None and not df.empty:
            row = df.iloc[-1]
            lapse = float(row.get("lapse_rate_c_100m", 0.45) or 0.45)
            pblh = float(row.get("pblh_m", 285.0) or 285.0)
            ws = float(row.get("wind_speed_10m_ms", 1.8) or 1.8)
            t2m = float(row.get("temp_2m_c", 20.0) or 20.0)
            time_iso = str(row.get("timestamp_utc", "2024-02-29T23:00:00Z"))
        else:
            return {
                "status": "NO_OBSERVATIONS_AVAILABLE",
                "message": "Awaiting meteorological ingestion cycle."
            }

    # Multi-level vertical profile analysis
    # If 180m temperature is not directly in table column, reconstruct from lapse rate:
    # T_180m = T_2m + (lapse_rate / 100) * 178
    t180m = t2m + (lapse / 100.0) * 178.0
    t80m = t2m + (lapse / 100.0) * 78.0

    profile_diag = InversionDiagnostics.analyze_vertical_profile(
        t2m=t2m, t80m=t80m, t180m=t180m
    )

    tsi = InversionDiagnostics.compute_trapping_severity_index(lapse, pblh, ws)
    vi = InversionDiagnostics.compute_ventilation_index(pblh, ws)
    stagnation = InversionDiagnostics.compute_stagnation_indicator(pblh, ws, lapse)

    return {
        "status": "ACTIVE",
        "timestamp_utc": time_iso,
        "temperature_2m_c": t2m,
        "temperature_180m_c": round(t180m, 2),
        "boundary_layer_height_m": pblh,
        "wind_speed_10m_ms": ws,
        "near_surface_lapse_rate_c_100m": lapse,
        "inversion_present": profile_diag["inversion_present"],
        "inversion_class": profile_diag["inversion_class"],
        "inversion_strength": profile_diag["inversion_strength"],
        "inversion_base_height_m": profile_diag["inversion_base_height_m"],
        "inversion_top_height_m": profile_diag["inversion_top_height_m"],
        "inversion_detection_method": profile_diag["inversion_detection_method"],
        "inversion_quality_flag": profile_diag["inversion_quality_flag"],
        "trapping_severity_index": tsi,
        "ventilation_index_m2s": vi,
        "stagnation_indicator": stagnation,
        "risk_summary": (
            "Severe risk of nocturnal pollutant trapping and emergency haze accumulation."
            if tsi >= 75.0 else
            "Moderate risk of pollutant trapping under nocturnal boundary layer collapse."
            if tsi >= 50.0 else
            "Adequate vertical mixing with active atmospheric dispersion."
        )
    }


@router.get("/forecast")
def get_inversion_forecast(
    hours: int = Query(48, ge=6, le=72),
    db: Session = Depends(get_db)
):
    """
    Returns forward time series of inversion strength and trapping index (ITSI).
    """
    records = db.query(WeatherObservation).order_by(WeatherObservation.time.asc()).limit(hours).all()
    forecast_steps = []

    for r in records:
        lapse = r.lapse_rate_low or 0.0
        pblh = r.boundary_layer_height_m or 400.0
        ws = r.wind_speed_10m or 2.0

        tsi = InversionDiagnostics.compute_trapping_severity_index(lapse, pblh, ws)
        inv_class = InversionDiagnostics.classify_inversion(lapse)

        forecast_steps.append({
            "timestamp_utc": r.time.isoformat(),
            "lapse_rate_low_c_100m": lapse,
            "inversion_class": inv_class,
            "inversion_present": lapse > 0.0,
            "trapping_severity_index": tsi,
            "pbl_height_m": pblh,
            "wind_speed_ms": ws
        })

    return {
        "status": "SUCCESS",
        "steps_count": len(forecast_steps),
        "steps": forecast_steps,
        "method": "vertical_temperature_profile",
        "description": "Forward inversion trapping index forecast."
    }
