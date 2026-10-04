"""
Locations & Monitoring Stations Router
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import Location, MonitoringStation
from apps.api.src.schemas.location import LocationRead, MonitoringStationRead

router = APIRouter(prefix="/locations", tags=["Locations & Stations"])

@router.get("", response_model=List[LocationRead])
def list_locations(db: Session = Depends(get_db)):
    """Retrieves all registered regions/locations across Delhi NCR."""
    return db.query(Location).all()

@router.get("/stations", response_model=List[MonitoringStationRead])
def list_monitoring_stations(db: Session = Depends(get_db)):
    """Retrieves all active CAAQMS monitoring stations."""
    return db.query(MonitoringStation).filter(MonitoringStation.status == "ACTIVE").all()

@router.get("/stations/{station_id}", response_model=MonitoringStationRead)
def get_station_details(station_id: str, db: Session = Depends(get_db)):
    """Retrieves metadata for a specific station."""
    stn = db.query(MonitoringStation).filter(MonitoringStation.id == station_id).first()
    if not stn:
        raise HTTPException(status_code=404, detail=f"Station '{station_id}' not found.")
    return stn
