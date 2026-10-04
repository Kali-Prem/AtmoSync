"""
Unit Tests for Indian NAQI Calculation
Tests CPCB / IIT Kanpur piecewise sub-index formulas and regulatory constraints.
"""
import pytest
from services.ingestion.src.providers.aq_openaq import calculate_naqi

def test_calculate_naqi_good():
    # PM2.5 = 20 (Good: 0-30 -> Sub-index 0-50), PM10 = 35, NO2 = 25
    measurements = {"pm25": 20.0, "pm10": 35.0, "no2": 25.0}
    aqi, prominent = calculate_naqi(measurements)
    assert aqi is not None
    assert 0 <= aqi <= 50

def test_calculate_naqi_severe_peak():
    # Severe winter smog episode in Delhi
    measurements = {
        "pm25": 380.0, # Severe (>250)
        "pm10": 550.0, # Severe (>430)
        "no2": 95.0,   # Moderate (81-180)
        "co": 3.5,
        "so2": 18.0
    }
    aqi, prominent = calculate_naqi(measurements)
    assert aqi is not None
    assert aqi >= 401 # Severe category
    assert prominent in ["PM2.5", "PM10"]

def test_calculate_naqi_insufficient_pollutants():
    # Only 2 pollutants provided (CPCB requires at least 3)
    measurements = {"pm25": 120.0, "pm10": 200.0}
    aqi, prominent = calculate_naqi(measurements)
    assert aqi is None
    assert prominent is None

def test_calculate_naqi_missing_particulate():
    # 3 pollutants provided, but no PM2.5 or PM10 (CPCB mandates PM presence)
    measurements = {"no2": 60.0, "so2": 30.0, "co": 1.5}
    aqi, prominent = calculate_naqi(measurements)
    assert aqi is None
    assert prominent is None
