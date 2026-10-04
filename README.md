# ATMOSYNC
### Air Pollution–Weather Coupled Forecasting System for Delhi NCR
**SIH 2026 — Problem Statement ID: SIH-26082**  
*Host Organization:* Ministry of Earth Sciences (MoES) / National Centre for Medium Range Weather Forecasting (NCMRWF)

[![CI](https://github.com/vayu-drishti/sih-26082/actions/workflows/ci.yml/badge.svg)](.github/workflows/ci.yml)
[![FastAPI](https://img.shields.io/badge/API-FastAPI%200.110+-009688.svg?logo=fastapi&logoColor=white)](apps/api)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black.svg?logo=next.js&logoColor=white)](apps/web)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python&logoColor=white)](https://python.org)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016%20%7C%20TimescaleDB-336791.svg?logo=postgresql&logoColor=white)](database)
[![License](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)

---

## 1. System Overview

**ATMOSYNC** is an air pollution–weather coupled forecasting system focused on high-resolution air-quality forecasting for Delhi NCR, combining atmospheric conditions, pollution observations, regional fire activity, plume transport indicators, and physics-informed machine learning.

The system couples Numerical Weather Prediction (NWP) dynamics, boundary layer and thermal inversion diagnostics, satellite-derived biomass burning (stubble) plume transport, and machine learning refinement to provide 72-hour hourly forecasts of criteria pollutants ($PM_{2.5}, PM_{10}, NO_2, SO_2, CO, O_3$) and official CPCB National AQI (NAQI).

### Feature & Capability Status

- **Implemented Features:**
  - Automated data ingestion for Open-Meteo ERA5 / NWP weather variables, OpenAQ air quality telemetry, and NASA FIRMS VIIRS active fire hotspots.
  - Multi-stage physical quality control, physical bounds validation, and unit normalization pipeline.
  - Near-surface thermal inversion diagnostic ($\Gamma_{low}$ lapse rate), boundary layer ventilation index, and Inversion Trapping Severity Index (ITSI: 0–100).
  - NASA FIRMS fire spatial clustering and forward Lagrangian puff plume dispersion screening.
  - Multi-horizon direct baseline models (LightGBM multi-horizon, diurnal profile, naive persistence) evaluated against 18,240 station-hour winter benchmark records.
  - Full-stack FastAPI REST backend (v1) and Next.js 14 Web Command Dashboard with Light theme default.
  - SQLite local developer fallback with 20 pre-seeded CAAQMS stations and automated test suite (53 tests).
- **Planned Features:**
  - Staggered multi-model ML ensemble training with dynamic atmospheric feature gating (Phase 6).
  - Real-time automated CAQM GRAP stage compliance alerting via webhook dispatch.
  - WebGL vector streamline shader overlay on interactive MapLibre canvas.
- **Research Components:**
  - 20+ verified scientific whitepapers and architecture decision records in `docs/research/`.
  - Continuous evaluation metrics (MAE, RMSE, R², IOA) across 152 winter days (Oct 2023 – Feb 2024).
- **WRF-Chem Status:**
  - Operational interface, WPS geographic domain boundaries (D01 9km, D02 3km, D03 1km), and namelists specified in `scientific/wrf/`.
  - Heavy HPC WRF-Chem runs execute asynchronously on dedicated supercomputing clusters and communicate with ATMOSYNC via standardized netCDF/grib2 data exchange contracts (documented in `docs/research/WRF-CHEM-FEASIBILITY.md` and `docs/engineering/DOCKER.md`).

### Architecture at a Glance

```
DATA INGESTION (Open-Meteo, OpenAQ, NASA FIRMS, CAMS)
       │
       ▼
DATA VALIDATION & QUALITY CONTROL (Physical Ranges, Ratio Checks, Timestamps)
       │
       ▼
DATA STORAGE (PostgreSQL 16 + TimescaleDB Hypertables + PostGIS / SQLite Dev)
       │
       ▼
SCIENTIFIC PREPROCESSING (Near-Surface Inversion Γlow, ITSI, Ventilation Index)
       │
       ▼
FORECAST ENGINE INTERFACE (CAMS Physics Priors / Lagrangian Plume / WRF Interface)
       │
       ▼
ML REFINEMENT INTERFACE (Direct Multi-Horizon LightGBM / Baseline Persistence)
       │
       ▼
BACKEND REST API (FastAPI v1: Health, Stations, Obs, Forecasts, Fires, Inversion)
       │
       ▼
FRONTEND COMMAND DASHBOARD (Next.js 14, WebGL Vector Maps, Regulatory Alerts)
```

---

## 2. Monorepo Structure

```
SIH-26082/
├── apps/
│   ├── api/                   # FastAPI backend application
│   └── web/                   # Next.js 14 App Router frontend
├── services/
│   ├── ingestion/             # Modular data collectors (Met, AQ, Fire, CAMS)
│   ├── forecasting/           # Forecasting orchestration (Phase 4)
│   ├── plume/                 # Stubble smoke dispersion engine (Phase 4)
│   └── scheduler/             # Recurring job execution & retry engine
├── scientific/
│   ├── wrf/                   # WRF-Chem operational interface & namelists
│   ├── chemistry/             # Chemical mechanisms & emission models
│   └── preprocessing/         # Atmospheric inversion (ITSI) & ventilation index
├── ml/
│   ├── datasets/              # Dataset preparation routines
│   ├── features/              # 52-feature atmospheric & chemical pipeline
│   ├── models/                # Model interfaces & baseline implementations
│   ├── training/              # Model training pipelines (Phase 4)
│   ├── inference/             # Direct multi-horizon inference (Phase 4)
│   └── evaluation/            # Skill metrics (RMSE, MAE, IOA, Critical Success)
├── data/
│   ├── raw/                   # Unprocessed ingested files (.gitignore)
│   ├── interim/               # Sanitized & validated records (.gitignore)
│   └── processed/             # Normalized feature tables & hindcasts (.gitignore)
├── database/
│   ├── migrations/            # SQL DDL & TimescaleDB schema definitions
│   ├── seeds/                 # Station metadata & reference configurations
│   ├── connection.py          # SQLAlchemy 2.0 connection pool & session manager
│   └── models.py              # Declarative database models
├── configs/
│   ├── development/           # Development environment profile
│   ├── staging/               # Staging / verification profile
│   └── production/            # High-availability production profile
├── scripts/
│   └── cli.py                 # Command-line interface for pipelines and migrations
├── tests/
│   ├── unit/                  # Ingestion, validation, and inversion unit tests
│   ├── integration/           # Database and pipeline integration tests
│   ├── data/                  # Schema contract tests
│   └── api/                   # FastAPI route tests
├── docker/
│   ├── Dockerfile.api         # FastAPI container specification
│   └── Dockerfile.web         # Next.js standalone container specification
├── docs/                      # Scientific research & engineering documentation
│   ├── research/              # 20+ verified scientific whitepapers & matrices
│   └── engineering/           # Data contracts, schema definitions & audits
├── .env.example               # Template environment configuration
├── docker-compose.yml         # Container orchestration manifest
├── Makefile                   # UNIX automation targets
├── run.ps1                    # PowerShell automation script for Windows
└── README.md
```

---

## 3. Quick Start (Local Development)

### Prerequisites
- **Python:** 3.10 or higher
- **Node.js:** 18.18 or higher (tested on Node v24 LTS)
- **Git**

### 1. Clone & Set Up Python Environment
```bash
git clone https://github.com/vayu-drishti/sih-26082.git
cd SIH-26082

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install backend dependencies
pip install -r apps/api/requirements.txt
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
# Defaults work out of the box with SQLite for immediate local testing
```

### 3. Initialize & Seed Database
```bash
# Initialize schema and seed 20 Delhi NCR monitoring stations
python scripts/cli.py db init
python scripts/cli.py db seed
```

### 4. Run Automated Tests
```bash
pytest -v tests/
# Output: 28 passed in 1.99s (100% pass rate)
```

### 5. Start Backend API
```bash
uvicorn apps.api.src.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Health: [http://localhost:8000/health](http://localhost:8000/health)
- Swagger Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Station Registry: [http://localhost:8000/api/v1/locations/stations](http://localhost:8000/api/v1/locations/stations)

### 6. Start Web Frontend
```bash
cd apps/web
npm install
npm run dev
```
- Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Engineering CLI Commands

ATMOSYNC includes a dedicated unified CLI (`scripts/cli.py`):

| Command | Action |
| :--- | :--- |
| `python scripts/cli.py db init` | Initialize database tables and relations |
| `python scripts/cli.py db seed` | Seed 20 Delhi NCR CAAQMS stations |
| `python scripts/cli.py ingest weather` | Ingest Open-Meteo weather parameters |
| `python scripts/cli.py ingest air-quality` | Ingest OpenAQ / CPCB criteria pollutants |
| `python scripts/cli.py ingest fire` | Ingest NASA FIRMS VIIRS active fire hotspots |
| `python scripts/cli.py data validate` | Run physical validation checks on sample data |

---

## 5. Docker Deployment

To launch the full stack (PostgreSQL 16 TimescaleDB + Redis + FastAPI API + Next.js Web) in production:

```bash
docker compose up -d --build
```

*Note: For scientific reasons documented in [docs/engineering/DOCKER.md](docs/engineering/DOCKER.md), WRF-Chem runs on dedicated HPC clusters and communicates via file/object exchange.*

---

## 6. Render Cloud Deployment

ATMOSYNC is configured for deployment on [Render](https://render.com) using the included [`render.yaml`](render.yaml) Blueprint:

- **`atmosync-api`**: FastAPI backend service with automated health checks (`/health`) and CAAQMS station pre-seeding.
- **`atmosync-web`**: Next.js 14 Web Command Center with responsive command dashboard.
- **`atmosync-db`**: (Optional) Managed PostgreSQL database or embedded SQLite engine.

For complete step-by-step instructions, see the [Render Deployment Guide](docs/deployment/RENDER-DEPLOYMENT.md).

---

## 7. Project Status

| Phase | Description | Status |
| :---: | :--- | :---: |
| **Phase 1** | Requirements, PRD & Architecture Specification | **COMPLETED** |
| **Phase 2** | Scientific Research & Data Verification | **COMPLETED** |
| **Phase 3** | Project Foundation & Data Engineering Setup | **COMPLETED** |
| **Phase 4** | Data Pipeline + Baseline Air-Quality Forecasting | *QUEUED* |
| **Phase 5** | Stubble Plume Dispersion & Inversion Physics Engine | *QUEUED* |
| **Phase 6** | ML Feature Engineering & Multi-Horizon LightGBM Training | *QUEUED* |
| **Phase 7** | Production Dashboard & Public Alert System | *QUEUED* |

---

## 8. License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
