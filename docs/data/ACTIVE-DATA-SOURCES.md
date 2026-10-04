# Active Data Sources Specification

**Document ID:** `DOC-DAT-001`  
**Phase:** Phase 4 — Real Data Pipeline + Baseline Air-Quality Forecasting  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Verified & Active  

---

## 1. Overview

In strict accordance with `/docs/research/DATA-SOURCES-VERIFIED.md` and `/docs/research/DATA-SOURCE-MATRIX.md`, only verified, legally permissible, and operationally accessible data sources are integrated into the Phase 4 real data pipeline. No unverified, simulated, or fabricated data sources are utilized.

---

## 2. Active Sources Inventory

### 2.1 Open-Meteo Historical Weather Archive & Reanalysis API
- **Provider:** Open-Meteo GmbH / ECMWF / DWD / NOAA.
- **Dataset:** ECMWF ERA5 Hourly Reanalysis & High-Resolution Blend.
- **Variables:**
  - `temperature_2m` (°C)
  - `relative_humidity_2m` (%)
  - `surface_pressure` (hPa)
  - `wind_speed_10m` (km/h and m/s)
  - `wind_direction_10m` (degrees)
  - `precipitation` (mm)
  - `boundary_layer_height` (m AGL)
  - `temperature_80m`, `temperature_120m`, `temperature_180m` (°C)
  - `wind_speed_80m`, `wind_speed_120m`, `wind_speed_180m` (m/s)
- **Geographic Coverage:** Delhi NCR Bounding Box ($28.2^\circ\text{N}-28.9^\circ\text{N}$, $76.8^\circ\text{E}-77.5^\circ\text{E}$) and specific CAAQMS station point coordinates.
- **Temporal Resolution:** Hourly ($1\text{ h}$).
- **Spatial Resolution:** Point bilinear interpolation from $0.25^\circ \times 0.25^\circ$ ECMWF ERA5 / $0.1^\circ$ ICON grid (~5 km effective).
- **Access Method:** HTTPS REST GET (`https://archive-api.open-meteo.com/v1/archive` and `https://api.open-meteo.com/v1/forecast`).
- **Current Accessibility:** Operational, tested, 10,000 calls/day free tier without authentication.
- **Data License / Restrictions:** Open Database License (ODbL / CC-BY 4.0) — unrestricted for open research.
- **Purpose in Pipeline:** Authoritative source for historical and operational meteorological predictors, planetary boundary layer height, near-surface lapse rate ($\Gamma_{\text{low}}$), and atmospheric ventilation index ($VI$).

---

### 2.2 Open-Meteo / Copernicus CAMS Atmospheric Composition Archive
- **Provider:** European Centre for Medium-Range Weather Forecasts (ECMWF) / Copernicus Atmosphere Monitoring Service (CAMS).
- **Dataset:** CAMS Global Atmospheric Composition Forecasts & EAC4 Reanalysis.
- **Variables:**
  - `pm2_5` ($\mu\text{g/m}^3$)
  - `pm10` ($\mu\text{g/m}^3$)
  - `nitrogen_dioxide` ($\mu\text{g/m}^3$)
  - `ozone` ($\mu\text{g/m}^3$)
  - `sulphur_dioxide` ($\mu\text{g/m}^3$)
  - `carbon_monoxide` ($\mu\text{g/m}^3$)
  - `aerosol_optical_depth_550nm` (dimensionless)
- **Geographic Coverage:** Delhi NCR domain points.
- **Temporal Resolution:** Hourly ($1\text{ h}$).
- **Spatial Resolution:** $0.4^\circ \times 0.4^\circ$ synoptic grid downscaled to monitoring coordinates.
- **Access Method:** HTTPS REST GET (`https://air-quality-api.open-meteo.com/v1/air-quality`).
- **Current Accessibility:** Operational, tested, zero authentication required.
- **Data License / Restrictions:** Creative Commons CC-BY 4.0 (Copernicus Open Access).
- **Purpose in Pipeline:** Provides synoptic regional chemical priors and continuous background aerosol loading across Delhi NCR stations.

---

### 2.3 Central Pollution Control Board (CPCB) / OpenAQ CAAQMS Network
- **Provider:** Central Pollution Control Board (CPCB), DPCC, HSPCB, and OpenAQ Environmental Data Platform.
- **Dataset:** Continuous Ambient Air Quality Monitoring Stations (CAAQMS) Ground Observations.
- **Variables:**
  - $PM_{2.5}$ ($\mu\text{g/m}^3$)
  - $PM_{10}$ ($\mu\text{g/m}^3$)
  - $NO_2$ ($\mu\text{g/m}^3$)
  - $SO_2$ ($\mu\text{g/m}^3$)
  - $CO$ ($\text{mg/m}^3$)
  - $O_3$ ($\mu\text{g/m}^3$)
- **Geographic Coverage:** 40 monitoring stations across Delhi NCT and NCR periphery (Anand Vihar, Punjabi Bagh, R.K. Puram, Mandir Marg, IGI Airport, Bawana, Jahangirpuri, Wazirpur, Okhla Phase-2, Lodhi Road, Siri Fort, Rohini, Vivek Vihar, Patparganj, Sonia Vihar, Najafgarh, Narela, Alipur, DTU, Pusa).
- **Temporal Resolution:** Hourly ($1\text{ h}$) observations.
- **Spatial Resolution:** Point ground sensor sampling at 3–10 m AGL.
- **Access Method:** OpenAQ REST API v3 (`https://api.openaq.org/v3/locations` and `/sensors/{id}/measurements`) and direct CPCB CCR archival exports.
- **Current Accessibility:** Operational with OpenAQ API key; fallback to local cached CPCB ground observation records.
- **Data License / Restrictions:** Government Open Data License (GODL) / Open Data Commons Attribution License (ODC-BY).
- **Purpose in Pipeline:** Ground-truth training target for baseline ML models and validation benchmark for all forecast horizons.

---

### 2.4 NASA FIRMS Active Fire / Thermal Anomalies
- **Provider:** NASA Earth Observing System Data and Information System (EOSDIS) / LANCE.
- **Dataset:** VIIRS 375m Active Fire Products (`VIIRS_SNPP_NRT`, `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`).
- **Variables:** `latitude`, `longitude`, `acq_date`, `acq_time`, `confidence`, `frp` (Fire Radiative Power in MW), `daynight`.
- **Geographic Coverage:** Northwest India stubble burning zone: Punjab, Haryana, and Delhi NCR ($27.0^\circ\text{N}-32.5^\circ\text{N}$, $74.0^\circ\text{E}-78.5^\circ\text{E}$).
- **Temporal Resolution:** Multiple satellite overpasses daily (~10:30, ~12:40, ~13:30, ~14:20 local solar time).
- **Spatial Resolution:** $375\text{ m} \times 375\text{ m}$ at nadir.
- **Access Method:** HTTPS REST API (`https://firms.modaps.eosdis.nasa.gov/api/country/csv/[MAP_KEY]/...`).
- **Current Accessibility:** Operational with free developer MAP_KEY.
- **Data License / Restrictions:** NASA Open Data Policy (Unrestricted).
- **Purpose in Pipeline:** Tracks daily upstream biomass burning intensity (stubble fire count and aggregated Fire Radiative Power) for regional smoke transport features.

---

## 3. Data Flow Diagram

```
+-----------------------------------------------------------------------------------+
|                            ACTIVE INGESTION SOURCES                               |
+===================================================================================+
|  CPCB / OpenAQ Ground CAAQMS         Open-Meteo ERA5 / NWP       NASA FIRMS VIIRS |
|  - PM2.5, PM10, NO2, SO2, CO, O3     - T2m, RH, Pres, Wind, PBLH - Fire Pixels,   |
|  - 20 Delhi NCR Stations             - Multi-level Inversion     - FRP (MW)       |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                             QUALITY CONTROL ENGINE                                |
|  - Physical Range Verification (PM2.5: 0-1000 ug/m3, T: -10 to 55 C)              |
|  - Mass Ratio Check (PM2.5 <= PM10 * 1.05)                                        |
|  - Duplicate Timestamp Removal & UTC Time Alignment                               |
|  - Station Coordinate Precision Standardization                                   |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                        CANONICAL HOURLY FEATURE TABLE                             |
|  - Target: Station-level Hourly PM2.5 Concentration (ug/m3)                       |
|  - Historical Lags: t-1h, t-3h, t-6h, t-12h, t-24h                                |
|  - Rolling Stats: 6h / 24h Mean, Max, StdDev                                      |
|  - Atmospheric Dynamics: PBLH, Wind Speed/Dir, Lapse Rate (Gamma_low), ITSI       |
|  - Temporal Cyclical: Hour (sin/cos), Day-of-Week, Month                          |
+-----------------------------------------------------------------------------------+
```
