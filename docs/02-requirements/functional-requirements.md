# Functional Requirements Specification

**Document ID:** `DOC-02-REQ-002`  
**System:** ATMOSYNC  
**Status:** Baseline Specification  

---

## 1. Module FR-1: Data Ingestion & Harmonization Pipeline

```
+--------------------------------------------------------------------------------------------------+
| REQUIREMENT ID: FR-INGEST-01 (Continuous CAAQMS Monitoring Station Ingestion)                    |
+--------------------------------------------------------------------------------------------------+
| Description: The ingestion worker shall poll CPCB / DPCC CAAQMS data endpoints every 60 minutes. |
| Ingested Fields: Station ID, Timestamp (UTC & IST), PM2.5, PM10, NO, NO2, NOx, NH3, SO2, CO,     |
|                  O3, Ambient Temp, Wind Speed, Wind Direction, Relative Humidity, Pressure.      |
| Validation: Reject non-numeric values, negative values for particulate concentrations, and stuck  |
|             sensors (identical reading for > 4 consecutive hours).                               |
| Storage: Insert validated records into the `observations` hypertable in TimescaleDB.             |
+--------------------------------------------------------------------------------------------------+
| REQUIREMENT ID: FR-INGEST-02 (Numerical Weather Prediction Ingestion)                            |
+--------------------------------------------------------------------------------------------------+
| Description: The system shall download GFS / ECMWF Open Data 0.25° or 0.1° GRIB2/NetCDF files    |
|              upon cycle publication (00Z, 06Z, 12Z, 18Z).                                        |
| Extracted Layers: U-wind, V-wind, Geopotential Height, Temperature, Specific Humidity at         |
|                   1000 hPa, 925 hPa, 850 hPa, 700 hPa, 500 hPa, and surface 2m T, 10m Wind.      |
| Processing: Crop bounding box to North-West India (27.0N-32.5N, 74.0E-79.5E) and store in NetCDF.|
+--------------------------------------------------------------------------------------------------+
| REQUIREMENT ID: FR-INGEST-03 (Satellite Active Fire Thermal Anomalies)                           |
+--------------------------------------------------------------------------------------------------+
| Description: Ingest NASA FIRMS VIIRS (S-NPP and NOAA-20/21) 375m active fire data and MODIS      |
|              1km active fire products via FIRMS REST API / GeoJSON endpoint every 3 hours.       |
| Extracted Fields: Latitude, Longitude, Brightness Temp (K), Fire Radiative Power (MW),           |
|                   Acquisition Date, Acquisition Time, Confidence (%).                             |
| Storage: Insert fire points within Punjab, Haryana, and NCR into the `fire_events` spatial table.|
+--------------------------------------------------------------------------------------------------+
```

---

## 2. Module FR-2: Atmospheric Physics & Inversion Diagnostics

```
+--------------------------------------------------------------------------------------------------+
| REQUIREMENT ID: FR-PHYS-01 (Planetary Boundary Layer Height Calculation)                         |
+--------------------------------------------------------------------------------------------------+
| Description: Diagnose hourly PBLH from vertical potential temperature and wind shear profiles    |
|              using the Bulk Richardson Number method:                                            |
|              Ri_b(z) = (g / theta_v0) * (theta_v(z) - theta_v0) * z / (u(z)^2 + v(z)^2)          |
|              PBLH is defined as the height z where Ri_b(z) reaches the critical value Ri_c=0.25. |
| Output: Hourly scalar PBLH (in meters above ground level) for each station and grid cell.         |
+--------------------------------------------------------------------------------------------------+
| REQUIREMENT ID: FR-PHYS-02 (Inversion Strength & Trapping Risk Categorization)                   |
+--------------------------------------------------------------------------------------------------+
| Description: Compute the thermal lapse rate in the lowest 300m layer:                            |
|              Gamma_inv = (T_300m - T_surface) / (300m - 0m)                                      |
| Classification:                                                                                  |
| - No Inversion: Gamma_inv <= 0.0 °C / 100m (Normal lapse rate)                                   |
| - Weak Inversion: 0.0 < Gamma_inv <= 1.0 °C / 100m                                               |
| - Moderate Inversion: 1.0 < Gamma_inv <= 2.5 °C / 100m                                           |
| - Strong Inversion: Gamma_inv > 2.5 °C / 100m                                                    |
| Inversion Trapping Risk Index: Scaled composite score (0 - 100) combining Inversion Strength,    |
|                                shallow PBLH (<150m), and calm wind speed (<1.5 m/s).             |
+--------------------------------------------------------------------------------------------------+
```

---

## 3. Module FR-3: Stubble-Burning Plume Transport Engine

```
+--------------------------------------------------------------------------------------------------+
| REQUIREMENT ID: FR-PLUME-01 (Forward Lagrangian Dispersion Trajectory)                           |
+--------------------------------------------------------------------------------------------------+
| Description: For detected active fire clusters in Punjab and Haryana with FRP >= 15 MW, execute   |
|              a forward Lagrangian puff dispersion simulation using 3D wind velocity fields.       |
| Calculations:                                                                                    |
| 1. Injection Height: H_inj estimated based on FRP using Sofiev / Freedman plume-rise scaling.    |
| 2. Advection: dx/dt = U(x,y,z,t), dy/dt = V(x,y,z,t).                                            |
| 3. Diffusion: Gaussian puff expansion sigma_y(t), sigma_z(t) based on Briggs dispersion curves. |
| 4. Arrival Estimation: Flag when plume perimeter intersects Delhi NCR boundary coordinates.      |
| Output: Plume polygon geometry, Estimated Time of Arrival (ETA), and projected ground-level      |
|         PM2.5 mass burden contribution (ug/m^3).                                                 |
+--------------------------------------------------------------------------------------------------+
```

---

## 4. Module FR-4: Coupled 72-Hour Air Quality Forecasting

```
+--------------------------------------------------------------------------------------------------+
| REQUIREMENT ID: FR-FORECAST-01 (Multi-Pollutant Multi-Horizon Forecast Generation)               |
+--------------------------------------------------------------------------------------------------+
| Description: Every 6 hours, generate an hourly 72-hour forecast (T+1 to T+72) for:               |
|              PM2.5, PM10, Ground-level O3, NOx, and composite Indian NAQI.                       |
| Resolution:                                                                                      |
| - Station Level: For all 40+ CPCB/DPCC monitoring stations in Delhi NCR.                         |
| - Gridded Level: 1 km x 1 km regular grid over the entire bounding box of Delhi NCR.             |
| Quality Constraints: Predictions must obey mass non-negativity (PM >= 0, O3 >= 0).              |
|                      Predicted PM2.5 must never exceed predicted PM10 at any space-time point.   |
+--------------------------------------------------------------------------------------------------+
| REQUIREMENT ID: FR-FORECAST-02 (National Air Quality Index Calculation)                          |
+--------------------------------------------------------------------------------------------------+
| Description: Calculate official Indian NAQI sub-indices using CPCB piecewise linear breakpoints: |
|              I_p = I_low + [(I_high - I_low) / (C_high - C_low)] * (C_p - C_low)                |
| Composite AQI is the maximum of the sub-indices where at least 3 pollutants are monitored.      |
| Map to color-coded categories: Good, Satisfactory, Moderate, Poor, Very Poor, Severe.           |
+--------------------------------------------------------------------------------------------------+
```

---

## 5. Module FR-5: Explainable AI (XAI) & Factor Attribution

```
+--------------------------------------------------------------------------------------------------+
| REQUIREMENT ID: FR-XAI-01 (Feature Contribution Breakdown)                                       |
+--------------------------------------------------------------------------------------------------+
| Description: For every station forecast at horizons T+12, T+24, T+48, and T+72, compute the      |
|              marginal contribution of key driving physical and chemical factors.                 |
| Factor Categories:                                                                               |
| 1. Boundary Layer Trapping (Shallow PBLH + Nocturnal Collapse)                                   |
| 2. Thermal Inversion Lid (Lapse Rate Inversion Intensity)                                       |
| 3. Atmospheric Stagnation (Low Horizontal Wind Speed / Ventilation Index)                        |
| 4. Upstream Biomass Smoke Advection (Stubble Plume Mass Loading)                                 |
| 5. Local Emission Persistence (Baseline Urban Activity Proxy)                                    |
| Presentation: Expose percentage bars in the dashboard answering: "Why is pollution rising?"      |
+--------------------------------------------------------------------------------------------------+
```

---

## 6. Module FR-6: Proactive Regulatory Alerts & GRAP Engine

```
+--------------------------------------------------------------------------------------------------+
| REQUIREMENT ID: FR-ALERT-01 (Automated GRAP Stage Exceedance Warning)                            |
+--------------------------------------------------------------------------------------------------+
| Description: Continuously monitor 24-hour moving averages of predicted PM2.5 and PM10:           |
| - GRAP Stage I (Poor): Projected AQI 201 - 300                                                   |
| - GRAP Stage II (Very Poor): Projected AQI 301 - 400                                             |
| - GRAP Stage III (Severe): Projected AQI 401 - 450 (or PM2.5 > 250 ug/m3 for 24h)                |
| - GRAP Stage IV (Severe+): Projected AQI > 450 (or PM2.5 > 300 ug/m3 for 24h)                    |
| Notification: Dispatch alert payload via WebSocket to active dashboard users and webhook to      |
|               external notification channels 36 to 48 hours in advance of forecasted breach.     |
+--------------------------------------------------------------------------------------------------+
```

---

## 7. Module FR-7: Interactive GIS Dashboard

```
+--------------------------------------------------------------------------------------------------+
| REQUIREMENT ID: FR-UI-01 (Interactive Geospatial Map Display)                                    |
+--------------------------------------------------------------------------------------------------+
| Description: Render interactive vector map centered on Delhi NCR featuring:                     |
| 1. Color-coded contour heatmap of PM2.5, PM10, O3, or Inversion Strength.                        |
| 2. Dynamic animated vector wind streamline particles showing wind direction and speed.          |
| 3. Interactive station pins with real-time popup cards showing current and 72-hour forecast.     |
| 4. Overlay of satellite active fire markers in Punjab/Haryana with plume dispersion polygons.    |
| 5. Timeline Scrubber: Interactive time-slider enabling playback from T+0 to T+72 at 1h steps.   |
+--------------------------------------------------------------------------------------------------+
```

---

## 8. Document Sign-off
- **Lead Software Architect:** Approved
- **Next Document:** Non-Functional Requirements (`docs/02-requirements/non-functional-requirements.md`)
