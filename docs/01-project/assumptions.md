# Assumptions & Constraints: Air Pollution–Weather Coupled Forecasting

**Document ID:** `DOC-01-PROJ-004`  
**Problem Statement ID:** 26082  
**Status:** Living Document / Open to Experimental Validation  

---

## 1. Scientific & Atmospheric Assumptions

All numerical models and machine-learning surrogates operate on explicit scientific approximations. These assumptions are scientifically motivated but are **explicitly cataloged here as assumptions—not as inviolable truths**:

```
+--------------------------------------------------------------------------------------------------+
|                                SCIENTIFIC ASSUMPTIONS INVENTORY                                  |
+==================================================================================================+
| ASSUMP-SCI-01: Hydrostatic & Meso-beta Balance                                                   |
| For regional grid resolutions >= 3 km, the hydrostatic approximation largely holds; for the      |
| 1 km inner urban domain, non-hydrostatic pressure perturbations are driven primarily by surface  |
| heating gradients and building-roughness thermal perturbations rather than steep topography.     |
+--------------------------------------------------------------------------------------------------+
| ASSUMP-SCI-02: Bulk Richardson Number (Ri_b) for Inversion Diagnosis                            |
| In the absence of continuous high-frequency radiosonde soundings (which IMD launches only at     |
| 00:00 and 12:00 UTC at Safdarjung), vertical atmospheric stability and inversion strength are    |
| diagnosed using surface-to-boundary layer potential temperature lapse rate and Bulk Ri_b:        |
| Ri_b = (g / theta_v) * (theta_v(z) - theta_v(0)) * z / (u(z)^2 + v(z)^2)                       |
| A critical threshold Ri_crit = 0.25 separates turbulent mixing from laminar stratified flow.    |
+--------------------------------------------------------------------------------------------------+
| ASSUMP-SCI-03: Fire Radiative Power (FRP) to Biomass Emission Linear Scaling                    |
| Satellite thermal anomalies (VIIRS 375m I-band / MODIS 4um channel) provide Fire Radiative Power |
| (MW). It is assumed that PM2.5 biomass emissions scale with integrated FRP via an empirical       |
| smoke emission coefficient: E_PM2.5 = alpha * FRP * delta_t (Kaufman / Wooster empirical model).|
+--------------------------------------------------------------------------------------------------+
| ASSUMP-SCI-04: Chemical Regime Stationarity over 72-Hour Horizon                                 |
| It is assumed that urban Delhi's photochemical regime remains primarily VOC-limited during the   |
| 72-hour forecast window during winter months, meaning day-to-day fluctuations in ground ozone    |
| are dominated by solar irradiance variation and NO titration rather than massive VOC shifts.    |
+--------------------------------------------------------------------------------------------------+
| ASSUMP-SCI-05: Well-Mixed Urban Surface Layer                                                    |
| Ground-level CAAQMS sensors situated between 3m and 10m above ground level represent the average |
| concentration of the lowest surface layer cell (0 - 20m) of the atmospheric model.               |
+--------------------------------------------------------------------------------------------------+
```

---

## 2. Engineering & Technical Assumptions

| ID | Category | Assumption Detail | Impact if Violated |
| :--- | :--- | :--- | :--- |
| **ASSUMP-ENG-01** | **Latency** | Global NWP forecast fields (e.g., GFS / ECMWF Open Data 0.25° or 0.1°) are available via open APIs with a publication latency of 3.5 to 5 hours from synoptic initialization times (00Z, 06Z, 12Z, 18Z). | If delayed, the system must extrapolate the previous forecast cycle forward by up to 6 hours or rely on persistence fallback. |
| **ASSUMP-ENG-02** | **Station Coverage** | At least $75\%$ of Delhi's 40+ CAAQMS stations report non-null values for $PM_{2.5}$ and meteorological fields in any given 6-hour window. | Spatial interpolation quality degrades; spatial imputation algorithms (k-NN / Kriging) must bridge sensor outages. |
| **ASSUMP-ENG-03** | **Hardware Resources** | The demonstration environment possesses at least 8 x86_64 CPU cores, 32 GB RAM, and high-speed SSD storage. GPU acceleration is advantageous but not strictly mandatory for CPU-optimized tree-based ML inference. | Inference time increases from 45 seconds to ~3 minutes if CPU-only; still well within the operational SLA of 10 minutes. |
| **ASSUMP-ENG-04** | **Data Formats** | Weather models provide standardized NetCDF-4 or GRIB2 outputs, while CPCB provides tabular JSON/CSV endpoints. | Additional format converters and schema-validation adapters are required in the ingestion pipeline. |

---

## 3. Operational & Organizational Constraints

1. **Academic & Hackathon Time Constraints:**  
   The SIH 2026 development cycle requires an end-to-end working MVP within rapid sprints. Heavy multi-day numerical simulations cannot be executed live on-stage during a 10-minute jury presentation; they must be structured as pre-compiled hindcasts and agile inference models.
2. **Access to Proprietary Operational Feeds:**  
   Certain high-resolution operational NCMRWF NCUM model outputs and ISRO high-frequency geostationary fire products may require institutional credentials. The prototype is engineered to ingest open public equivalents (ECMWF Open Data, NOAA GFS, NASA FIRMS) with drop-in configuration adapters for MoES internal feeds upon deployment.

---

## 4. Document Sign-off
- **Lead Systems Architect:** Approved
- **Next Document:** Success Criteria (`docs/01-project/success-criteria.md`)
