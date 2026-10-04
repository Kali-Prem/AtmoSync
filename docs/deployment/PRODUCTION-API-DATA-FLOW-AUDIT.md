# ATMOSYNC — PRODUCTION API DATA FLOW AUDIT & FIX REPORT
**Smart India Hackathon 2026 — Problem Statement SIH-26082**  
*Air Pollution–Weather Coupled Forecasting System for Delhi NCR*

---

## 1. PRODUCTION SERVICE IDENTIFIERS

- **Production Frontend URL**: `https://atmosync-web.onrender.com`
- **Production Backend URL**: `https://atmosync-api.onrender.com`

---

## 2. API CLIENT & ENVIRONMENT CONFIGURATION

- **API Client File**: [`apps/web/src/lib/api.ts`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/apps/web/src/lib/api.ts)
- **Frontend API Environment Variable**: `NEXT_PUBLIC_API_URL`
- **Render Service Binding**: Configured in [`render.yaml`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/render.yaml) via `fromService: type: web, name: atmosync-api, property: host`.
- **Client Base URL Normalization**:
  ```typescript
  function getBaseUrl(): string {
    let base = process.env.NEXT_PUBLIC_API_URL || 'https://atmosync-api.onrender.com';
    if (base.startsWith('localhost') || base.startsWith('127.0.0.1')) {
      base = `http://${base}`;
    } else if (!base.startsWith('http://') && !base.startsWith('https://')) {
      base = `https://${base}`;
    }
    return base.replace(/\/+$/, '');
  }
  ```
- **Diagnostics**: `safeApiFetch` safely logs HTTP method, target URL, response status, and connection errors without logging credentials or private payloads.

---

## 3. COMPREHENSIVE ENDPOINT AUDIT MATRIX

| Page / Component | Frontend Fetch Function | Production URL | HTTP Method | Production Status | JSON Valid | UI Renders |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Health Check** | `fetchHealth()` | `https://atmosync-api.onrender.com/health` | `GET` | `200 OK` | Yes | Yes |
| **Stations** | `fetchStations()` | `https://atmosync-api.onrender.com/api/v1/locations/stations` | `GET` | `200 OK` | Yes | Yes |
| **Latest Telemetry** | `fetchLatestObservations()` | `https://atmosync-api.onrender.com/api/v1/observations/latest` | `GET` | `200 OK` (with fallback) | Yes | Yes |
| **Inversion Status** | `fetchInversionStatus()` | `https://atmosync-api.onrender.com/api/v1/inversion/status` | `GET` | `200 OK` | Yes | Yes |
| **Atmospheric State**| `fetchAtmosphereCurrent()` | `https://atmosync-api.onrender.com/api/v1/atmosphere/current` | `GET` | `200 OK` | Yes | Yes |
| **Models Metadata** | `fetchModelMetadata()` | `https://atmosync-api.onrender.com/api/v1/forecasts/models` | `GET` | `200 OK` | Yes | Yes |
| **Data Freshness** | `fetchDataFreshness()` | `https://atmosync-api.onrender.com/api/v1/forecasts/freshness` | `GET` | `200 OK` | Yes | Yes |
| **Station Forecast** | `fetchStationForecast(code)` | `https://atmosync-api.onrender.com/api/v1/forecasts/stations/DL_ANAND_VIHAR` | `GET` | `200 OK` | Yes | Yes |
| **Active Fire Hotspots**| `fetchFireClusters()` | `https://atmosync-api.onrender.com/api/v1/fires/clusters` | `GET` | `200 OK` | Yes | Yes |
| **Plume Risk** | `fetchPlumeRisk()` | `https://atmosync-api.onrender.com/api/v1/plume/risk` | `GET` | `200 OK` | Yes | Yes |

---

## 4. CORS VERIFICATION

- **Status**: **PASS**
- **Test Request**:
  ```bash
  curl -i -X OPTIONS \
    -H "Origin: https://atmosync-web.onrender.com" \
    -H "Access-Control-Request-Method: GET" \
    https://atmosync-api.onrender.com/api/v1/locations/stations
  ```
- **Response Headers Verified**:
  - `Access-Control-Allow-Origin: https://atmosync-web.onrender.com`
  - `Access-Control-Allow-Credentials: true`
  - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH`
  - `Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With`

---

## 5. RESPONSE SCHEMA & CONTRACT VERIFICATION

- **Status**: **PASS**
- **Stations Endpoint**: Returns JSON array of objects conforming to `MonitoringStationResponse` (`station_code`, `name`, `provider`, `latitude`, `longitude`, `elevation_m`, `status`).
- **Forecast Endpoint**: Returns JSON object with `forecast_horizons` array (+1h, +3h, +6h, +12h, +24h, +48h, +72h) containing `predicted_pm25_ugm3`, `derived_aqi`, `aqi_category`, `model_type`.
- **Plume & Fire Endpoint**: Returns `plume_influence_score`, `plume_influence_level`, `sample_trajectories`, and `ambient_meteorology`.
- **Observations Endpoint**: Returns `status` (`SUCCESS` or `EMPTY`), `count`, `timestamp_utc`, and `records` array. Frontend table safely handles `records`, `status === 'EMPTY'`, and network failure states.

---

## 6. DATABASE VERIFICATION

- **Status**: **PASS**
- **Table Registry**: 10 canonical locations and 20 CAAQMS monitoring stations are seeded into the database.
- **Enhanced Seeding Pipeline**: `scripts/cli.py db seed` now executes `seed_phase5.seed_database()`, populating:
  - 18,240 records in `weather_observations`
  - 18,240 records in `air_quality_observations`
  - 528 active fire events in `fire_events`
- **Fallback Hierarchy**: Even if `data/processed/delhi_ncr_winter_2023_2024.csv` is absent, the backend falls back to `data/features/delhi_ncr_features.csv` and database tables.

---

## 7. BROWSER NETWORK & LOCAL PRODUCTION SIMULATION

- **Status**: **PASS**
- Next.js production build (`next build`) was run with `NODE_ENV=production` and verified against `https://atmosync-api.onrender.com`.
- Production server verified rendering all 7 primary views:
  1. `/` (Dashboard): Renders 5 anchor monitoring stations with PM2.5, PM10, NO2, Temp, Wind Speed, PBLH, and ITSI.
  2. `/stations`: Renders all CAAQMS monitoring stations from live DB.
  3. `/forecast`: Renders 72-hour discrete multi-horizon trajectories (+1h to +72h).
  4. `/inversion`: Renders ITSI gauge, lapse rate, and PBLH boundary layer parameters.
  5. `/plume`: Renders NASA FIRMS fire hotspots and forward Lagrangian trajectory steps.
  6. `/atmosphere`: Renders planetary boundary layer dynamics and station-level meteorological tables.
  7. `/status`: Renders platform system health and database persistence status.

---

## 8. ROOT CAUSE SUMMARY

1. **Processed Dataset Ignored in Git**: `.gitignore` contained `data/processed/*`, causing `data/processed/delhi_ncr_winter_2023_2024.csv` to be omitted from git commits pushed to Render.
2. **Missing Ingestion Fallback in Router**: [`apps/api/src/routers/observations.py`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/apps/api/src/routers/observations.py) strictly depended on `PROCESSED_FILE` without checking `data/features/delhi_ncr_features.csv` (which was already in git) or the database tables.
3. **Database Seeding Scope**: Render startup runs `python scripts/cli.py db seed`, which previously only seeded monitoring stations and omitted Phase 5 observation records.
4. **Indefinite Frontend Loading State**: Next.js Server Components (`page.tsx`) rendered an indefinite loading message when `/api/v1/observations/latest` returned `status: "EMPTY"` rather than presenting an informative empty/error state.

---

## 9. FILES CHANGED

- [`.gitignore`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/.gitignore): Explicitly un-ignored `!data/processed/delhi_ncr_winter_2023_2024.csv`.
- [`apps/api/src/routers/observations.py`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/apps/api/src/routers/observations.py): Added multi-source fallback (`PROCESSED_FILE` -> `FEATURES_FILE` -> Database tables).
- [`apps/api/src/routers/inversion.py`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/apps/api/src/routers/inversion.py): Added observation dataset fallback when database table has zero ingested rows.
- [`apps/api/src/routers/atmosphere.py`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/apps/api/src/routers/atmosphere.py): Added observation dataset fallback when database table has zero ingested rows.
- [`database/seed_phase5.py`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/database/seed_phase5.py): Added feature file fallback for zero-downtime seeding.
- [`scripts/cli.py`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/scripts/cli.py): Linked Phase 5 database seeding to `python scripts/cli.py db seed`.
- [`apps/web/src/lib/api.ts`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/apps/web/src/lib/api.ts): Added safe URL normalizer, error logging, and schema fallbacks.
- [`apps/web/src/app/page.tsx`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/apps/web/src/app/page.tsx): Fixed indefinite loading state and added empty/error handling.
- [`apps/web/src/app/forecast/page.tsx`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/apps/web/src/app/forecast/page.tsx): Removed stale localhost references.
- [`apps/web/src/app/atmosphere/page.tsx`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/apps/web/src/app/atmosphere/page.tsx): Added null-safe coordinate handling.
- [`apps/web/src/app/stations/page.tsx`](file:///home/kali-prem/Downloads/SIH-26082/AtmoSync/apps/web/src/app/stations/page.tsx): Added null-safe coordinate handling.
