# Planetary Boundary Layer (PBL) Pipeline Specification

**Document ID:** `DOC-SCI-002`  
**Phase:** Phase 5 — Atmospheric Variables + Inversion + Regional Fire/Plume Pipeline  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved Scientific Specification  

---

## 1. Physical Definition & Role in Delhi NCR Smog

The Planetary Boundary Layer (PBL) is the lowest layer of the troposphere directly influenced by Earth's surface friction and diurnal thermal heating/cooling. In Delhi NCR, the seasonal evolution of the PBL is the single largest meteorological driver of hazardous air quality:

- **Winter Nocturnal Collapse:** Radiative cooling decouples the surface layer, collapsing the boundary layer height ($h_{\text{pbl}}$) down to $50 - 150\text{ m}$ above ground level (AGL). This compresses urban emissions and advected biomass smoke into a very thin near-ground volume.
- **Summer Convective Dilution:** Intense solar insolation drives deep thermals, elevating $h_{\text{pbl}}$ to $2000 - 3500\text{ m}$, providing intense vertical dilution even under high total emissions.

---

## 2. Selected Data Sources & Diagnosis Methods

ATMOSYNC ingests $h_{\text{pbl}}$ from two verified operational numerical models:

1. **Copernicus ERA5 Reanalysis (Historical Dataset 2020–2024):**
   - **Method:** Bulk Richardson Number ($Ri_b$) method (Troen & Mahrt 1986). $h_{\text{pbl}}$ is defined as the height where the bulk Richardson number reaches a critical value $Ri_{bc} = 0.25$.
   - **Spatial Resolution:** 0.1° x 0.1° (~11 km)
   - **Temporal Resolution:** 1 hour
2. **ECMWF Integrated Forecasting System (IFS Operational NWP, 0–72h Forecast):**
   - **Method:** Operational boundary layer parameterization with non-local K-diffusion and moist eddy convection.
   - **Spatial Resolution:** 0.1° (~9 km)
   - **Temporal Resolution:** 1 hour

*Note on Observational Estimates:* Radiosonde soundings from IMD Safdarjung (00:00 and 12:00 UTC) and ceilometer backscatter lidar provide observational ground truth, but lack the hourly continuous temporal coverage required for real-time forecasting. Consequently, numerical NWP diagnosis is the primary real-time operational source, validated against radiosondes.

---

## 3. Data Quality Control & Physical Boundary Rules

Implemented in `scientific/preprocessing/pbl.py`:

| Parameter | Threshold | Quality Flag | Action |
|---|---|---|---|
| Physically Valid Range | $20.0\text{ m} \le h \le 5000.0\text{ m}$ | `VALID` | Retained as $h_{\text{pbl}}$ |
| Shallow Micro-boundary | $0.0\text{ m} \le h < 20.0\text{ m}$ | `SUSPICIOUS` | Retained with warning; sub-canopy artifact |
| Unphysical Value | $h < 0.0\text{ m}$ or $h > 5000.0\text{ m}$ | `INVALID` | Discarded, set to `null` |
| Missing / NaN Value | Value is `null` or `NaN` | `MISSING` | Set to `null`; no synthetic fabrication |

*Rule:* Missing $h_{\text{pbl}}$ values are explicitly flagged as `pbl_quality_flag = MISSING` and left as `null`. They are **never** fabricated.

---

## 4. Normalization & Derived Fields

The pipeline creates:
- `pbl_height_m`: Calibrated continuous PBL height in meters AGL.
- `pbl_contraction_ratio`: Expansion factor relative to standard daytime convective boundary layer ($1500\text{ m}$):
  $$R_{\text{pbl}} = \frac{1500.0}{\max(20.0, \text{pbl\_height\_m})}$$
- `dispersion_capacity`: CPCB/IMD ventilation classification (`CRITICAL_STAGNATION`, `MODERATE_DISPERSION`, `HIGH_DISPERSION`).

---

## 5. Limitations & Uncertainties

1. **Urban Heat Island (UHI) Discrepancy:** Coarse 0.1° NWP grid cells partially smooth the localized 1–3°C nocturnal warming in central Delhi, occasionally underpredicting nocturnal boundary layer height over dense concrete cores by 30–50 m compared to rural Haryana.
2. **Fog / Low Stratus Coupling:** Severe radiation fog (widespread during December–January in the Indo-Gangetic Plain) alters cloud-top radiative cooling, occasionally decoupling the diagnosed model PBL from the ground surface.
