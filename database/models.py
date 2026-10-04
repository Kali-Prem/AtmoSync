"""
SQLAlchemy ORM Models for VayuDrishti NCR
Compatible with PostgreSQL / TimescaleDB and SQLite (for unit tests).
"""
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import (
    String, Float, Integer, Text, DateTime, ForeignKey, Index, JSON, Boolean
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase):
    pass

class Location(Base):
    __tablename__ = "locations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    region: Mapped[str] = mapped_column(String(64), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    extra_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    stations: Mapped[list["MonitoringStation"]] = relationship("MonitoringStation", back_populates="location")


class MonitoringStation(Base):
    __tablename__ = "monitoring_stations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    station_code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    location_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("locations.id"), nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    provider: Mapped[str] = mapped_column(String(64), default="CPCB")
    status: Mapped[str] = mapped_column(String(32), default="ACTIVE")
    elevation_m: Mapped[float] = mapped_column(Float, default=215.0)
    is_default_anchor: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    extra_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    location: Mapped[Optional["Location"]] = relationship("Location", back_populates="stations")
    air_quality_observations: Mapped[list["AirQualityObservation"]] = relationship(
        "AirQualityObservation", back_populates="station", cascade="all, delete-orphan"
    )


class WeatherObservation(Base):
    __tablename__ = "weather_observations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    time: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    location_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("locations.id"), nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    temperature_2m: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    relative_humidity_2m: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    surface_pressure_hpa: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wind_speed_10m: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wind_direction_10m: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    precipitation_mm: Mapped[Optional[float]] = mapped_column(Float, default=0.0)
    direct_radiation_wm2: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    boundary_layer_height_m: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lapse_rate_low: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(String(64), default="OPEN-METEO")
    qc_flag: Mapped[int] = mapped_column(Integer, default=0)

    __table_args__ = (
        Index("idx_weather_time_loc", "location_id", "time"),
    )


class AirQualityObservation(Base):
    __tablename__ = "air_quality_observations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    time: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    station_id: Mapped[str] = mapped_column(String(64), ForeignKey("monitoring_stations.id"), nullable=False)
    pm25: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pm10: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    no2: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    o3: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    so2: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    co: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    nh3: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    aqi: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    prominent_pollutant: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    source: Mapped[str] = mapped_column(String(64), default="OPENAQ-CPCB")
    qc_flag: Mapped[int] = mapped_column(Integer, default=0)
    raw_payload: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict)

    station: Mapped["MonitoringStation"] = relationship("MonitoringStation", back_populates="air_quality_observations")

    __table_args__ = (
        Index("idx_aq_time_stn", "station_id", "time"),
    )


class ModelRun(Base):
    __tablename__ = "model_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    model_name: Mapped[str] = mapped_column(String(64), nullable=False)
    model_version: Mapped[str] = mapped_column(String(32), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="PENDING")
    config_reference: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    forecasts: Mapped[list["Forecast"]] = relationship("Forecast", back_populates="model_run", cascade="all, delete-orphan")


class Forecast(Base):
    __tablename__ = "forecasts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    forecast_cycle: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    valid_time: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    lead_hour: Mapped[int] = mapped_column(Integer, nullable=False)
    station_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("monitoring_stations.id"), nullable=True)
    location_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("locations.id"), nullable=True)
    variable: Mapped[str] = mapped_column(String(32), nullable=False)
    predicted_value: Mapped[float] = mapped_column(Float, nullable=False)
    p10_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    p90_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    model_run_id: Mapped[str] = mapped_column(String(64), ForeignKey("model_runs.id"), nullable=False)
    model_version: Mapped[str] = mapped_column(String(32), nullable=False)

    model_run: Mapped["ModelRun"] = relationship("ModelRun", back_populates="forecasts")

    __table_args__ = (
        Index("idx_fc_stn_cycle_time", "station_id", "forecast_cycle", "valid_time"),
    )


class FireEvent(Base):
    __tablename__ = "fire_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    acq_time: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    frp_mw: Mapped[float] = mapped_column(Float, nullable=False)
    brightness_temp_k: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    confidence: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    daynight: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    state: Mapped[str] = mapped_column(String(64), default="Punjab")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    severity: Mapped[str] = mapped_column(String(32), nullable=False)
    location_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("locations.id"), nullable=True)
    triggered_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="ACTIVE")
    extra_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict)
