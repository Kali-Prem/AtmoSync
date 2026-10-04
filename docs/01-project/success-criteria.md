# Success Criteria & Performance Targets

**Document ID:** `DOC-01-PROJ-005`  
**Problem Statement ID:** 26082  
**Target Audience:** SIH Evaluation Jury, MoES / NCMRWF Mentors, System Engineers  

---

## 1. Scientific & Modeling Success Criteria

The coupled system must demonstrably outperform standard baseline methods (persistence baseline and uncoupled statistical autoregression) across all primary metrics.

```
+---------------------------------------------------------------------------------------------------+
|                                 SCIENTIFIC PERFORMANCE CRITERIA                                   |
+=====================+========================+====================+===============================+
| Metric Parameter    | Baseline Target (SOTA) | Our Minimum Target | Target Excellence (Stretch)   |
+---------------------+------------------------+--------------------+-------------------------------+
| PM2.5 24h Lead MAE  | 45.0 ug/m^3            | <= 25.0 ug/m^3     | <= 18.0 ug/m^3                |
| PM2.5 24h Lead R^2  | 0.58                   | >= 0.78            | >= 0.85                       |
| PM2.5 72h Lead R^2  | 0.38                   | >= 0.65            | >= 0.72                       |
| Ozone (O3) 24h R^2  | 0.50                   | >= 0.72            | >= 0.80                       |
| Inversion Hit Rate  | 60% (qualitative)      | >= 82% (quantified)| >= 90% (against radiosonde)   |
| Plume Arrival Error | +/- 10 hours           | <= +/- 4 hours     | <= +/- 2 hours                |
| Mean Forecast Bias  | +/- 35 ug/m^3 (over)   | Within +/- 12 ug/m3| Within +/- 6 ug/m^3           |
+---------------------+------------------------+--------------------+-------------------------------+
```

*Note: All validation metrics will be evaluated on unseen hold-out winter test periods (specifically October 15 – December 15 test splits) featuring heavy stubble burning and inversion events.*

---

## 2. Engineering & Operational Success Criteria

### 2.1 Latency and Throughput
- **End-to-End Inference Latency:** Complete 72-hour forecast generation across all 40+ stations and $1\text{ km}$ grid cells must complete in under **180 seconds** on standard server hardware.
- **API Response Latency:** Frontend API requests for current conditions and 72-hour time-series curves must return in **$< 150\text{ ms}$** (p95) and **$< 300\text{ ms}$** (p99).
- **Map Vector Tile Render Latency:** Dynamic geospatial layer rendering (wind vector particles, AQI heatmaps, plume dispersion contours) must load in **$< 800\text{ ms}$** on client browsers.

### 2.2 System Reliability & Resilience
- **Data Pipeline Fault-Tolerance:** The ingestion pipeline must handle up to $30\%$ dropped or corrupted CAAQMS station packets without crashing, gracefully falling back to spatial kriging/interpolation.
- **Offline / Degraded Mode Execution:** If external satellite fire feeds or NWP feeds are delayed, the system must trigger cached fallback modes and alert administrators via health-check endpoints.

---

## 3. SIH Hackathon Evaluation Alignment

To achieve the highest marks during SIH 2026 jury evaluations, the platform must satisfy all judging dimensions:

| Dimension | Evaluation Criteria | Our Demonstrable Evidence |
| :--- | :--- | :--- |
| **Scientific Depth (25%)** | True weather-chemistry coupling, inversion modeling, PBL dynamics. | Dynamic coupled feedback visualization, explicit Bulk Richardson number inversion index, diurnal PBL collapse curves. |
| **Technical Innovation (20%)** | Novel dual-engine hybrid architecture, XAI integration. | Fast physics-informed downscaling, SHAP factor attribution breakdown ("Why is pollution rising?"). |
| **Practical Utility (20%)** | Relevance to MoES, CPCB, and CAQM policy enforcement. | Automated GRAP stage alert recommendation engine (triggers 48h in advance of threshold exceedance). |
| **System Engineering (15%)** | Architecture quality, code standards, data schemas, API design. | Clean microservices, Dockerized deployment, PostGIS persistence, OpenAPI documentation. |
| **UI/UX & Presentation (20%)** | Visual impact, responsive GIS map, timeline scrubber, demo story. | Interactive MapLibre/Leaflet map, wind streamlines, timeline slider from $T+0$ to $T+72$, mobile-ready glassmorphism UI. |

---

## 4. Document Sign-off
- **Lead Systems Architect:** Approved
- **Next Document:** Project Glossary (`docs/01-project/glossary.md`)
