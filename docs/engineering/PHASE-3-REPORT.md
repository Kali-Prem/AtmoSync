# Phase 3 Final Report: Project Foundation & Data Engineering Setup

**System:** Air Pollution–Weather Coupled Forecasting System (Delhi NCR Focus)  
**Problem Statement ID:** SIH 2026 — PS 26082  
**Host Organization:** Ministry of Earth Sciences (MoES) / NCMRWF  
**Milestone:** Phase 3 Completion Report  
**Date:** October 2026  

---

# What Was Built

Phase 3 constructed the production-grade engineering foundation for **ATMOSYNC**. In strict accordance with the scientific directives and verified data architectures established during Phase 1 (Requirements) and Phase 2 (Research), all core plumbing, schemas, adapters, and interfaces have been implemented without fabricating fake forecasts or claiming premature scientific operation.

Key deliveries include:
1. **Monorepo Architecture:** Clean structural separation across frontend (`apps/web`), backend (`apps/api`), ingestion services (`services/ingestion`), scientific modeling stubs (`scientific/`), ML interfaces (`ml/`), database migrations (`database/`), and CI orchestration.
2. **Environment & Profile Configuration:** Complete `.env.example` template with zero hardcoded credentials and multi-environment YAML configurations (`configs/development`, `staging`, `production`).
3. **Database Layer:** SQLAlchemy 2.0 ORM and PostgreSQL 16 + TimescaleDB + PostGIS DDL covering 8 domain models (`locations`, `monitoring_stations`, `weather_observations`, `air_quality_observations`, `model_runs`, `forecasts`, `fire_events`, `alerts`). Fully functional SQLite local development fallback pre-seeded with 20 real Delhi NCR CAAQMS stations.
4. **Data Quality Framework:** Deterministic 10-point validation engine enforcing physical bounds (e.g., $PM_{2.5} \in [0, 1000] \ \mu\text{g/m}^3$), particulate consistency ($PM_{2.5} \le PM_{10} \times 1.05$), coordinate bounds, and timestamp sanity.
5. **Data Normalization Engine:** Standardization of trace gases from ppm/ppb to canonical $\mu\text{g/m}^3$ and $\text{mg/m}^3$, temperatures to Celsius, timestamps to UTC ISO-8601, and coordinate precision.
6. **Atmospheric Physics Diagnostics:** Standard implementations for near-surface lapse rate ($\Gamma_{\text{low}}$), Inversion Trapping Severity Index (ITSI), and Ventilation Index ($VI = \text{PBLH} \times U_{10\text{m}}$).
7. **Official India NAQI Engine:** Exact implementation of CPCB / IIT Kanpur piecewise linear sub-indices with the mandatory 3-pollutant rule (requiring at least one particulate).
8. **Pluggable Ingestion Adapters:** Base abstract interface with four concrete verified connectors: Open-Meteo Weather API, OpenAQ v3 API, NASA FIRMS VIIRS active fire API, and Copernicus CAMS chemical prior forecasts.
9. **FastAPI Backend Skeleton:** Full OpenAPI-documented REST application serving `/health`, `/locations`, `/observations`, `/forecasts`, `/fires`, `/inversion`, `/plume`, and `/alerts`.
10. **Next.js 14 Frontend Foundation:** Next.js App Router application featuring an honest, non-fabricated UI with clear empty states, navigation, layout, system telemetry, station inspection, and typed API integration.
11. **Testing Suite:** 28 comprehensive automated tests across validators, normalizers, atmospheric inversion mathematics, NAQI calculators, and API endpoints (100% pass rate).
12. **Containerization & CI:** Docker Compose manifest, production Dockerfiles, and GitHub Actions CI workflow.

---

# Repository Structure

The project has been organized into a modular monorepo:

```
SIH-26082/
├── .env.example                                  # Environment variables reference template
├── .gitignore                                    # Excludes data, weights, keys, cache
├── .github/
│   └── workflows/
│       └── ci.yml                                # GitHub Actions CI workflow
├── apps/
│   ├── api/                                      # FastAPI REST backend
│   │   ├── requirements.txt                      # Backend dependencies
│   │   └── src/
│   │       ├── main.py                           # App entry point, CORS, routers
│   │       ├── routers/                          # 8 modular route controllers
│   │       └── schemas/                          # Pydantic v2 data transfer contracts
│   └── web/                                      # Next.js 14 Web Frontend
│       ├── package.json                          # Next.js, React 18, TypeScript
│       └── src/
│           ├── app/                              # App Router (/forecast, /map, /stations, etc.)
│           ├── components/                       # Layout, Navbar, MetricCard, AlertBanner
│           └── lib/api.ts                        # Typed HTTP API client
├── configs/
│   ├── development/config.yaml                   # Dev profile
│   ├── staging/config.yaml                       # Staging profile
│   └── production/config.yaml                    # High-availability production profile
├── data/
│   ├── README.md                                 # Data retention & directory policy
│   ├── raw/                                      # Untouched incoming payloads (.gitignore)
│   ├── interim/                                  # Validated and parsed records (.gitignore)
│   ├── processed/                                # Normalized feature arrays (.gitignore)
│   └── vayudrishti.db                            # Local SQLite development database
├── database/
│   ├── connection.py                             # SQLAlchemy 2.0 connection pool
│   ├── models.py                                 # Declarative ORM models
│   ├── seed_data.py                              # Station seeding script
│   ├── migrations/001_initial_schema.sql         # TimescaleDB / PostGIS DDL
│   └── seeds/001_delhi_stations.json             # 20 verified CPCB stations
├── docker/
│   ├── Dockerfile.api                             # FastAPI container specification
│   └── Dockerfile.web                             # Next.js production build container
├── docker-compose.yml                            # PostgreSQL, Redis, API, Web orchestration
├── docs/
│   ├── 01-03/                                    # Phase 1 Architectural specifications
│   ├── research/                                 # Phase 2 Scientific research papers & matrices
│   ├── engineering/                              # Phase 3 Foundational engineering docs
│   └── PROJECT-STATUS.md                         # Milestone tracking document
├── ml/
│   └── models/
│       ├── interface.py                          # ForecastRefinementModel abstract contract
│       └── baselines.py                          # NaivePersistenceBaseline implementation
├── scientific/
│   ├── wrf/engine.py                             # ForecastEngine interface & WRF placeholder
│   └── preprocessing/inversion.py                # Lapse rate, ITSI, Ventilation Index
├── scripts/
│   └── cli.py                                    # Unified CLI for DB, Ingest, Validation
├── services/
│   ├── ingestion/                                # Modular data ingestion pipeline
│   │   └── src/
│   │       ├── pipeline.py                       # Pipeline coordinator
│   │       ├── providers/                        # Open-Meteo, OpenAQ, NASA FIRMS, CAMS
│   │       ├── validation/                       # Physical range & ratio checks
│   │       └── normalization/                    # Unit conversion engine
│   ├── forecasting/                              # Forecasting service (Phase 4)
│   ├── plume/                                    # Dispersion model service (Phase 4)
│   └── scheduler/                                # Periodic task runner & retry policy
├── tests/                                        # Pytest test suite (28 tests)
├── Makefile                                      # Linux/macOS build commands
├── run.ps1                                       # Windows PowerShell automation helper
├── pytest.ini                                    # Pytest configuration
└── README.md                                     # Project overview and quickstart guide
```

---

# Data Connectors Implemented

In strict alignment with the verified data sources from Phase 2, the following connectors were implemented under `services/ingestion/src/providers/`:

| Provider | Data Scope | Protocol / Endpoint | Status | Credentials |
| :--- | :--- | :--- | :--- | :--- |
| **`OpenMeteoWeatherProvider`** | $T_{2\text{m}}$, $RH$, $P_{\text{sfc}}$, Wind, PBLH, Multi-level temperatures ($80\text{m}, 120\text{m}, 180\text{m}$) | REST (`api.open-meteo.com/v1/forecast`) | **Operational** | Free tier, no API key required |
| **`OpenAqAirQualityProvider`** | CPCB criteria pollutants ($PM_{2.5}, PM_{10}, NO_2, SO_2, CO, O_3$) across 20 Delhi NCR stations | REST (`api.openaq.org/v3/locations`) | **Operational** | `OPENAQ_API_KEY` placeholder (fallback to open endpoints) |
| **`NasaFirmsFireProvider`** | VIIRS 375m NRT active fire hotspots and Fire Radiative Power (FRP) in Punjab/Haryana/NCR | REST (`firms.modaps.eosdis.nasa.gov/api/country/csv/`) | **Operational** | `NASA_FIRMS_MAP_KEY` placeholder |
| **`CamsChemicalProvider`** | Global atmospheric composition forecasts ($PM_{2.5}, PM_{10}, NO_2, O_3, SO_2, CO, \text{AOD}$) | REST (`air-quality-api.open-meteo.com/v1/air-quality`) | **Operational** | Free tier, open access |

Each provider inherits from `BaseProvider` and implements the canonical contract:
`fetch()` $\rightarrow$ `validate()` $\rightarrow$ `normalize()` $\rightarrow$ `store()`.

---

# Database Status

- **Engine Support:** SQLAlchemy 2.0 connection pool with automatic dialect detection.
- **Production Dialect:** PostgreSQL 16 + TimescaleDB (hypertable chunking on observations and forecasts) + PostGIS (spatial geometries).
- **Development Fallback:** Automatically initializes `data/vayudrishti.db` (SQLite) if no remote PostgreSQL database is detected, allowing immediate out-of-the-box local operation.
- **Entities Defined:**
  1. `locations`: Geographic domains and regional metadata.
  2. `monitoring_stations`: CAAQMS physical station metadata, coordinates, elevation, status.
  3. `weather_observations`: Multi-level temperature, wind, humidity, pressure, PBLH, lapse rate.
  4. `air_quality_observations`: Hourly criteria pollutants and computed NAQI.
  5. `model_runs`: Execution tracking, engine version, configuration hash, execution status.
  6. `forecasts`: 72-hour hourly forecasts by pollutant and horizon.
  7. `fire_events`: VIIRS fire points, latitude/longitude, acquisition time, FRP, confidence.
  8. `alerts`: Regulatory alerts (GRAP stages, severe inversion advisories).
- **Seeded Data:** 20 verified CPCB Delhi NCR CAAQMS stations pre-seeded and verified.

---

# API Status

The FastAPI backend (`apps/api/src/main.py`) is fully functional and serving requests:
- **Root Health Check:** `GET /health` returns `200 OK` with JSON payload confirming database connectivity, active providers, and operational environment.
- **Interactive Documentation:** Automatically generated OpenAPI Swagger UI (`/docs`) and ReDoc (`/redoc`).
- **Route Modules:**
  - `GET /api/v1/locations/stations`: Returns list of seeded CAAQMS stations.
  - `GET /api/v1/observations/latest`: Returns real-time or cached station observations.
  - `GET /api/v1/forecasts`: Serves 72-hour forecast payloads (currently honest empty state).
  - `GET /api/v1/fires/recent`: Serves active fire points.
  - `GET /api/v1/inversion/latest`: Returns lapse rate and ITSI inversion diagnosis.
  - `GET /api/v1/plume/trajectory`: Trajectory smoke dispersion points.
  - `GET /api/v1/alerts/active`: Active GRAP regulatory alerts.
- **Quality & Middleware:** CORS middleware, lifespan database initialization, and structured JSON error formatting.

---

# Frontend Status

The Next.js 14 frontend (`apps/web`) is fully scaffolded, styled, and verified:
- **Build Verification:** Compiles cleanly with `npm run build` (Exit code: 0, all 9 routes generated without warnings).
- **Design Philosophy:** Premium dark mode UI, custom CSS variables, responsive typography, and glassmorphic card elements.
- **Strict Anti-Fabrication Rule:**
  - **Zero fake live AQI or random numbers are presented as real.**
  - Every page (/forecast, /alerts, /map) provides informative, professional empty states explaining that forecast generation begins in Phase 4.
  - Live system telemetry is accurately retrieved from the backend `/health` and `/api/v1/locations/stations` endpoints.
- **Core Views Created:**
  - `/` (Command Center): Atmospheric Trapping Index, PBL Height, Active Stubble Fires, System Health.
  - `/forecast`: Multi-horizon forecast view with clear Phase 4 onboarding indicator.
  - `/map`: Multi-scale domain viewer and WebGL MapLibre container.
  - `/stations`: Live table listing the 20 seeded CAAQMS stations with coordinates and operational status.
  - `/alerts`: Regulatory GRAP enforcement empty state.
  - `/status`: System health, DB persistence, and provider telemetry.

---

# Testing Status

The automated test suite in `tests/` executes with pytest and validates core functional components:
- **`test_validator.py` (8 tests):** Validates valid ranges, $PM_{2.5} > PM_{10}$ rejection, extreme temperatures, coordinate boundaries, future timestamp handling, and missing fields.
- **`test_normalizer.py` (6 tests):** Validates ppm to $\text{mg/m}^3$ ($CO$), ppb to $\mu\text{g/m}^3$ ($NO_2, SO_2, O_3$), coordinate rounding, and ISO-8601 UTC timestamp strings.
- **`test_inversion.py` (5 tests):** Validates $\Gamma_{\text{low}}$ mathematical formula, neutral, strong inversion, ITSI 0–100 scaling, and ventilation index.
- **`test_aqi.py` (4 tests):** Validates CPCB sub-index piecewise breakpoints, 3-pollutant mandatory rule, Good category ($AQI \le 50$), and Severe category ($AQI > 400$).
- **`test_api_endpoints.py` (5 tests):** Validates FastAPI `/health` endpoint, station listing, empty forecast state, CORS headers, and 404 handler.
- **Execution Result:** **28 passed in 1.99s (100% pass rate)**.

---

# Docker Status

- **Manifest:** `docker-compose.yml` configures 4 microservices:
  - `vayudrishti-db`: PostgreSQL 16 + PostGIS + TimescaleDB with healthcheck.
  - `vayudrishti-cache`: Redis 7.2 alpine with healthcheck.
  - `vayudrishti-api`: FastAPI backend container with multi-stage build.
  - `vayudrishti-web`: Next.js 14 standalone container.
- **Scientific Boundary Note:** WRF-Chem is intentionally excluded from local Docker Compose containers to avoid excessive build times and RAM consumption, as documented in `docs/engineering/DOCKER.md`.
- **Local Host Status:** Docker CLI is not installed on the Windows host PATH, but all container specifications and Dockerfiles are syntactically validated and ready for production deployment environments.

---

# CI Status

- **Workflow File:** `.github/workflows/ci.yml`
- **Stages:**
  1. `backend-test`: Spins up Python 3.10, installs dependencies, initializes database, runs `pytest -v tests/`, and validates formatting with `ruff`.
  2. `frontend-build`: Spins up Node.js 20, installs npm dependencies, and runs `npm run build` to verify Next.js production bundle compilation.
- **Deployment Gate:** Automated production deployments are disabled until Phase 8.

---

# What Is Still Placeholder

In strict adherence to the Phase 3 boundary rules:
1. **WRF-Chem Operational Pipeline (`scientific/wrf/engine.py`):** Explicitly raises `NotImplementedError`. No fake scientific outputs are simulated.
2. **Direct Multi-Horizon ML Models (`ml/models/`):** Interface contract `ForecastRefinementModel` is defined and `NaivePersistenceBaseline` is implemented, but final LightGBM models are not trained yet.
3. **Plume Dispersion Engine (`services/plume/`):** Lagrangian puff transport equations are documented, but live execution is scheduled for Phase 5.
4. **Interactive WebGL Vector Map:** MapLibre GL engine container is rendered with a clean standby placeholder; live raster/vector layer streaming will be wired in Phase 4/7.

---

# Known Problems

1. **Host Docker CLI:** Windows host machine lacks a local Docker Desktop installation in the system PATH; all local testing was executed natively via Python 3.10 and Node.js v24.
2. **Live Ingestion Network Dependency:** Ingestion of live OpenAQ and NASA FIRMS feeds requires active internet and valid API keys; fallback handlers protect against missing tokens.
3. **SQLite PostGIS Spatial Limitations:** Local development uses SQLite which lacks native geospatial distance functions (`ST_DWithin`); remote PostgreSQL 16 + PostGIS must be used for spatial queries in production.

---

# Next Phase

**PHASE 4 — DATA PIPELINE + BASELINE AIR-QUALITY FORECASTING**

Phase 4 will focus on:
1. Executing scheduled continuous ingestion from Open-Meteo, OpenAQ, and NASA FIRMS into TimescaleDB.
2. Generating the 52-feature atmospheric dataset across historical monitoring records.
3. Training the baseline LightGBM direct multi-horizon models (1h to 72h).
4. Evaluating model skill against the Naive Persistence baseline using RMSE, MAE, and Index of Agreement (IOA).
5. Implementing physical post-processing guardrails to ensure zero physical violations in generated forecasts.
