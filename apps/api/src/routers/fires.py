"""
Satellite Active Fire Hotspots Router (Phase 5)
Serves NASA FIRMS VIIRS 375m active thermal detections, regional event clustering,
agricultural stubble classification, and particulate emission flux calculations.
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import FireEvent
from apps.api.src.schemas.fire import FireEventRead
from scientific.preprocessing.fire import FireEventProcessor
from scientific.preprocessing.wind import WindDiagnostics

router = APIRouter(prefix="/fires", tags=["Satellite Active Fires & Biomass Burning"])


@router.get("/active", response_model=List[FireEventRead])
def get_active_fires(
    limit: int = Query(100, ge=1, le=1000),
    min_frp: float = Query(0.0, ge=0.0, description="Minimum FRP in MW"),
    state: Optional[str] = Query(None, description="Filter by state (Punjab, Haryana)"),
    db: Session = Depends(get_db)
):
    """
    Retrieves recent active fire detections across Punjab, Haryana, and NCR.
    """
    query = db.query(FireEvent).order_by(FireEvent.acq_time.desc())
    if min_frp > 0:
        query = query.filter(FireEvent.frp_mw >= min_frp)
    if state:
        query = query.filter(FireEvent.state.ilike(f"%{state}%"))
    return query.limit(limit).all()


@router.get("/clusters")
def get_fire_clusters(
    limit_raw: int = Query(300, ge=10, le=1000),
    distance_threshold_km: float = Query(15.0, ge=5.0, le=50.0),
    db: Session = Depends(get_db)
):
    """
    Aggregates individual satellite fire pixels into coherent regional fire clusters/events.
    Computes centroid coordinates, detection counts, total FRP, and estimated PM2.5 mass flux.
    """
    records = db.query(FireEvent).order_by(FireEvent.acq_time.desc()).limit(limit_raw).all()
    detections = []
    for r in records:
        detections.append({
            "latitude": r.latitude,
            "longitude": r.longitude,
            "frp_mw": r.frp_mw,
            "confidence": r.confidence,
            "time": r.acq_time.isoformat() if r.acq_time else None,
            "source": r.source
        })

    clusters = FireEventProcessor.cluster_fire_events(
        detections, distance_threshold_km=distance_threshold_km
    )

    total_frp = sum(c["total_frp_mw"] for c in clusters)
    total_flux = sum(c["estimated_pm25_flux_kg_s"] for c in clusters)

    return {
        "status": "SUCCESS",
        "clusters_count": len(clusters),
        "total_active_frp_mw": round(total_frp, 1),
        "total_pm25_emission_flux_kg_s": round(total_flux, 2),
        "clusters": clusters
    }


@router.get("/nearby")
def get_nearby_fires(
    max_distance_km: float = Query(350.0, ge=50.0, le=600.0),
    delhi_lat: float = 28.6139,
    delhi_lon: float = 77.2090,
    db: Session = Depends(get_db)
):
    """
    Returns active fire events located within transport range of Delhi NCR.
    """
    records = db.query(FireEvent).order_by(FireEvent.acq_time.desc()).limit(200).all()
    nearby = []
    for r in records:
        dist = WindDiagnostics.calculate_distance_km(r.latitude, r.longitude, delhi_lat, delhi_lon)
        if dist <= max_distance_km:
            bearing = WindDiagnostics.calculate_bearing(r.latitude, r.longitude, delhi_lat, delhi_lon)
            nearby.append({
                "id": r.id,
                "latitude": r.latitude,
                "longitude": r.longitude,
                "frp_mw": r.frp_mw,
                "acq_time": r.acq_time.isoformat() if r.acq_time else None,
                "state": r.state,
                "distance_to_delhi_km": dist,
                "bearing_to_delhi_deg": bearing
            })

    return {
        "status": "SUCCESS",
        "reference_point": {"name": "Delhi Center", "latitude": delhi_lat, "longitude": delhi_lon},
        "max_radius_km": max_distance_km,
        "count": len(nearby),
        "fires": nearby
    }
