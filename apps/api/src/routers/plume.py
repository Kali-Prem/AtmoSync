"""
Regional Stubble Plume Transport & Risk Analysis Router (Phase 5)
Provides forward Lagrangian segmented puff trajectories, target domain intersection,
and physically transparent Plume Risk Scores for Delhi NCR.
"""
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import FireEvent, WeatherObservation
from services.plume.engine import plume_service
from services.plume.transport import PlumeTransportEngine
from scientific.preprocessing.wind import WindDiagnostics

router = APIRouter(prefix="/plume", tags=["Regional Stubble Plume Transport"])


@router.get("/status")
def get_plume_transport_status(db: Session = Depends(get_db)):
    """
    Reports operational status of the regional biomass smoke transport engine.
    """
    total_active_fires = db.query(FireEvent).count()
    return {
        "status": "OPERATIONAL",
        "transport_engine": "Forward Lagrangian Segmented Gaussian Puff Model",
        "scientific_classification": "wind-based transport estimate",
        "active_stubble_fires_tracked": total_active_fires,
        "target_domain": {
            "name": "Delhi NCR Modeling Domain (D03/D02)",
            "bounds": {
                "min_lat": PlumeTransportEngine.TARGET_MIN_LAT,
                "max_lat": PlumeTransportEngine.TARGET_MAX_LAT,
                "min_lon": PlumeTransportEngine.TARGET_MIN_LON,
                "max_lon": PlumeTransportEngine.TARGET_MAX_LON
            },
            "center": {
                "latitude": PlumeTransportEngine.TARGET_CENTER_LAT,
                "longitude": PlumeTransportEngine.TARGET_CENTER_LON
            }
        },
        "message": "Operational wind-based forward plume advection active."
    }


@router.get("/risk")
@router.get("/current")
def get_plume_risk(db: Session = Depends(get_db)):
    """
    Calculates current Plume Risk Score (0 - 100), active upwind fire count,
    directional alignment, and arrival ETA for Delhi NCR.
    """
    return plume_service.get_current_plume_risk(db)


@router.get("/trajectories")
def get_plume_trajectories(
    duration_hours: int = Query(48, ge=6, le=72),
    db: Session = Depends(get_db)
):
    """
    Generates forward Lagrangian trajectory coordinates and horizontal dispersion
    radii (sigma_y) for top regional fire clusters.
    """
    risk_data = plume_service.get_current_plume_risk(db)
    return {
        "status": "SUCCESS",
        "duration_hours": duration_hours,
        "model_label": "wind-based transport estimate (Forward Lagrangian Segmented Puff)",
        "trajectories": risk_data.get("sample_trajectories", [])
    }
