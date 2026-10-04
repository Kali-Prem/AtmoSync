"""
Location and Monitoring Station Pydantic Schemas
"""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class LocationBase(BaseModel):
    id: str
    name: str
    region: str
    latitude: float
    longitude: float
    extra_metadata: Optional[Dict[str, Any]] = None

class LocationRead(LocationBase):
    created_at: datetime

    class Config:
        from_attributes = True

class MonitoringStationBase(BaseModel):
    id: str
    station_code: str
    name: str
    location_id: Optional[str] = None
    latitude: float
    longitude: float
    provider: str = "CPCB"
    status: str = "ACTIVE"
    elevation_m: float = 215.0
    extra_metadata: Optional[Dict[str, Any]] = None

class MonitoringStationRead(MonitoringStationBase):
    created_at: datetime

    class Config:
        from_attributes = True
