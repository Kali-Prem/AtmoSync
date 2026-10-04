# Historical Dataset Specification: Delhi NCR Winter 2023–2024

**Document ID:** `DOC-DAT-008`  
**Phase:** Phase 4 — Real Data Pipeline + Baseline Air-Quality Forecasting  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Ingested & Verified  

---

## 1. Selected Historical Period & Scientific Rationale

- **Date Range:** **October 1, 2023 to February 29, 2024** (152 consecutive days / 3,648 consecutive hours per station).
- **Domain Focus:** Delhi National Capital Territory (NCT) & contiguous NCR airshed.

### Scientific Justification:
The October 2023 to February 2024 winter window represents the **gold standard benchmark period** for Delhi NCR atmospheric pollution research:
1. **October 15 – November 15, 2023 (Stubble Smoke Influx):** Peak post-monsoon paddy residue burning in Punjab and Haryana; massive transboundary smoke plumes with wind trajectories funneled through the Indo-Gangetic Plain.
2. **November – December 2023 (Severe Inversion Trapping):** Ground-level cooling and calm synoptic conditions triggering nocturnal temperature inversions ($\Gamma_{\text{low}} > 0$) and boundary layer heights plunging below $150\text{ m}$ AGL, trapping criteria pollutants near the breathing zone ($PM_{2.5} > 400\ \mu\text{g/m}^3$).
3. **January 2024 (Cold Wave & Radiation Fog):** Persistent dense fog, high relative humidity ($RH > 90\%$), secondary aerosol aqueous phase formation, and prolonged GRAP Stage IV emergency enforcement.
4. **February 2024 (Atmospheric Transition):** Solar insolation recovery, deepening convective planetary boundary layer, and gradual dispersion/ventilation improvement ($PM_{2.5}$ transitioning from severe back towards moderate).

---

## 2. Monitoring Stations Profile

The dataset captures 5 geographically and micro-meteorologically diverse anchor stations across Delhi NCR:

| Station ID | Station Name | Region | Latitude | Longitude | Elevation | Classification / Micro-environment |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| `DL_ANAND_VIHAR` | Anand Vihar, Delhi - DPCC | East | $28.6476^\circ\text{N}$ | $77.3160^\circ\text{E}$ | $213\text{ m}$ | High-density interstate bus terminal, rail yard, and regional smoke sink. |
| `DL_PUNJABI_BAGH` | Punjabi Bagh, Delhi - DPCC | West | $28.6740^\circ\text{N}$ | $77.1310^\circ\text{E}$ | $218\text{ m}$ | Mixed commercial-residential corridor with major ring road vehicular volume. |
| `DL_RK_PURAM` | R.K. Puram, Delhi - DPCC | South | $28.5632^\circ\text{N}$ | $77.1869^\circ\text{E}$ | $222\text{ m}$ | Dense residential zone subject to local domestic biomass heating and cold pools. |
| `DL_IGI_AIRPORT` | IGI Airport (T3), Delhi - IMD | Southwest | $28.5620^\circ\text{N}$ | $77.0940^\circ\text{E}$ | $228\text{ m}$ | Regional background, open runway terrain, and aviation emission source. |
| `DL_BAWANA` | Bawana, Delhi - DPCC | Northwest | $28.7762^\circ\text{N}$ | $77.0511^\circ\text{E}$ | $215\text{ m}$ | Major industrial cluster; primary northwestern inflow gateway for stubble plumes. |

---

## 3. Dataset Dimensions & Volume

- **Total Stations:** 5 stations
- **Temporal Duration:** 152 days $\times 24\text{ hours/day} = 3,648$ time steps per station
- **Total Station-Hour Records:** $5 \times 3,648 = 18,240$ multi-variate records
- **Total Atmospheric Features Acquired:** 20 core variables per record (Meteorology + Chemical Priors)

---

## 4. Ingested Variables

### 4.1 Meteorological Predictors (Open-Meteo ERA5 / NWP Blend)
- Surface: `temperature_2m` ($^\circ\text{C}$), `relative_humidity_2m` ($\%$), `surface_pressure` ($\text{hPa}$), `wind_speed_10m` ($\text{m/s}$), `wind_direction_10m` ($^\circ$), `precipitation` ($\text{mm}$).
- Atmospheric Boundary Layer: `boundary_layer_height` ($\text{m AGL}$).
- Multi-Level Temperature & Wind: `temperature_80m`, `temperature_120m`, `temperature_180m` ($^\circ\text{C}$); `wind_speed_80m`, `wind_speed_120m`, `wind_speed_180m` ($\text{m/s}$).

### 4.2 Air Quality & Chemical Priors (Copernicus CAMS EAC4 / Forecast)
- Criteria Pollutants: `pm2_5` ($\mu\text{g/m}^3$), `pm10` ($\mu\text{g/m}^3$), `nitrogen_dioxide` ($\mu\text{g/m}^3$), `ozone` ($\mu\text{g/m}^3$), `sulphur_dioxide` ($\mu\text{g/m}^3$), `carbon_monoxide` ($\mu\text{g/m}^3$).
- Optical: `aerosol_optical_depth_550nm` (dimensionless).

---

## 5. Missingness & Quality Audit

- **Meteorological Data Completeness:** $100.0\%$ (ERA5 reanalysis provides complete spatial and temporal coverage over the domain).
- **Chemical Data Completeness:** $99.8\%$ (Minor assimilation gaps in early October CAMS records resolved via monotonic cubic spline interpolation).
- **Target Observations Missingness:** Real ground sensor telemetry typically exhibits $5\% - 15\%$ missingness during severe winter condensation events. Sensor downtime is explicitly handled by isolating unobserved hours from loss evaluation.

---

## 6. Known Limitations

1. **Spatial Footprint:** 5 stations represent key cardinal quadrants and microclimates of Delhi NCT, but peripheral NCR cities (e.g., Meerut, Rohtak) are reserved for subsequent regional scaling.
2. **Reanalysis vs. Operational NWP:** ERA5 reanalysis represents post-processed assimilation (higher physical consistency than raw operational forecasts); during operational live inference in Phase 7, Open-Meteo real-time GFS/IFS cycles provide forward inputs.
