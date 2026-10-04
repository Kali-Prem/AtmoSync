# ATMOSYNC End-to-End Data Pipeline Specification

**Document ID:** `DOC-DATA-011`  
**Phase:** Phase 5 — Atmospheric Variables + Inversion + Regional Fire/Plume Pipeline  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved Operational Pipeline Specification  

---

## 1. Unified Pipeline Architecture

The ATMOSYNC operational data pipeline integrates multi-modal observation and numerical forecast streams across Northwest India and Delhi NCR:

```
[CPCB/OpenAQ Stations]   [Open-Meteo ERA5 / NWP]   [NASA FIRMS VIIRS 375m]
          │                         │                          │
          ▼                         ▼                          ▼
   AQ Ingestion & QC        Weather Ingestion & QC      Fire Ingestion & QC
   (Physical range, jump)   (WMO bound, u/v, PBL)       (Bounding box, FRP, class)
          │                         │                          │
          ├─────────────────────────┴──────────────────────────┤
          │                                                    ▼
          ▼                                          Fire Spatial Clustering
   Temporal Alignment (Hourly UTC)                   & Wooster PM2.5 Flux
          │                                                    │
          ├────────────────────────────────────────────────────┤
          ▼                                                    ▼
   Feature Store Assembly                            Lagrangian Forward Puff
   (Lags, Rolling Means, Inversion,                  Trajectory Advection &
    PBL Contraction, Stagnation)                     Delhi NCR Intersections
          │                                                    │
          ├────────────────────────────────────────────────────┘
          ▼
   Multi-Horizon Feature Vector Store (42 time-causal features, zero future leakage)
          │
          ▼
   Hybrid Machine Learning Inference Engine (LightGBM GBDT, 1h to 72h lead horizons)
          │
          ▼
   Relational & Cache Persistence (`forecasts` table, TimescaleDB, Redis)
          │
          ▼
   FastAPI REST Gateway (`/api/v1/...`)
          │
          ▼
   Next.js Interactive Command Center & Scientific Diagnostics Views
```

---

## 2. Ingestion Cadence & Data Feeds

1. **Air Quality Observations (`database/seed_phase5.py`, `services/aq/`):**
   - 20 anchor CAAQMS monitoring stations across Delhi NCR.
   - Frequency: Hourly.
   - Core metrics: $PM_{2.5}, PM_{10}, NO_2, SO_2, CO, O_3$.
2. **Atmospheric Weather & Soundings (`database/seed_phase5.py`, `scientific/preprocessing/`):**
   - Reanalysis: Open-Meteo ERA5 / ERA5-Land (2020–2024).
   - NWP: ECMWF IFS / GFS 0–72h hourly forecast cycles.
   - Parameters: $T_{2m}, RH_{2m}, P_{sfc}, U_{10m}, \theta_{\text{dir}}, \text{PBLH}, \Gamma_{\text{low}}$.
3. **Active Fire Hotspots (`scientific/preprocessing/fire.py`):**
   - Satellite Sensor: VIIRS 375m (Suomi-NPP, NOAA-20, NOAA-21).
   - Regional Domain: Northwest India ($26.5^\circ\text{N} - 33.0^\circ\text{N}, 73.5^\circ\text{E} - 79.5^\circ\text{E}$).
   - Frequency: Real-time satellite overpasses (2–4 per day).

---

## 3. Strict Quality Control & Causal Integrity

- All incoming raw values undergo physical boundary validation (`tests/unit/test_validator.py`, `test_atmospheric.py`, `test_plume.py`).
- Missing values are flagged with standardized enumeration: `VALID`, `SUSPICIOUS`, `INVALID`, `MISSING`, `IMPUTED`.
- Strict Time-Causal Rule: No feature for forecast cycle $t_0$ may access observations where $t > t_0$. Data leakage tests in `tests/unit/test_plume.py` enforce this deterministically.
