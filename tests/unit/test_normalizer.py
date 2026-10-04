"""
Unit Tests for DataNormalizer
Tests unit conversions, coordinate precision rounding, and timestamp standardization.
"""
import pytest
from datetime import datetime, timezone
from services.ingestion.src.normalization.normalizer import DataNormalizer

def test_normalize_timestamp():
    dt_str = "2026-10-03T12:30:00Z"
    normalized = DataNormalizer.normalize_timestamp(dt_str)
    assert normalized.tzinfo == timezone.utc
    assert normalized.hour == 12
    assert normalized.minute == 30

def test_normalize_coordinates():
    lat, lon = DataNormalizer.normalize_coordinates(28.61394123, 77.20902891)
    assert lat == 28.6139
    assert lon == 77.2090

def test_convert_gas_concentration_co():
    # 2.0 ppm CO at standard conditions -> ~2.29 mg/m3
    mgm3 = DataNormalizer.convert_gas_concentration(2.0, "co", "ppm")
    assert mgm3 == 2.29

def test_convert_gas_concentration_no2():
    # 50.0 ppb NO2 -> 94.0 ug/m3
    ugm3 = DataNormalizer.convert_gas_concentration(50.0, "no2", "ppb")
    assert ugm3 == 94.0

def test_convert_temperature_kelvin():
    celsius = DataNormalizer.convert_temperature(300.15, "k")
    assert celsius == 27.0

def test_convert_wind_speed_kmh():
    ms = DataNormalizer.convert_wind_speed(36.0, "km/h")
    assert ms == 10.0
