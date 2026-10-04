"""
Unit Tests for DataValidator
Tests quality control checks, physical bounds, and sensor anomaly detection.
"""
import pytest
from datetime import datetime, timezone
from services.ingestion.src.validation.validator import DataValidator
from services.ingestion.src.validation.rules import QC_VALID, QC_SUSPICIOUS, QC_REJECTED

def test_validate_timestamp_valid():
    ok, parsed, err = DataValidator.validate_timestamp("2026-10-03T06:00:00Z")
    assert ok is True
    assert parsed is not None
    assert parsed.tzinfo == timezone.utc

def test_validate_timestamp_invalid():
    ok, parsed, err = DataValidator.validate_timestamp("invalid-date-string")
    assert ok is False
    assert parsed is None
    assert "Failed to parse" in err

def test_validate_coordinates_in_domain():
    # Central Delhi coordinates
    ok, err = DataValidator.validate_coordinates(28.6139, 77.2090)
    assert ok is True
    assert err is None

def test_validate_coordinates_out_of_domain():
    # London coordinates
    ok, err = DataValidator.validate_coordinates(51.5074, -0.1278)
    assert ok is False
    assert "outside domain" in err

def test_validate_air_quality_record_valid():
    record = {
        "time": "2026-10-03T12:00:00Z",
        "pm25": 85.0,
        "pm10": 160.0,
        "no2": 42.0,
        "o3": 25.0,
        "co": 1.2
    }
    res = DataValidator.validate_air_quality_record(record)
    assert res.is_valid is True
    assert res.qc_flag == QC_VALID
    assert len(res.errors) == 0

def test_validate_air_quality_particulate_hierarchy_incoherence():
    # PM2.5 cannot realistically exceed PM10 by more than 5%
    record = {
        "time": "2026-10-03T12:00:00Z",
        "pm25": 300.0,
        "pm10": 100.0,
        "no2": 42.0
    }
    res = DataValidator.validate_air_quality_record(record)
    assert res.is_valid is True
    assert res.qc_flag == QC_SUSPICIOUS
    assert any("Incoherent particulate ratio" in w for w in res.warnings)

def test_validate_air_quality_physical_bounds_exceeded():
    record = {
        "time": "2026-10-03T12:00:00Z",
        "pm25": 9999.0, # Unphysical sensor glitch
        "pm10": 150.0
    }
    res = DataValidator.validate_air_quality_record(record)
    assert res.is_valid is True
    assert res.record["pm25"] is None # Glitched value should be nullified
    assert res.qc_flag == QC_SUSPICIOUS

def test_validate_fire_event_valid():
    record = {
        "latitude": 30.5,
        "longitude": 75.8,
        "frp_mw": 45.2,
        "bright_ti4": 340.5,
        "confidence": "nominal"
    }
    res = DataValidator.validate_fire_event(record)
    assert res.is_valid is True
    assert res.record["frp_mw"] == 45.2
