# Canonical Atmospheric Observation & Forecast Schema

**Document ID:** `DOC-DATA-009`  
**Phase:** Phase 5 — Atmospheric Variables + Inversion + Regional Fire/Plume Pipeline  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved Specification  

---

## 1. Overview & Architectural Role

In Phase 5, ATMOSYNC integrates meteorological and planetary boundary layer variables directly with air-quality observations to capture atmospheric trapping and long-range transport. This document establishes the canonical database and feature schema for atmospheric variables across both observations and Numerical Weather Prediction (NWP) forecasts.

Data sources:
- **Atmospheric Reanalysis & Observations:** Open-Meteo Historical Weather API (ERA5 / ERA5-Land Reanalysis, Copernicus Climate Change Service)
- **High-Resolution NWP Forecasts:** ECMWF IFS (Integrated Forecasting System, 0.1° / 9 km resolution) & GFS (NOAA National Centers for Environmental Prediction)
- **Vertical Level Profiles:** 2 m, 80 m, 120 m, and 180 m above ground level (AGL).

---

## 2. Canonical Column Schema

The relational schema is implemented in `database/models.py` (`weather_observations` table and TimescaleDB hypertable partition) and represented in Parquet/CSV feature stores:

| Field Name | SQL Type | Native Unit | Normalized Unit | Physical Bounds | Missing Flag | Description |
|---|---|---|---|---|---|---|
| `id` | `INTEGER` | N/A | N/A | $\ge 1$ | N/A | Primary auto-incrementing key |
| `station_id` | `VARCHAR(32)` | N/A | N/A | Non-empty | N/A | Station identifier (e.g. `DL_ANAND_VIHAR`) |
| `time` | `TIMESTAMP WITH TZ` | ISO-8601 | UTC | 2020-01-01 to Present | Rejection | Observation / valid cycle timestamp |
| `temperature_2m` | `FLOAT` | °C | °C | $-10.0$ to $55.0$ | `MISSING` | Air temperature at 2 meters AGL |
| `relative_humidity_2m` | `FLOAT` | % | % | $0.0$ to $100.0$ | `MISSING` | Relative humidity at 2 meters AGL |
| `surface_pressure_hpa` | `FLOAT` | hPa | hPa | $850.0$ to $1050.0$ | `MISSING` | Atmospheric barometric pressure at surface |
| `wind_speed_10m` | `FLOAT` | km/h or m/s | m/s | $0.0$ to $60.0$ | `MISSING` | Horizontal wind speed at 10 meters AGL |
| `wind_direction_10m` | `FLOAT` | Degrees (°) | Degrees (°) | $0.0$ to $360.0$ | `MISSING` | Meteorological wind direction (where wind is FROM) |
| `precipitation` | `FLOAT` | mm/h | mm/h | $0.0$ to $300.0$ | `IMPUTED (0.0)` | Liquid water precipitation accumulation rate |
| `direct_normal_irradiance` | `FLOAT` | $W/m^2$ | $W/m^2$ | $0.0$ to $1400.0$ | `IMPUTED (0.0)` | Direct beam solar irradiance |
| `cloud_cover` | `FLOAT` | % | % | $0.0$ to $100.0$ | `MISSING` | Total fractional cloud area fraction |
| `boundary_layer_height_m` | `FLOAT` | m | m AGL | $20.0$ to $5000.0$ | `MISSING` | Planetary boundary layer height ($PBLH$) |
| `lapse_rate_low` | `FLOAT` | °C/100m | °C/100m | $-5.0$ to $10.0$ | `MISSING` | Low-level lapse rate $\Gamma_{\text{low}}$ (2m to 180m AGL) |
| `quality_flag` | `VARCHAR(16)` | N/A | N/A | Enum | Mandatory | QC flag: `VALID`, `SUSPICIOUS`, `INVALID`, `IMPUTED` |
| `data_source` | `VARCHAR(32)` | N/A | N/A | Enum | Mandatory | Provider: `OPEN_METEO_ERA5`, `ECMWF_IFS`, `IMD_AWS` |

---

## 3. Scalable Vertical Profile Representation

To accommodate multi-level vertical profiles without altering table schemas for every isobaric or height level, vertical profiles are modeled in two standardized formats:

1. **Derived Scalar Fields in Observation Table:**
   - `temperature_2m` (Surface diagnostic)
   - `lapse_rate_low` ($\Gamma_{\text{low}}$: bulk vertical gradient between 2 m and 180 m)
2. **Profile Payload / JSON Hypertable Extension:**
   For soundings and high-resolution NWP soundings, vertical profiles are structured as:
   ```json
   {
     "soundings": [
       {"level_m_agl": 2, "temperature_c": 14.2, "rh_pct": 78.0, "wind_speed_ms": 1.2},
       {"level_m_agl": 80, "temperature_c": 16.1, "rh_pct": 72.0, "wind_speed_ms": 2.5},
       {"level_m_agl": 120, "temperature_c": 16.8, "rh_pct": 69.0, "wind_speed_ms": 3.1},
       {"level_m_agl": 180, "temperature_c": 17.0, "rh_pct": 67.0, "wind_speed_ms": 3.8}
     ],
     "method": "vertical_temperature_profile",
     "inversion_detected": true,
     "base_m": 0.0,
     "top_m": 180.0
   }
   ```

---

## 4. Metadata Dictionary

```text
variable_name: boundary_layer_height_m
source: ECMWF Reanalysis v5 (ERA5) / ECMWF Integrated Forecasting System (IFS)
provider: Copernicus Climate Change Service (C3S) / Open-Meteo
dataset: reanalysis-era5-single-levels / ifs-operational
native_unit: meters (m)
normalized_unit: meters (m)
spatial_resolution: 0.1° x 0.1° (~11 km)
temporal_resolution: 1 hour
coverage: Global (Subdomain: 26.5°N - 33.0°N, 73.5°E - 79.5°E)
quality_flag: VALID (bounds [20, 5000]), SUSPICIOUS ([0, 20]), INVALID (<0 or >5000)
availability: Operational real-time & historical 1940-present
```
