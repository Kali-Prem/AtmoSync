# Render Deployment Readiness Audit — ATMOSYNC (SIH-26082)

**System:** ATMOSYNC — Air Pollution–Weather Coupled Forecasting System for Delhi NCR  
**SIH Problem Statement:** SIH-26082  
**Audit Date:** 2026-10-04  
**Audit Purpose:** Comprehensive Verification of Database Initialization and Render Deployment Readiness  

---

## 1. Original Error

During the initial Render cloud deployment, the `atmosync-api` service encountered:

```text
sqlalchemy.exc.OperationalError:
(sqlite3.OperationalError) no such table: locations

The failing query accessed:
FROM locations
WHERE locations.id = ?
```

---

## 2. Root Cause

1. **Ephemeral / Gitignored Database:**  
   The SQLite database file `data/vayudrishti.db` is intentionally gitignored (`*.db` in `.gitignore`). Consequently, any fresh clone on Render begins with no SQLite database file.
2. **Missing Initialization Invocation:**  
   The blueprint build command (`render.yaml`) executed:
   ```bash
   pip install --upgrade pip && pip install -r apps/api/requirements.txt && python scripts/cli.py db seed
   ```
   `scripts/cli.py db seed` called `cmd_db_seed()`, which invoked `seed_monitoring_stations(db)` without first executing `init_database()`.
3. **Premature Table Querying:**  
   In `database/seed_data.py:26`, `seed_monitoring_stations()` queried `db.query(Location).filter(Location.id == loc_id).first()` on the freshly created empty SQLite database, triggering `sqlite3.OperationalError: no such table: locations`.
4. **Lifecycle Sequence Flaw:**  
   Schema creation and reference seeding were placed in the build container step rather than the production runtime start command.

---

## 3. Database Architecture

ATMOSYNC maintains a dual-database architecture:
- **Local Development / Render Free Tier:** Embedded SQLite (`sqlite:///./data/vayudrishti.db`), requiring zero external provisioned services. Threading is configured with `check_same_thread=False` and automatic directory creation.
- **Production / TimescaleDB:** PostgreSQL 16 + TimescaleDB + PostGIS (`postgresql+psycopg://...`), automatically converting `postgres://` or `postgresql://` URIs to use the modern `psycopg` (v3) engine.

---

## 4. Migration Mechanism

- ATMOSYNC relies on SQLAlchemy DeclarativeBase DDL: `Base.metadata.create_all(bind=engine)`.
- Invoked via `database.connection:init_database()`.
- Exists as CLI commands:
  ```bash
  python scripts/cli.py db init
  python scripts/cli.py db migrate
  ```
- All 8 entities (`locations`, `monitoring_stations`, `weather_observations`, `air_quality_observations`, `model_runs`, `forecasts`, `fire_events`, `alerts`) are created in a single atomic pass if they do not exist.
- Reference static DDL is documented in `database/migrations/001_initial_schema.sql` for PostgreSQL container init.

---

## 5. `locations` Table Creation

The `locations` table is defined by the `Location` model in `database/models.py`:
- **Columns:** `id` (VARCHAR(64), PK), `name` (VARCHAR(128)), `region` (VARCHAR(64)), `latitude` (Float), `longitude` (Float), `extra_metadata` (JSON), `created_at` (DateTime).
- **Relationships:** One-to-many relationship with `MonitoringStation`.
- Schema creation creates the table and necessary indices before any station seeding or observation queries occur.

---

## 6. Render Database Configuration

In [`render.yaml`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/render.yaml):
- **Service Name:** `atmosync-api`
- **Service Type:** `web`
- **Runtime:** `python`
- **Region:** `oregon`
- **Plan:** `free`
- **Database URL:** Defaults to `sqlite:///./data/vayudrishti.db`. Can be overridden with an external/managed Render PostgreSQL connection string via the Render Dashboard environment settings without any code modifications.

---

## 7. Required Environment Variables

| Variable | Default / Value | Description |
| :--- | :--- | :--- |
| `APP_NAME` | `ATMOSYNC` | Official application branding identifier |
| `ENVIRONMENT` | `production` | Deployment environment flag |
| `PYTHONPATH` | `.` | Root directory import resolution |
| `DATABASE_URL` | `sqlite:///./data/vayudrishti.db` | SQLAlchemy connection string (SQLite or PostgreSQL) |
| `ALLOWED_CORS_ORIGINS`| `'["https://atmosync-web.onrender.com", "http://localhost:3000"]'` | Allowed production frontend origins (JSON array or comma-separated string) |
| `LOG_LEVEL` | `INFO` | Logging verbosity |
| `FORECAST_HORIZON_HOURS` | `72` | Standard forecasting window length |

---

## 8. Migration Command

```bash
python scripts/cli.py db init
```
*(Or `python scripts/cli.py db migrate`)*

---

## 9. Production Start Command

```bash
python scripts/cli.py db init && python scripts/cli.py db seed && uvicorn apps.api.src.main:app --host 0.0.0.0 --port $PORT
```

---

## 10. Local Verification Summary

1. **Reproduction Test:**  
   Ran `DATABASE_URL=sqlite:///./test_clean.db .venv/bin/python scripts/cli.py db seed` on unpatched codebase. Confirmed identical failure (`OperationalError: no such table: locations`).
2. **Schema Creation Test:**  
   Verified `init_database()` generates all 8 tables. Confirmed with `SELECT name FROM sqlite_master WHERE type='table' AND name='locations';`.
3. **Seed Lifecycle Test:**  
   Ran `python scripts/cli.py db seed`. Populated 10 regional locations and 20 CAAQMS monitoring stations. Re-run demonstrated 100% idempotence (0 new stations inserted).
4. **Defensive Seed Recovery Test:**  
   Invoked `seed_monitoring_stations` on an uninitialized database. Verified automatic schema creation and successful seeding.
5. **Production Simulation Test:**  
   Executed `db init && db seed && uvicorn` on live loopback port `8009`:
   - `GET /health` -> `200 OK`, `status: healthy`, `database.status: connected`.
   - `GET /api/v1/locations` -> `200 OK`, returned 10 region records.
   - `GET /api/v1/locations/stations` -> `200 OK`, returned 20 CAAQMS monitoring stations.
6. **Backend Pytest Suite:**  
   All 62 backend tests in `tests/` passed (including 5 CORS configuration tests and 4 database initialization tests).
7. **CORS Protocol Verification:**  
   Verified `ALLOWED_CORS_ORIGINS` parses JSON array and comma-separated string formats into `List[str]`, supporting the production origin `https://atmosync-web.onrender.com` with `allow_credentials=True`.
8. **Frontend Next.js Rewrite Verification:**  
   Verified `next.config.mjs` rewrite source `/api/:path*` correctly resolves `atmosync-api` from Render's `property: host` to `https://atmosync-api.onrender.com/api/:path*` (always beginning with valid protocol).
9. **Frontend Production Build:**  
   Executed `npm run test:rewrite`, `npx tsc --noEmit`, and `npm run build` in `apps/web`. Completed successfully with 0 TypeScript or Next.js build errors across all environment configurations.

---

## 11. Frontend Rewrite Specification

```text
Frontend framework:
Next.js 14 (App Router)

Rewrite:
/api/:path*

Destination:
https://atmosync-api.onrender.com/api/:path* (Production Render)
http://127.0.0.1:8000/api/:path* (Local Development Fallback)

Required environment variable:
NEXT_PUBLIC_API_URL

Render configuration:
fromService:
  type: web
  name: atmosync-api
  property: host
(Or explicit URL: https://atmosync-api.onrender.com)
```

---

## 12. Remaining Blockers

**None.**  
All three deployment layers (database initialization, CORS configuration, and frontend Next.js rewrite build) are verified and operational locally. Render Blueprint in `render.yaml` is fully deployment-ready.
