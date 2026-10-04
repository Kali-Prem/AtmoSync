# Use Cases Specification

**Document ID:** `DOC-02-REQ-005`  
**System:** ATMOSYNC  
**Standard:** Cockburn Formal Use-Case Template  

---

## Use Case Summary Matrix

| Use Case ID | Name | Primary Actor | Pre-Conditions | Success Guarantee |
| :--- | :--- | :--- | :--- | :--- |
| **UC-01** | Multi-Source Environmental Data Ingestion | Scheduled Cron Worker | External APIs reachable | New hourly observations committed to database |
| **UC-02** | Inversion & PBL Collapse Diagnosis | Physics Core Worker | NWP profiles available | Inversion categories & PBLH computed for all grid cells |
| **UC-03** | Stubble-Burning Plume Transport Tracking | Plume Engine | VIIRS active fires ingested | Plume trajectory polygons & ETA calculated |
| **UC-04** | Coupled 72-Hour Forecast Generation | Hybrid ML/Physics Engine | Meteorology + Obs ready | Station & gridded 72h forecasts persisted |
| **UC-05** | Interactive Geospatial Scrubber Navigation | Citizen / Forecaster | Web client loaded | Map renders contours, wind vectors, and station pins |
| **UC-06** | Explainability & Driver Attribution Analysis | Regulator / Scientist | Forecast generated | Feature importance percentages displayed |
| **UC-07** | Proactive GRAP Stage Regulatory Alerting | CAQM / CPCB Official | Forecast exceeds threshold | Automated alert card & webhook notification sent |
| **UC-08** | Executive Briefing PDF Generation | Policy Maker | Recent forecast in DB | High-res downloadable PDF report generated |

---

## Detailed Use Case Specifications

### Use Case UC-02: Inversion & PBL Collapse Diagnosis

```
+--------------------------------------------------------------------------------------------------+
| USE CASE UC-02: INVERSION & PBL COLLAPSE DIAGNOSIS                                               |
+--------------------------------------------------------------------------------------------------+
| Primary Actor: Automated Physics Engine Worker                                                   |
| Trigger: Completion of NWP meteorological profile ingestion (every 6 hours)                      |
| Pre-conditions: Gridded 3D profiles of Temperature, Geopotential, U-Wind, V-Wind are in DB.      |
+--------------------------------------------------------------------------------------------------+
| Main Success Scenario:                                                                           |
| 1. System fetches vertical profiles from surface (1000 hPa) to 700 hPa for all Delhi NCR points. |
| 2. Computes virtual potential temperature theta_v at each vertical level.                         |
| 3. Evaluates Bulk Richardson Number profile:                                                     |
|    Ri_b(z) = (g / theta_v0) * (theta_v(z) - theta_v0) * z / (u(z)^2 + v(z)^2).                   |
| 4. Linearly interpolates the exact altitude z where Ri_b(z) crosses 0.25 to establish PBLH (m).  |
| 5. Calculates thermal lapse rate in the lowest 300m: Gamma = (T_300m - T_sfc) / 3.0.              |
| 6. Evaluates Inversion Intensity:                                                                |
|    - If Gamma > 2.5 °C/100m -> Strong Inversion                                                  |
|    - If 1.0 < Gamma <= 2.5 °C/100m -> Moderate Inversion                                         |
|    - If 0.0 < Gamma <= 1.0 °C/100m -> Weak Inversion                                             |
|    - If Gamma <= 0.0 °C/100m -> No Inversion (Unstable/Neutral)                                  |
| 7. Writes hourly PBLH and Inversion Status to the `inversion_events` table.                      |
+--------------------------------------------------------------------------------------------------+
| Extensions (Alternative Flows):                                                                  |
| 3a. Extreme calm wind conditions (u^2 + v^2 < 0.2 m^2/s^2 causing division by near-zero):       |
|     - System clamps minimum wind shear denominator to 0.25 m^2/s^2 to maintain numerical stability|
|     - Sets stability flag to "Extremely Stable / Stagnant".                                      |
+--------------------------------------------------------------------------------------------------+
```

---

### Use Case UC-04: Coupled 72-Hour Forecast Generation

```
+--------------------------------------------------------------------------------------------------+
| USE CASE UC-04: COUPLED 72-HOUR FORECAST GENERATION                                              |
+--------------------------------------------------------------------------------------------------+
| Primary Actor: Hybrid Coupled ML Forecasting Pipeline                                           |
| Trigger: Automated cron job (06:00, 12:00, 18:00, 00:00 UTC)                                     |
| Pre-conditions: Latest CAAQMS station observations + NWP forecast meteorological fields ingested|
+--------------------------------------------------------------------------------------------------+
| Main Success Scenario:                                                                           |
| 1. System constructs feature tensor for each station and 1 km grid point:                        |
|    - Lagged concentrations (PM2.5, PM10, O3, NO2 over past 24h)                                  |
|    - Meteorological forecast drivers (T2m, RH, Wind Speed, Wind Direction, Surface Pressure)     |
|    - Diagnosed dynamic indices (PBLH, Bulk Richardson Inversion Index, Ventilation Index)       |
|    - Stubble plume contribution term (from Lagrangian puff engine)                               |
|    - Calendar embeddings (Hour of day, Day of week, Month of year)                               |
| 2. Passes feature tensor into Physics-Constrained ML Downscaler.                                 |
| 3. Generates multi-output predictions for T+1 through T+72 for PM2.5, PM10, O3, and NOx.          |
| 4. Applies stoichiometric sanity checks:                                                          |
|    - Enforces PM2.5 <= PM10 (clamps PM2.5 to min(PM2.5, PM10))                                   |
|    - Enforces non-negativity (clamps negative values to 0.0)                                     |
| 5. Computes Indian National Air Quality Index (NAQI) for every space-time point.                 |
| 6. Persists forecasts into `forecast_values` hypertable.                                         |
| 7. Invalidates cached API responses and triggers WebSocket broadcast to active frontend clients. |
+--------------------------------------------------------------------------------------------------+
| Extensions (Alternative Flows):                                                                  |
| 1a. Missing ground station data for > 50% stations:                                              |
|     - System logs warning, executes spatial kriging across reporting stations,                   |
|     - Appends "Estimated Initialization" flag to forecast metadata.                              |
+--------------------------------------------------------------------------------------------------+
```

---

### Use Case UC-07: Proactive GRAP Stage Regulatory Alerting

```
+--------------------------------------------------------------------------------------------------+
| USE CASE UC-07: PROACTIVE GRAP STAGE REGULATORY ALERTING                                         |
+--------------------------------------------------------------------------------------------------+
| Primary Actor: Regulatory Alert Engine                                                           |
| Trigger: Commit of new 72-hour forecast run                                                      |
| Pre-conditions: Active 72-hour forecast in database                                             |
+--------------------------------------------------------------------------------------------------+
| Main Success Scenario:                                                                           |
| 1. System calculates rolling 24-hour average of predicted PM2.5 and PM10 across Delhi NCR.       |
| 2. Evaluates GRAP thresholds:                                                                    |
|    - Stage I (Poor): AQI 201 - 300                                                               |
|    - Stage II (Very Poor): AQI 301 - 400                                                         |
|    - Stage III (Severe): AQI 401 - 450 OR PM2.5 > 250 ug/m3 for 24h                              |
|    - Stage IV (Severe+): AQI > 450 OR PM2.5 > 300 ug/m3 for 24h                                  |
| 3. If predicted 24h average crosses a higher GRAP threshold at lead time T+24 to T+72:           |
|    a. Generates alert record in `alerts` table with trigger cause, lead time, and severity.       |
|    b. Dispatches high-priority WebSocket event to CAQM / CPCB dashboard sessions.                |
|    c. Formulates explainability summary: "GRAP Stage III predicted in 36h due to 80m nocturnal   |
|       PBL collapse and northwesterly stubble plume advection."                                   |
+--------------------------------------------------------------------------------------------------+
```

---

## Document Sign-off
- **Lead Software Architect:** Approved
- **Next Directory:** System Architecture (`docs/03-system-architecture/`)
