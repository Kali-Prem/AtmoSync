"""Tests for Database Schema Initialization, Migrations, and Seeding Lifecycle.

Verifies:
1. Clean database schema creation includes the 'locations' table.
2. Verification query: SELECT name FROM sqlite_master WHERE type='table' AND name='locations'.
3. Seeding monitoring stations populates both locations and monitoring_stations.
4. Idempotent re-seeding behavior.
5. Direct seeding on an uninitialized database ensures schema without crashing.
6. API routes /health, /api/v1/locations, and /api/v1/locations/stations function without error.
"""

import os
import tempfile
import sqlite3
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from database.models import Base, Location, MonitoringStation
from database.connection import init_database
from database.seed_data import seed_monitoring_stations
from apps.api.src.main import app


def test_schema_creation_and_locations_table_existence():
    """Verify that init_database creates all required tables including 'locations'."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp_file:
        tmp_path = tmp_file.name

    try:
        engine = create_engine(f"sqlite:///{tmp_path}", connect_args={"check_same_thread": False})
        init_database(bind_engine=engine)

        conn = sqlite3.connect(tmp_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='locations';")
        row = cursor.fetchone()
        assert row is not None, "Table 'locations' was not found in sqlite_master!"
        assert row[0] == "locations"

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='monitoring_stations';")
        assert cursor.fetchone() is not None, "Table 'monitoring_stations' was not found!"

        conn.close()
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def test_seed_lifecycle_and_idempotence():
    """Verify that seed_monitoring_stations populates locations and stations, and is idempotent."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp_file:
        tmp_path = tmp_file.name

    try:
        engine = create_engine(f"sqlite:///{tmp_path}", connect_args={"check_same_thread": False})
        init_database(bind_engine=engine)
        Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)

        with Session() as session:
            inserted = seed_monitoring_stations(session)
            assert inserted >= 20, f"Expected at least 20 stations inserted, got {inserted}"

            # Verify locations populated
            loc_count = session.query(Location).count()
            assert loc_count >= 10, f"Expected at least 10 locations, got {loc_count}"

            # Verify stations populated
            stn_count = session.query(MonitoringStation).count()
            assert stn_count >= 20, f"Expected at least 20 monitoring stations, got {stn_count}"

            # Verify specific anchor station
            anand_vihar = session.query(MonitoringStation).filter_by(station_code="DL_ANAND_VIHAR").first()
            assert anand_vihar is not None
            assert anand_vihar.location_id is not None
            assert anand_vihar.is_default_anchor is True

        # Verify idempotence on second run
        with Session() as session:
            second_run = seed_monitoring_stations(session)
            assert second_run == 0, f"Expected 0 new stations on second run, got {second_run}"
            assert session.query(MonitoringStation).count() == stn_count
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def test_seed_on_uninitialized_database_recovery():
    """Verify that seed_monitoring_stations does not crash if called before explicit table creation."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp_file:
        tmp_path = tmp_file.name

    try:
        # Intentionally do not call init_database() beforehand
        engine = create_engine(f"sqlite:///{tmp_path}", connect_args={"check_same_thread": False})
        Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)

        with Session() as session:
            # This previously raised sqlite3.OperationalError: no such table: locations
            inserted = seed_monitoring_stations(session)
            assert inserted >= 20
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def test_api_locations_routes_with_seeded_db():
    """Verify that /api/v1/locations and /api/v1/locations/stations return 200 with data."""
    with TestClient(app) as client:
        res_loc = client.get("/api/v1/locations")
        assert res_loc.status_code == 200
        locations = res_loc.json()
        assert isinstance(locations, list)
        assert len(locations) > 0

        res_stn = client.get("/api/v1/locations/stations")
        assert res_stn.status_code == 200
        stations = res_stn.json()
        assert isinstance(stations, list)
        assert len(stations) >= 20
