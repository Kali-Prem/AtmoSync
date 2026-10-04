"""
Forecast Data Contract Pydantic Schema
Conforms strictly to DOC-ENG-005.
"""
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class PollutantConcentration(BaseModel):
    value: float = Field(ge=0.0)
    p10: Optional[float] = Field(default=None, ge=0.0)
    p90: Optional[float] = Field(default=None, ge=0.0)

class ForecastPollutants(BaseModel):
    pm25: PollutantConcentration
    pm10: PollutantConcentration
    no2: float = Field(ge=0.0)
    o3: float = Field(ge=0.0)
    co: Optional[float] = Field(default=None, ge=0.0)
    so2: Optional[float] = Field(default=None, ge=0.0)

class ForecastAqi(BaseModel):
    overall_aqi: int = Field(ge=0, le=500)
    prominent_pollutant: str
    category: str
    color_hex: str
    sub_indices: Optional[Dict[str, int]] = None

class ForecastMeteorology(BaseModel):
    temperature_2m: float
    relative_humidity_2m: float = Field(ge=0.0, le=100.0)
    surface_pressure_hpa: Optional[float] = None
    wind_speed_10m: float = Field(ge=0.0)
    wind_direction_10m: float = Field(ge=0.0, le=360.0)
    boundary_layer_height_m: float = Field(ge=20.0)

class ForecastDiagnostics(BaseModel):
    inversion_lapse_rate: float
    inversion_class: str
    trapping_severity_index: float = Field(ge=0.0, le=100.0)
    ventilation_index: float = Field(ge=0.0)

class HourlyForecastStep(BaseModel):
    valid_time: datetime
    lead_hour: int = Field(ge=1, le=72)
    pollutants: ForecastPollutants
    aqi: ForecastAqi
    meteorology: ForecastMeteorology
    diagnostics: ForecastDiagnostics
    plume_impact: Optional[Dict[str, Any]] = None
    explainability: Optional[Dict[str, Any]] = None

class StationForecastResponse(BaseModel):
    forecast_cycle: datetime
    station_id: str
    station_name: str
    region: Optional[str] = None
    latitude: float
    longitude: float
    elevation_m: float = 215.0
    model_version: str
    hourly_steps: List[HourlyForecastStep]
