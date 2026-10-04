# Spatial Strategy & Alignment Specification

**Document ID:** `DOC-DAT-006`  
**Phase:** Phase 4 — Real Data Pipeline + Baseline Air-Quality Forecasting  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved Specification  

---

## 1. Architectural Strategy: Station-Centric Tabular Forecasting

In accordance with `/docs/research/RECOMMENDED-ARCHITECTURE.md` and Phase 4 directives:

> **CRITICAL ARCHITECTURAL DECISION:**  
> The Phase 4 baseline modeling pipeline adopts **monitoring-station-level point forecasting**.  
> **We DO NOT prematurely attempt complex, high-resolution 2D continuous spatial gridding (e.g., 1km Eulerian meshes) during this baseline phase.**

### Rationale:
1. **Ground-Truth Calibration:** Regulatory monitors measure true air quality at discrete coordinates ($3\text{ m} - 10\text{ m}$ above ground). Establishing performance at these reference nodes creates an unassailable baseline.
2. **Computational Tractability:** Station-level tabular models train in seconds, permitting comprehensive cross-validation across all forecast horizons (+1h to +72h).
3. **Isolating Spatial Errors:** Attempting spatial interpolation or 2D raster modeling before mastering temporal persistence and meteorological coupling conflates spatial kriging artifacts with forecasting model errors.

---

## 2. Station Alignment Methodology

For each of the 20 pre-seeded Delhi NCR CAAQMS stations:

```
Station Entity (e.g. DL001 Anand Vihar)
  ├── Coordinates: Latitude, Longitude, Elevation (m MSL)
  ├── Local Air Quality Time Series: PM2.5, PM10, NO2, SO2, CO, O3 (Ground sensors)
  └── Downscaled Meteorology: T2m, RH, P_sfc, Wind, PBLH, Lapse Rate (Extracted at station Lat, Lon)
```

1. **Station Metadata Association:** Each observation record is joined with static geographic metadata:
   - `latitude`, `longitude` (WGS-84 decimal degrees to 4 decimal places)
   - `elevation_m`
   - `station_type` (Industrial, Residential, Commercial, Background)
2. **Bilinear Meteorological Extraction:** Gridded numerical weather fields (ERA5 / Open-Meteo) are sampled at the exact coordinate point of each monitoring station via bilinear spatial interpolation:
   $$M_{\text{station}}(t) = \text{Interpolate}(M_{\text{grid}}(t), \text{lat}_{\text{station}}, \text{lon}_{\text{station}})$$
3. **Station Independence vs. Global Model:** Baseline models can be trained either:
   - As single-station models specialized to localized microclimates (e.g. Anand Vihar traffic canyon vs. Lodhi Road parkland).
   - As pooled models with station-level spatial coordinates as features.
   Both strategies will be evaluated during the baseline experiments.

---

## 3. Spatial Gridding Transition (Queued for Phase 5+)

In Phase 5 and beyond, continuous spatial mapping across the entire Delhi NCR bounding box ($28.20^\circ\text{N}-28.95^\circ\text{N}$, $76.80^\circ\text{E}-77.55^\circ\text{E}$) will be realized by combining:
- The Lagrangian forward puff smoke dispersion model (for stubble plume advection).
- Spatial kriging / Gaussian process regression with elevation and land-use covariates.
- WebGL GPU vector tile rendering in MapLibre GL.
