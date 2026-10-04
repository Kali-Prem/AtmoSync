# Final Recommended System Architecture & Scientific Blueprint

**Document ID:** `DOC-RES-019`  
**Phase:** Research & Data Foundation  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved & Definitive System Blueprint  

---

## 1. Executive Synthesis & Architectural Philosophy

ATMOSYNC resolves the long-standing dichotomy between computationally sluggish numerical fluid dynamics models and physically illiterate "black-box" machine learning algorithms.

By uniting **open global numerical weather and atmospheric composition models**, **microscale boundary layer physical diagnostics**, **Lagrangian agricultural smoke advection**, and **physics-constrained tree ensembles**, the architecture delivers **sub-second 72-hour multi-pollutant forecasts** with complete physical explainability.

---

## 2. Definitive Answers to the 15 Core Strategic Questions

### 1. What data sources will we actually use?
We will exclusively use four verified, open, and legally accessible primary data streams:
- **Meteorology:** Open-Meteo Weather API (ECMWF IFS / GFS downscaled grid) for live operations; ECMWF ERA5 Reanalysis for historical model training.
- **Air Quality Observations:** OpenAQ API v3 (ingesting 40+ official CPCB/DPCC Delhi NCR stations in near-real-time).
- **Synoptic Chemical Forecasts:** Copernicus Atmosphere Monitoring Service (CAMS Global composition via Open-Meteo).
- **Satellite Active Fires:** NASA FIRMS VIIRS 375m Active Fire Products (`VIIRS_SNPP_NRT`, `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`).

### 2. What is the primary weather source?
**Open-Meteo Weather API** (backed by ECMWF Integrated Forecasting System and NOAA GFS). It provides hourly forecasts out to 72 hours for $T_{2m}, RH, U_{10m}, V_{10m}, P_{sfc}$, solar radiation, and crucially, pre-diagnosed planetary boundary layer height (`boundary_layer_height`) and multi-level above-ground temperatures ($80\text{ m}, 120\text{ m}, 180\text{ m}$).

### 3. What is the primary AQ source?
**OpenAQ API v3**, acting as a high-reliability mirror of the official Central Pollution Control Board (CPCB) and Delhi Pollution Control Committee (DPCC) CAAQMS network. It provides verified hourly ground concentrations of $PM_{2.5}, PM_{10}, NO_2, SO_2, CO, O_3$.

### 4. What is the fire / stubble-burning source?
**NASA FIRMS VIIRS 375m NRT** active fire feed. It captures small, field-scale agricultural fires across Punjab and Haryana with Fire Radiative Power (FRP in Megawatts) and detection timestamps synchronized with afternoon overpasses (~12:40, 13:30, 14:20 IST).

### 5. What is the scientific model?
The scientific model is a **Dual-Engine Coupled Diagnostic & Transport Framework**:
- Atmospheric boundary layer thermodynamics (Bulk Richardson Number $Ri_b$, potential temperature lapse rates $\Gamma$, and ventilation index $VI$).
- A Forward Lagrangian Segmented Gaussian Puff Smoke Transport Model tracking parcel advection, plume rise, and downwind ground deposition.
- Regional chemical advection boundary priors from the CAMS numerical chemical transport model.

### 6. Will we actually run WRF-Chem?
**Not live during the real-time operational inference cycle or jury demonstration**, because a 72-hour 3-domain coupled WRF-Chem run requires 4 to 6 hours on an expensive 32-core cloud node. However, we maintain complete operational WRF-Chem configurations and pre-computed hindcast benchmarks.

### 7. If yes, how?
WRF-Chem is implemented as an **Offline Scientific Benchmark & Validation Module**:
- Complete configuration runbooks, `namelist.wps`, and `namelist.input` parameterized for Delhi NCR (RADM2/MADE-SORGAM chemistry, YSU PBL, RRTMG radiation with `aer_ra_feedback = 1`).
- Pre-computed 72-hour simulations for the severe November 2023 pollution episode stored in NetCDF format, enabling instant head-to-head scientific comparison against our hybrid engine.

### 8. If not, what scientifically credible alternative will be used?
We deploy **Copernicus CAMS Global Atmospheric Composition Forecasts** (ECMWF's operational supercomputer chemical transport model) blended with our **Python-vectorized physical boundary layer diagnostic engine** and **Lagrangian puff dispersion solver**. This provides authentic physical numerical forcing without requiring a local supercomputer.

### 9. Where does ML fit?
Machine learning (LightGBM multi-horizon direct ensembles) serves four specific functions:
1. **Bias correction:** Correcting coarse global model underestimations of Delhi's intense local ground concentrations.
2. **Spatial downscaling:** Mapping 40 km macro-predictions onto individual station microclimates based on elevation, highway proximity, and urban density.
3. **Uncertainty estimation:** Generating $P_{10}, P_{50}, P_{90}$ quantile confidence bands.
4. **Physical explainability:** Computing exact TreeSHAP feature attributions for regulatory decision-makers.

### 10. How is inversion detected?
Inversion is diagnosed by computing the vertical temperature lapse rate in the lowest layers of the atmosphere:
$$\Gamma_{\text{low}} = \frac{T_{80\text{m}} - T_{2\text{m}}}{78\text{m}} \times 100 \quad (^\circ\text{C}/100\text{m})$$
When $\Gamma_{\text{low}} > 0.0^\circ\text{C}/100\text{m}$, an inversion is active. It is combined with $PBLH$ and wind speed into the **Inversion Trapping Severity Index (ITSI: 0–100)**.

### 11. How is plume movement estimated?
Active fire clusters identified by DBSCAN are advected forward hourly by the forecasted horizontal wind vector field ($U_{10m}-850\text{hPa}$). Plume expansion ($\sigma_y, \sigma_z$) is computed via Briggs dispersion equations, and ground-level mass loading ($\Delta PM_{2.5}^{\text{plume}}$) entering Delhi NCR is calculated geometrically upon boundary intersection.

### 12. How are 72-hour forecasts generated?
Every 6 hours, upon publication of global NWP runs:
1. Background worker ingests weather, chemical priors, and satellite fires.
2. Physics engines compute 72-hour profiles of $PBLH$, inversion lapse rates, and plume mass contributions.
3. Direct LightGBM estimators generate hourly predictions ($T+1$ to $T+72$) for $PM_{2.5}, PM_{10}, O_3, NO_2$.
4. Physical guardrails enforce mass balance and non-negativity.
5. CPCB NAQI sub-indices and overall AQI are computed.
6. The entire 72-hour tensor for 40 stations is committed to TimescaleDB in $<11\text{ seconds}$.

### 13. How does the dashboard consume the results?
The Next.js 14 frontend queries FastAPI REST endpoints and WebSocket channels:
- Station summary cards fetch pre-computed 72-hour time-series JSON from Redis cache ($<50\text{ ms}$ latency).
- MapLibre GL JS renders animated WebGL vector wind streamlines and GeoJSON contour layers.
- An interactive timeline scrubber allows instant 60 FPS playback across lead times $T+0$ to $T+72$.
- The TreeSHAP explainability drawer visualizes the top physical drivers behind any predicted spike.

### 14. What can be demonstrated during SIH?
1. **Live NRT Forecasting:** Ingestion of today's actual live CPCB station data and live NASA FIRMS active fires.
2. **Interactive 72h Timeline Playback:** Butter-smooth 60 FPS scrubbing across the next 3 days.
3. **Plume Advection Engine:** Visualizing active fires in Punjab and forward smoke puff trajectories streaming toward Delhi.
4. **Inversion Diagnostics:** Live gauges displaying nocturnal PBL collapse, near-surface lapse rates, and the Inversion Trapping Severity Index.
5. **Regulatory Explainability:** Instant TreeSHAP attribution breakdown explaining *why* an alert was generated.
6. **Historical Benchmark Replay:** Deep-dive into the pre-computed November 2023 severe smog episode.

### 15. What remains future production work?
1. Direct coupling to NCMRWF's high-resolution Regional Unified Model (NCUM-R 4km) via institutional intranet credentials.
2. Continuous live execution of nested WRF-Chem 4.5 on the National Supercomputing Mission (Mihir/Pratyush supercomputers).
3. Ingestion of ISRO INSAT-3D/3DR rapid-scan geostationary fire products once automated APIs are released.
4. Autonomous GRAP regulatory compliance dispatch via automated government WhatsApp/SMS APIs.
