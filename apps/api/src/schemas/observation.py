"""
Observation Schemas for Weather and Air Quality
"""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class WeatherObservationRead(BaseModel):
    id: int
    time: datetime
    location_id: Optional[str] = None
    latitude: float
    longitude: float
    temperature_2m: Optional[float] = None
    relative_humidity_2m: Optional[float] = None
    surface_pressure_hpa: Optional[float] = None
    wind_speed_10m: Optional[float] = None
    wind_direction_10m: Optional[float] = None
    precipitation_mm: Optional[float] = 0.0
    direct_radiation_wm2: Optional[float] = None
    boundary_layer_height_m: Optional[float] = None
    lapse_rate_low: Optional[float] = None
    source: str
    qc_flag: int

    class Config:
        from_attributes = True

class AirQualityObservationRead(BaseModel):
    id: int
    time: datetime
    station_id: str
    pm25: Optional[float] = None
    pm10: Optional[float] = None
    no2: Optional[float] = None
    o3: Optional[float] = None
    so2: Optional[float] = None
    co: Optional[float] = None
    nh3: Optional[float] = None
    aqi: Optional[int] = None
    prominent_pollutant: Optional[str] = None
    source: str
    qc_flag: int

    class Config:
        from_attributes = True
