# Database Deployment Guide — ATMOSYNC (SIH-26082)

**System:** ATMOSYNC — Air Pollution–Weather Coupled Forecasting System for Delhi NCR  
**SIH Problem Statement:** SIH-26082  
**Document Type:** Database Architecture & Deployment Specification  

---

## 1. Database Architecture Overview

ATMOSYNC supports a dual-engine architecture:

1. **Embedded SQLite (Default / Free Tier / Local Development):**
   - File Path: `./data/vayudrishti.db` (or configurable via `DATABASE_URL=sqlite:///./data/vayudrishti.db`).
   - Requires zero external services or infrastructure provisioning.
   - Automatically handles directory creation (`os.makedirs`) and thread safety (`check_same_thread=False`).
   - Fully supports all 8 SQLAlchemy ORM models.

2. **PostgreSQL 16 + TimescaleDB + PostGIS (Production High-Throughput):**
   - Connection URL: `postgresql+psycopg://user:password@host:port/database`.
   - Automatic normalization of legacy `postgres://` prefixes to `postgresql+psycopg://` to leverage the modern `psycopg` (v3) driver installed in `apps/api/requirements.txt`.
   - Used in `docker-compose.yml` (`timescale/timescaledb-ha:pg16`) with static DDL in `database/migrations/001_initial_schema.sql`.

---

## 2. ORM Models and Core Schema

ATMOSYNC persists 8 core entities defined in [`database/models.py`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/database/models.py):

| Entity / Model | Table Name | Primary Key | Key Relationships / Indices |
| :--- | :--- | :--- | :--- |
| `Location` | `locations` | `id` (VARCHAR(64)) | One-to-many with `MonitoringStation`, FK target for forecasts/observations |
| `MonitoringStation` | `monitoring_stations` | `id` (VARCHAR(64)) | Foreign key to `locations.id`, unique `station_code` |
| `WeatherObservation` | `weather_observations` | `id` (Integer) | Indexed on `(location_id, time DESC)` |
| `AirQualityObservation`| `air_quality_observations` | `id` (Integer) | Indexed on `(station_id, time DESC)` |
| `ModelRun` | `model_runs` | `id` (VARCHAR(64)) | Provenance log for ML and WRF-Chem cycles |
| `Forecast` | `forecasts` | `id` (Integer) | Indexed on `(station_id, forecast_cycle, valid_time)` |
| `FireEvent` | `fire_events` | `id` (Integer) | Indexed on `(acq_time DESC)` |
| `Alert` | `alerts` | `id` (VARCHAR(64)) | Indexed on `(status, triggered_at DESC)` |

---

## 3. Migration & Schema Initialization Mechanism

ATMOSYNC uses SQLAlchemy DeclarativeBase metadata (`Base.metadata.create_all(bind=engine)`) as its unified schema initialization mechanism.

### Executing Migrations:
```bash
# Initialize schema / run DDL
python scripts/cli.py db init

# Alternatively using the migrate alias
python scripts/cli.py db migrate
```

### Programmatic Invocation:
```python
from database.connection import init_database
init_database()
```

The `init_database` function accepts an optional `bind_engine` argument, allowing targeted table creation on arbitrary connections or test engines.

---

## 4. Reference Seed Data Specifications

ATMOSYNC pre-packages official, verified CAAQMS monitoring stations across Delhi NCR in [`database/seeds/001_delhi_stations.json`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/database/seeds/001_delhi_stations.json).

### Seeding Command:
```bash
python scripts/cli.py db seed
```

### Seeding Logic & Idempotence:
1. **Defensive Schema Guarantee:** `cmd_db_seed()` and `seed_monitoring_stations()` automatically call `init_database()` before querying the database, ensuring no `OperationalError: no such table` can occur.
2. **Geographic Regions (Locations):** Generates 10 geographic regional entities (`loc_delhi_east`, `loc_delhi_west`, `loc_delhi_south`, `loc_delhi_north`, `loc_delhi_southwest`, `loc_delhi_northwest`, `loc_delhi_southeast`, `loc_delhi_central`, `loc_haryana_ncr`, `loc_up_ncr`) with centroid coordinates.
3. **Monitoring Stations:** Inserts the 20 active CAAQMS monitoring stations (including anchor stations: Anand Vihar, Punjabi Bagh, R.K. Puram, IGI Airport, Bawana).
4. **Idempotent:** If records already exist, queries skip insertion (`existing_loc` and `existing_stn` checks), returning `0` newly inserted rows without duplicating data or raising integrity errors.

---

## 5. Render Production Deployment Orchestration

### Build Command:
```bash
pip install --upgrade pip && pip install -r apps/api/requirements.txt
```
*Note:* The build phase is kept clean of database operations so that slug creation never fails due to database connectivity or missing runtime environments.

### Production Start Command:
```bash
python scripts/cli.py db init && python scripts/cli.py db seed && uvicorn apps.api.src.main:app --host 0.0.0.0 --port $PORT
```

This ensures the deterministic sequence:
```text
database schema initialization (db init)
                 ↓
reference data seeding (db seed)
                 ↓
backend server startup (uvicorn)
```

Whether deployed with SQLite on Render's free tier or connected to a managed Render PostgreSQL instance, the database tables and reference stations are guaranteed to exist before `uvicorn` begins serving requests.
