# User Personas Specification

**Document ID:** `DOC-02-REQ-004`  
**System:** ATMOSYNC  
**Audience:** Product Managers, UX Designers, Backend & Scientific Engineers  

---

## 1. Persona 1: The Operational Modeler / Meteorologist

```
+--------------------------------------------------------------------------------------------------+
| PERSONA 1: Dr. Raghav Sharma                                                                     |
| Role: Senior Scientist / Atmospheric Modeler, NCMRWF (Noida)                                     |
| Demographics: Age 44, Ph.D. in Atmospheric Sciences. 15 years experience in NWP modeling.        |
+--------------------------------------------------------------------------------------------------+
| Goals & Objectives:                                                                              |
| - Evaluate how well numerical boundary layer schemes (YSU, MYJ) capture winter nocturnal PBL.    |
| - Rapidly post-process GFS/NCUM forecasts to downscale 12 km grid outputs to 1 km Delhi stations.|
| - Inspect thermodynamic soundings, skew-T log-P diagrams, and Richardson number profiles.        |
+--------------------------------------------------------------------------------------------------+
| Frustrations & Pain Points:                                                                      |
| - Traditional WRF-Chem takes 4 hours of HPC run time; cannot update forecasts hourly.            |
| - Decoupled offline CTMs miss aerosol dimming and radiative feedback on surface heating.         |
| - Standard commercial weather dashboards treat air quality as an afterthought without raw data.  |
+--------------------------------------------------------------------------------------------------+
| Product Touchpoints:                                                                             |
| - Direct access to raw NetCDF / GeoJSON gridded 72h forecast endpoints.                         |
| - Vertical thermodynamic profile visualization (Lapse Rate, Bulk Ri_b, diagnosed PBLH).         |
| - Model validation and historical backtesting comparison dashboard.                             |
+--------------------------------------------------------------------------------------------------+
```

---

## 2. Persona 2: The Regulatory Decision-Maker

```
+--------------------------------------------------------------------------------------------------+
| PERSONA 2: Shri Vikram Malhotra                                                                  |
| Role: Member Secretary / Senior Officer, Commission for Air Quality Management (CAQM) / CPCB    |
| Demographics: Age 52, M.Tech in Environmental Engineering, Senior Civil Services Executive.      |
+--------------------------------------------------------------------------------------------------+
| Goals & Objectives:                                                                              |
| - Issue Graded Response Action Plan (GRAP) Stage III/IV restrictions 48 hours in advance.        |
| - Defend policy decisions (e.g. banning construction, truck entry) before Supreme Court & media. |
| - Clearly distinguish what portion of pollution is local traffic vs. incoming stubble burning.  |
+--------------------------------------------------------------------------------------------------+
| Frustrations & Pain Points:                                                                      |
| - Current forecasts arrive too late; actions are enforced reactively after citizens suffer.      |
| - Models give "black-box" predictions without explaining *why* air quality will deteriorate.     |
| - Inter-agency finger-pointing regarding stubble burning contribution without clear plume proofs.|
+--------------------------------------------------------------------------------------------------+
| Product Touchpoints:                                                                             |
| - Automated 48-72h GRAP Exceedance Warning alert cards.                                          |
| - Explainability Panel ("Why is pollution rising?"): Inversion % vs Plume % vs Local %.          |
| - 1-Click Executive PDF Briefing export for daily emergency ministerial meetings.                |
+--------------------------------------------------------------------------------------------------+
```

---

## 3. Persona 3: The Civic Health & Vulnerable Citizen

```
+--------------------------------------------------------------------------------------------------+
| PERSONA 3: Sunita Krishnan                                                                       |
| Role: Resident & Parent, Vasant Kunj, New Delhi                                                  |
| Demographics: Age 36, High school biology teacher, mother of an 8-year-old child with asthma.    |
+--------------------------------------------------------------------------------------------------+
| Goals & Objectives:                                                                              |
| - Plan child's outdoor sports activities and school attendance safely 24 to 48 hours in advance. |
| - Know the safest hours of the day (e.g. 13:00 - 16:00 when PBL is deep) to ventilate the home. |
| - Receive simple, actionable health advisories rather than abstract chemical formulas.          |
+--------------------------------------------------------------------------------------------------+
| Frustrations & Pain Points:                                                                      |
| - Most AQI apps only show yesterday's or current numbers; no forward timeline planning.         |
| - Confusing color scales that don't explain health precautions for vulnerable groups.            |
| - App crashes and sluggish map interfaces on mobile connections.                                 |
+--------------------------------------------------------------------------------------------------+
| Product Touchpoints:                                                                             |
| - Responsive mobile-friendly dashboard with 72h interactive scrubber slider.                     |
| - Plain-language health advisories (e.g. "Avoid morning runs between 05:00 - 09:00: Inversion").   |
| - Station pinpoint near user location showing localized hourly forecast curve.                   |
+--------------------------------------------------------------------------------------------------+
```

---

## 4. Persona 4: The Environmental Researcher & Data Scientist

```
+--------------------------------------------------------------------------------------------------+
| PERSONA 4: Aarav Deshmukh                                                                        |
| Role: Ph.D. Scholar / Data Scientist, Centre for Atmospheric Sciences, IIT Delhi                 |
| Demographics: Age 27, B.Tech + M.Tech in Computer Science, researching AI for climate science.   |
+--------------------------------------------------------------------------------------------------+
| Goals & Objectives:                                                                              |
| - Benchmark novel spatiotemporal graph neural networks against coupled WRF-Chem runs.            |
| - Analyze historical extreme winter fog and inversion episodes with high-resolution inputs.      |
| - Verify whether physics-guided loss functions improve extreme value generalization.             |
+--------------------------------------------------------------------------------------------------+
| Frustrations & Pain Points:                                                                      |
| - Fragmented datasets: CPCB station data in awkward PDFs/tables, GFS in GRIB2, fires in CSVs.    |
| - Lack of standardized benchmark train/validation/test splits for Delhi NCR air quality.         |
| - Inability to audit black-box commercial predictions.                                           |
+--------------------------------------------------------------------------------------------------+
| Product Touchpoints:                                                                             |
| - Standardized REST API documentation with OpenAPI schema definitions.                           |
| - Transparent documentation on data preprocessing, feature engineering, and model splits.        |
| - Benchmark metrics tab comparing persistence, uncoupled ML, and coupled hybrid models.          |
+--------------------------------------------------------------------------------------------------+
```

---

## 5. Document Sign-off
- **Lead Systems Architect:** Approved
- **Next Document:** Use Cases Detailed (`docs/02-requirements/use-cases.md`)
