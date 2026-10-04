"""
Locations & Monitoring Stations Router
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import Location, MonitoringStation
from apps.api.src.schemas.location import LocationRead, MonitoringStationRead

router = APIRouter(prefix="/locations", tags=["Locations & Stations"])

DEFAULT_ANCHORS = {"DL_ANAND_VIHAR", "DL_PUNJABI_BAGH", "DL_RK_PURAM", "DL_IGI_AIRPORT", "DL_BAWANA"}

@router.get("", response_model=List[LocationRead])
def list_locations(db: Session = Depends(get_db)):
    """Retrieves all registered regions/locations across Delhi NCR."""
    return db.query(Location).all()

@router.get("/stations", response_model=List[MonitoringStationRead])
def list_monitoring_stations(
    is_default_anchor: Optional[bool] = Query(None, description="Filter by default anchor status"),
    db: Session = Depends(get_db)
):
    """Retrieves all active CAAQMS monitoring stations."""
    query = db.query(MonitoringStation).filter(MonitoringStation.status == "ACTIVE")
    if is_default_anchor is not None:
        query = query.filter(MonitoringStation.is_default_anchor == is_default_anchor)
    stations = query.all()
    for stn in stations:
        if stn.station_code in DEFAULT_ANCHORS:
            stn.is_default_anchor = True
    return stations

@router.get("/stations/{station_id}", response_model=MonitoringStationRead)
def get_station_details(station_id: str, db: Session = Depends(get_db)):
    """Retrieves metadata for a specific station."""
    stn = db.query(MonitoringStation).filter(MonitoringStation.id == station_id).first()
    if not stn:
        raise HTTPException(status_code=404, detail=f"Station '{station_id}' not found.")
    return stn
