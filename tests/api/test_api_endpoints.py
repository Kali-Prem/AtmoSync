"""Integration Tests for FastAPI Backend Endpoints (Phase 4).

Validates health checks, station registry, inversion diagnostics,
real multi-horizon forecasts, models metadata, and observations endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from apps.api.src.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_get_root_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "database" in data
    assert "active_providers" in data

def test_get_api_v1_health(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["status"] in ["healthy", "degraded"]

def test_get_stations(client):
    res = client.get("/api/v1/locations/stations")
    assert res.status_code == 200
    stations = res.json()
    assert isinstance(stations, list)
    assert len(stations) >= 20
    assert any(s["station_code"] == "DL_ANAND_VIHAR" for s in stations)

def test_get_inversion_status(client):
    res = client.get("/api/v1/inversion/status")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data

def test_get_station_forecast_real_data(client):
    """Tests Phase 4 real multi-horizon forecast retrieval for an anchor station."""
    res = client.get("/api/v1/forecasts/stations/DL_ANAND_VIHAR")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["station_code"] == "DL_ANAND_VIHAR"
    assert "forecast_horizons" in data
    assert len(data["forecast_horizons"]) == 7
    # Verify forecast fields adhere to contract
    h1 = data["forecast_horizons"][0]
    assert h1["horizon_hours"] == 1
    assert "predicted_pm25_ugm3" in h1
    assert "derived_aqi" in h1
    assert "model_type" in h1

def test_get_forecast_models_metadata(client):
    """Tests retrieval of active baseline model metadata."""
    res = client.get("/api/v1/forecasts/models")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "OPERATIONAL"
    assert len(data["active_models"]) == 3
    model_names = [m["name"] for m in data["active_models"]]
    assert "Naive Persistence Baseline" in model_names
    assert "LightGBM Direct Multi-Horizon Regressor" in model_names

def test_get_forecast_data_freshness(client):
    """Tests retrieval of data freshness metadata."""
    res = client.get("/api/v1/forecasts/freshness")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "OPERATIONAL"
    assert "latest_observation_utc" in data
    assert "dataset_name" in data

def test_get_latest_observations(client):
    """Tests retrieval of latest ground observations across anchor stations."""
    res = client.get("/api/v1/observations/latest")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["stations_count"] >= 5
    records = data["records"]
    assert any(r["station_code"] == "DL_ANAND_VIHAR" for r in records)
