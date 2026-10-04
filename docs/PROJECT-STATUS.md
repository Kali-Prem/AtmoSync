# Project Status: ATMOSYNC

**Project Name:** ATMOSYNC  
**SIH Problem Statement:** SIH-26082  
**System:** Air Pollution–Weather Coupled Forecasting System for Delhi NCR  
**Host Organization:** Ministry of Earth Sciences (MoES) / NCMRWF  
**Current Phase:** `PHASE 5 — ATMOSPHERIC VARIABLES + INVERSION + REGIONAL FIRE/PLUME PIPELINE` (Completed — Ready for Phase 6: Coupled Scientific Model / WRF-Chem Integration + Physics-ML Hybrid Refinement)  
**Last Updated:** October 2026  

---

## 1. Overall Project Lifecycle Status

```
+---------------------------------------------------------------------------------------------------------+
|                                    PROJECT LIFECYCLE ROADMAP                                            |
+=========================================================================================================+
| PHASE 1: Architecture & Requirements Specification              | [ COMPLETED ]                         |
| PHASE 2: Scientific Research & Data Foundation Audit            | [ COMPLETED ]                         |
| PHASE 3: Project Foundation & Data Engineering Setup             | [ COMPLETED ]                         |
| PHASE 4: Data Pipeline & Baseline Air-Quality Forecasting       | [ COMPLETED ]                         |
| PHASE 5: Atmospheric Variables + Inversion + Plume Pipeline     | [ COMPLETED ]                         |
| PHASE 6: Coupled Scientific Model / WRF-Chem Integration        | [ NEXT MILESTONE ]                    |
| PHASE 7: FastAPI Backend, TimescaleDB, & Redis Integration      | [ QUEUED ]                            |
| PHASE 8: Next.js 14 Interactive WebGL Command Dashboard        | [ QUEUED ]                            |
| PHASE 9: End-to-End Evaluation, Validation & SIH Demo Packaging  | [ QUEUED ]                            |
+---------------------------------------------------------------------------------------------------------+
```

---

## 2. Completed Milestones

### 2.1 Requirements & Architectural Documentation (`/docs/01-03`)
- Problem Understanding & Scientific Domain Analysis (`problem-understanding.md`)
- Scope & Boundary Definitions (`scope.md`)
- System Requirements Specification (`SRS.md` & `PRD.md`)
- Functional & Non-Functional Specifications (`functional-requirements.md`, `non-functional-requirements.md`)
- Architecture Decision Records (`architecture-decisions.md`)
- Component Decompositions & Data Flows (`component-architecture.md`, `data-flow.md`)
- Deployment Architecture (`deployment-architecture.md`)

### 2.2 Scientific & Data Foundation Research (`/docs/research/`)
- Line-by-line documentation audit identifying gaps and assumptions (`DOCUMENTATION-AUDIT.md`)
- Rigorous verification of external Met, AQ, Fire, and Emission sources (`DATA-SOURCES-VERIFIED.md`)
- Comprehensive dataset evaluation matrix with factual justifications (`DATA-SOURCE-MATRIX.md`)
- Mathematical definition of the 3-tier Delhi NCR domain (`DELHI-NCR-DOMAIN.md`)
- WRF-Chem operational prerequisites, compilers, and physics options (`WRF-CHEM-RESEARCH.md`)
- WRF-Chem feasibility study (Options A, B, C) and hybrid recommendation (`WRF-CHEM-FEASIBILITY.md`)
- Mathematical formulation of multi-tiered baselines and targets (`BASELINE-MODELS.md`)
- Official CPCB / IIT Kanpur National AQI calculation standard (`INDIA-AQI-METHODOLOGY.md`)
- Near-surface thermal inversion lapse rates and ITSI index (`INVERSION-DETECTION.md`)
- Boundary layer height sources, volume contraction, and ventilation (`PBL-HEIGHT.md`)
- Satellite active fire products, overpass sync, and FRP smoke scaling (`STUBBLE-BURNING-DATA.md`)
- Forward Lagrangian puff dispersion vs 3D Eulerian modeling (`PLUME-MODELING.md`)
- 52-feature taxonomy and LightGBM direct multi-horizon selection (`ML-MODEL-SELECTION.md`)
- Hybrid Physics + ML integration and TreeSHAP explainability (`HYBRID-PHYSICS-ML.md`)
- Definitive 9-stage end-to-end data pipeline and TimescaleDB schemas (`DATA-PIPELINE-FINAL.md`)
- Operational cadence standards and real-time nomenclature (`REALTIME-STRATEGY.md`)
- Compute infrastructure sizing across 4 hardware tiers (`COMPUTE-REQUIREMENTS.md`)
- Transparent zero-budget and production cost analysis (`COST-ANALYSIS.md`)
- Final 15-question strategic blueprint (`RECOMMENDED-ARCHITECTURE.md`)
- Definitive technology decision table (`TECHNOLOGY-DECISIONS.md`)
- Executive research synthesis (`RESEARCH-SUMMARY.md`)

---

## 3. Verified Datasets (Ready for Ingestion)

1. **Weather (NWP):** Open-Meteo Weather API (`temperature_2m`, `relative_humidity_2m`, `surface_pressure`, `wind_speed_10m`, `wind_direction_10m`, `boundary_layer_height`, multi-level temps at 80m, 120m, 180m). Verified free tier.
2. **Air Quality (Obs):** OpenAQ API v3 (CPCB Delhi monitoring stations, hourly criteria pollutants $PM_{2.5}, PM_{10}, NO_2, SO_2, CO, O_3$). Verified open key.
3. **Chemical Priors:** Copernicus CAMS Global Atmospheric Composition Forecasts (hourly $PM_{2.5}, PM_{10}, NO_2, O_3, SO_2, CO, AOD$). Verified free tier via Open-Meteo.
4. **Active Stubble Fires:** NASA FIRMS VIIRS 375m NRT (`VIIRS_SNPP_NRT`, `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`). Verified open developer `MAP_KEY`.
5. **Historical Reanalysis:** ECMWF ERA5 hourly surface and pressure level reanalysis (1940–2024). Verified via CDS API.

---

## 4. Major Technical Decisions Locked

- **Modeling Engine:** Dual-Engine Hybrid (Numerical CAMS/NWP Physics Base + Lagrangian Stubble Plume Engine + Direct Multi-Horizon LightGBM Ensemble).
- **Inversion Metric:** Computed near-surface lapse rate ($\Gamma_{\text{low}}$) in °C/100m combined into the 0–100 Inversion Trapping Severity Index (ITSI).
- **AQI Standard:** Strict compliance with official CPCB / IIT Kanpur piecewise linear sub-index formulas and the 3-pollutant mandatory particulate rule.
- **Explainability:** Exact TreeSHAP feature attribution categorized into 5 human-readable physical drivers.
- **Database:** PostgreSQL 16 + TimescaleDB (7-day hypertables) + PostGIS spatial indexing.
- **Frontend:** Next.js 14 (App Router) + TypeScript + MapLibre GL JS (WebGL GPU vector engine) + Vanilla CSS Modules.
- **Containerization:** Docker Compose microservices orchestration.

---

## 5. Major Project Risks & Mitigations

1. **Risk:** OpenAQ or CPCB endpoint outage during hackathon jury evaluation.  
   *Mitigation:* Local Redis cache stores last 24 hours of observations; automated fallback to pre-packaged historical hindcasts if live network fails.
2. **Risk:** NASA FIRMS API rate limit during live testing.  
   *Mitigation:* Ingestion worker caches fire points in PostGIS spatial table with a 3-hour TTL, preventing redundant API requests.
3. **Risk:** Physical violations in raw ML output ($PM_{2.5} > PM_{10}$ or nocturnal ozone spikes).  
   *Mitigation:* Inviolable post-processing guardrail layer strictly enforces mass hierarchy and photochemical titration bounds.
4. **Risk:** Jury skepticism regarding WRF-Chem execution claims.  
   *Mitigation:* Transparent scientific honesty: we present full WRF-Chem namelists and pre-computed hindcast NetCDF runs, while explaining why the live system uses CAMS + LightGBM to deliver 10-second response times.

---

### 2.3 Project Foundation & Data Engineering (`/docs/engineering/`)
- Inventory audit of existing repository and host environment (`REPOSITORY-AUDIT.md`)
- Complete configuration dictionary and profile manifests (`CONFIGURATION.md`)
- 10-point data validation framework with physical sanity checks (`DATA-QUALITY-FRAMEWORK.md`)
- Canonical trace gas and meteorological unit normalizers (`DATA-NORMALIZATION.md`)
- 72-hour multi-pollutant forecast JSON data contract (`FORECAST-DATA-CONTRACT.md`)
- Structured JSON logging standards and credential masking (`LOGGING.md`)
- Docker containerization architecture and HPC boundary justification (`DOCKER.md`)
- Developer setup, test execution, and onboarding guide (`DEVELOPMENT-SETUP.md`)
- Implementation foundation report and subsystem verification (`IMPLEMENTATION-FOUNDATION.md`)
- Automated CI testing workflow (`.github/workflows/ci.yml`)
- Monorepo scaffold with FastAPI backend skeleton and Next.js 14 frontend foundation
- 28 unit and integration tests passing at 100%

---

## 3. Verified Datasets (Ready for Ingestion)

1. **Weather (NWP):** Open-Meteo Weather API (`temperature_2m`, `relative_humidity_2m`, `surface_pressure`, `wind_speed_10m`, `wind_direction_10m`, `boundary_layer_height`, multi-level temps at 80m, 120m, 180m). Verified free tier.
2. **Air Quality (Obs):** OpenAQ API v3 (CPCB Delhi monitoring stations, hourly criteria pollutants $PM_{2.5}, PM_{10}, NO_2, SO_2, CO, O_3$). Verified open key.
3. **Chemical Priors:** Copernicus CAMS Global Atmospheric Composition Forecasts (hourly $PM_{2.5}, PM_{10}, NO_2, O_3, SO_2, CO, AOD$). Verified free tier via Open-Meteo.
4. **Active Stubble Fires:** NASA FIRMS VIIRS 375m NRT (`VIIRS_SNPP_NRT`, `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`). Verified open developer `MAP_KEY`.
5. **Historical Reanalysis:** ECMWF ERA5 hourly surface and pressure level reanalysis (1940–2024). Verified via CDS API.

---

## 4. Major Technical Decisions Locked

- **Modeling Engine:** Dual-Engine Hybrid (Numerical CAMS/NWP Physics Base + Lagrangian Stubble Plume Engine + Direct Multi-Horizon LightGBM Ensemble).
- **Inversion Metric:** Computed near-surface lapse rate ($\Gamma_{\text{low}}$) in °C/100m combined into the 0–100 Inversion Trapping Severity Index (ITSI).
- **AQI Standard:** Strict compliance with official CPCB / IIT Kanpur piecewise linear sub-index formulas and the 3-pollutant mandatory particulate rule.
- **Explainability:** Exact TreeSHAP feature attribution categorized into 5 human-readable physical drivers.
- **Database:** PostgreSQL 16 + TimescaleDB (7-day hypertables) + PostGIS spatial indexing (with SQLite automated dev fallback).
- **Frontend:** Next.js 14 (App Router) + TypeScript + MapLibre GL JS (WebGL GPU vector engine) + Vanilla CSS Modules (Strictly Zero Fake Live AQI).
- **Containerization & Cloud Deployment:** Docker Compose microservices orchestration and native Render Cloud Blueprint (`render.yaml`) infrastructure.

---

## 5. Major Project Risks & Mitigations

1. **Risk:** OpenAQ or CPCB endpoint outage during hackathon jury evaluation.  
   *Mitigation:* Local Redis cache stores last 24 hours of observations; automated fallback to pre-packaged historical hindcasts if live network fails.
2. **Risk:** NASA FIRMS API rate limit during live testing.  
   *Mitigation:* Ingestion worker caches fire points in PostGIS spatial table with a 3-hour TTL, preventing redundant API requests.
3. **Risk:** Physical violations in raw ML output ($PM_{2.5} > PM_{10}$ or nocturnal ozone spikes).  
   *Mitigation:* Inviolable post-processing guardrail layer strictly enforces mass hierarchy and photochemical titration bounds.
4. **Risk:** Jury skepticism regarding WRF-Chem execution claims.  
   *Mitigation:* Transparent scientific honesty: we present full WRF-Chem namelists and pre-computed hindcast NetCDF runs, while explaining why the live system uses CAMS + LightGBM to deliver 10-second response times.

---

## 6. Phase 4 Completed: Baseline Air-Quality Forecasting Status

- **Dataset Acquired:** `VayuDrishti-DelhiNCR-Winter2023-2024` (v1.0.0). Continuous hourly time series across 152 days (Oct 1, 2023 – Feb 29, 2024; 18,240 station-hours across 5 anchor stations: Anand Vihar, Punjabi Bagh, R.K. Puram, IGI Airport, Bawana). Verified sources: Open-Meteo ERA5 Hourly Reanalysis and Copernicus CAMS Atmospheric Composition. Raw JSON files preserved with SHA256 checksums in `data/metadata/historical_manifest.json`.
- **Pipeline Status:** Fully operational end-to-end data pipeline:
  - Quality Control Engine enforcing schema, temporal order, physical ranges ($0-1000\ \mu\text{g/m}^3$), and particulate mass ratio ($PM_{2.5} \le PM_{10} \times 1.05$).
  - Quality Flags assigned: `VALID`, `MISSING`, `INVALID`, `SUSPICIOUS`, `IMPUTED`.
  - Canonical Unit Normalizer (Trace gas ppm/ppb to STP $\mu\text{g/m}^3$ and $\text{mg/m}^3$; temperatures to °C; wind to m/s).
  - Hourly UTC Temporal Alignment and station-centric spatial mapping.
  - Zero forward-looking leakage audited via `DataLeakageAuditor`.
- **Baseline Models Implemented & Evaluated:**
  1. `Baseline 1 — Naive Persistence:` Projects $y(t+h) = y(t-1)$ across all horizons.
  2. `Baseline 2 — Statistical Diurnal + Rolling Mean:` Combines station diurnal hour-of-day climatology with trailing 24h rolling average ($\alpha = 0.4$).
  3. `Baseline 3 — LightGBM Direct Multi-Horizon Regressor:` 7 independent gradient boosted tree models ($+1\text{h}$, $+3\text{h}$, $+6\text{h}$, $+12\text{h}$, $+24\text{h}$, $+48\text{h}$, $+72\text{h}$) trained with 150 estimators, learning rate 0.05, early stopping on validation partition.
- **Evaluation Status:** Rigorously evaluated on strictly held-out temporal partition (Feb 1–29, 2024; 3,480 samples) across MAE, RMSE, $R^2$, and MBE. Segmented by CPCB severity tiers (Normal, High, Severe). Station breakdowns generated. 8 publication research plots stored in `reports/figures/`.
- **Current Best Model:**
  - For $T+1\text{h}$ to $T+12\text{h}$: LightGBM dominates ($+1\text{h}$ MAE $6.69\ \mu\text{g/m}^3$, $R^2 = 0.895$ vs. Persistence MAE $9.26\ \mu\text{g/m}^3$; $+3\text{h}$ MAE $10.21\ \mu\text{g/m}^3$ vs. $15.81\ \mu\text{g/m}^3$; $+6\text{h}$ MAE $15.37\ \mu\text{g/m}^3$ vs. $20.19\ \mu\text{g/m}^3$; $+12\text{h}$ MAE $17.36\ \mu\text{g/m}^3$ vs. $20.65\ \mu\text{g/m}^3$).
  - For $T+24\text{h}$ to $T+72\text{h}$: Diurnal persistence remains strong ($+24\text{h}$ MAE $18.67\ \mu\text{g/m}^3$), confirming that without forward NWP wind fields and upstream stubble plume advection, pure tabular models degrade at extended horizons.
- **Major Limitations Identified:** Station-level point models lack regional advection; no forward dynamic plume transport; absence of photochemical kinetics.
- **WRF-Chem Status:** Scientific namelists and hindcast NetCDF profiles cataloged as benchmark reference. Live operational path locked on CAMS chemical priors + Lagrangian smoke puff advection + LightGBM to maintain sub-10s inference.
- **API & UI Integration:** FastAPI backend exposing real historical observations (`/api/v1/observations/latest`, `/history`) and baseline forecasts (`/api/v1/forecasts/stations/{id}`, `/models`, `/freshness`). Next.js 14 frontend displaying station registry, live forecast curves, and model metadata on localhost:3000.

---

## 7. Phase 5 Completed: Atmospheric Variables + Inversion + Regional Fire/Plume Pipeline

- **Atmospheric Engineering:**
  - WMO standard vector conversions (`met_to_uv`, `uv_to_met`) and cyclical compass direction representations ($\sin, \cos$).
  - Great-Circle bearing/distance calculations and directional transport alignment towards the Delhi NCR target domain.
  - Planetary boundary layer ($PBLH$) range validation, atmospheric volume contraction ratio ($R_{\text{pbl}} = 1500 / \max(20, h)$), and CPCB/IMD ventilation index categories.
- **Inversion Detection & Severity:**
  - Multi-level vertical temperature profile analysis (2m, 80m, 120m, 180m AGL) detecting `SURFACE_BASED_INVERSION`, `ELEVATED_INVERSION`, `STABLE_LAYER`, and `NEUTRAL_UNSTABLE`.
  - Continuous physical lapse rate gradient $\Gamma_{\text{low}}$ (°C/100m) and calibrated Inversion Trapping Severity Index (ITSI: 0 - 100).
  - Graceful fallback when vertical soundings are unavailable (`inversion_detection_method = "unavailable"`, no synthetic data).
- **Regional Fire Radiometry:**
  - NASA FIRMS VIIRS 375m active fire processing across Northwest India ($26.5^\circ\text{N} - 33.0^\circ\text{N}, 73.5^\circ\text{E} - 79.5^\circ\text{E}$).
  - Scientific classification distinguishing `stubble_burning_candidate` (agrarian Punjab/Haryana in harvest window), `biomass_burning_candidate`, and generic `fire_detection`.
  - Wooster et al. (2005) $E_{\text{PM2.5}} = 0.024 \times \text{FRP}$ particulate smoke emission fluxes.
  - Hotspot spatial clustering within 15 km threshold into coherent regional fire events.
- **Wind-Based Plume Transport Engine:**
  - Forward Lagrangian Segmented Puff advection along $(u, v)$ velocity vectors with Briggs rural Gaussian lateral dispersion $\sigma_y(x)$ and exponential mass loss timescale ($\tau \approx 36\text{ h}$).
  - Intersection checks against the Delhi NCR receptor bounding box ($28.20^\circ\text{N} - 28.95^\circ\text{N}, 76.80^\circ\text{E} - 77.55^\circ\text{E}$).
  - Transparent, continuous Plume Risk Score ($S_{\text{plume}}$: 0 - 100) combining alignment, source strength, transport speed, and boundary-layer trapping.
- **Feature Store & Causal Integrity:**
  - Extended canonical feature store (`data/features/delhi_ncr_features.csv`) from 36 to 42 time-causal features.
  - Strict mathematical verification that future observations ($t > t_0$) cannot enter historical forecast features.
- **4-Episode Event Validation:**
  - Validated against real 2023–2024 winter episodes: Case A (Winter Inversion Stagnation), Case B (High Fires with Deflected Wind), Case C (High Fires + Direct NW Transport Corridor), and Case D (Severe Winter Smog without Fires).
- **REST API & Developer Scientific Views:**
  - Exposed `/api/v1/atmosphere/`, `/api/v1/inversion/`, `/api/v1/fires/`, and `/api/v1/plume/` endpoints.
  - Developed interactive Next.js diagnostic views at `/atmosphere`, `/inversion`, and `/plume`.
- **Testing & Documentation:**
  - 53/53 unit and API tests passing.
  - Created all 10 mandated scientific specifications in `docs/scientific/` and `docs/data/`.
  - Generated comprehensive `docs/scientific/PHASE-5-REPORT.md`.
- **WRF-Chem Status:**
  ```text
  WRF-Chem status: NOT INTEGRATED (HPC namelists and domain grid documented; operational hybrid uses CAMS + Forward Lagrangian Segmented Puff approximation)
  ```

---

## 8. Next Implementation Phase: Phase 6 (Coupled Scientific Model / WRF-Chem Integration + Physics-ML Hybrid Refinement)

Upon receiving user instruction to proceed to Phase 6, the engineering team will execute:
1. Coupling the 42-variable atmospheric-transport feature store into the multi-horizon ML models (+1h to +72h).
2. Quantile loss training ($P_{10}, P_{50}, P_{90}$) for formal uncertainty bounds.
3. Offline WRF-Chem benchmark comparisons against CAMS-Lagrangian hybrid forecasts.
4. TreeSHAP physical attribution decomposition (local vs. stubble vs. inversion contributions).


