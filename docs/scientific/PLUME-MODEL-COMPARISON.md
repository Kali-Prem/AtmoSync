# Atmospheric Plume & Smoke Transport Model Comparison

**Document ID:** `DOC-SCI-008`  
**Phase:** Phase 5 — Atmospheric Variables + Inversion + Regional Fire/Plume Pipeline  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Approved Scientific Evaluation  

---

## 1. Architectural Modeling Frameworks

Regional biomass smoke transport from agrarian fires in Punjab and Haryana towards the Delhi NCR receptor basin can be modeled across three distinct tiers of physical complexity.

```
+-------------------------------------------------------------------------+
| Level 1: Forward Lagrangian Segmented Puff (Operational ATMOSYNC)     |
| - Execution: Sub-second Python CPU                                      |
| - Feasibility: 100% Real-Time API ready                                 |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| Level 2: Trajectory / Particle Dispersion (HYSPLIT / FLEXPART)          |
| - Execution: Minutes (Fortran/Python)                                   |
| - Feasibility: Operational batch job on dedicated VM                   |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| Level 3: Fully Coupled Chemistry-Meteorology (WRF-Chem)                 |
| - Execution: Hours on 128+ Core HPC cluster                             |
| - Feasibility: Research / Scheduled Supercomputing Benchmark           |
+-------------------------------------------------------------------------+
```

---

## 2. Multi-Tier Comparative Matrix

| Evaluation Dimension | Level 1: Forward Lagrangian Segmented Puff (Phase 5) | Level 2: Lagrangian Particle Dispersion (HYSPLIT / FLEXPART) | Level 3: Fully Coupled Chemistry-Transport (WRF-Chem / CMAQ) |
|---|---|---|---|
| **Underlying Governing Physics** | Kinematic horizontal advection + Briggs lateral diffusion $\sigma_y(x)$ + exponential mass loss | 3D Markov chain turbulent velocity fluctuations + terrain following | 3D Navier-Stokes + Euler conservation + full gas/aqueous chemistry + aerosol thermodynamics (MOSAIC/MADE) |
| **Input Data Requirements** | 10m wind ($u, v$), PBL height, Fire FRP, and coordinates | Gridded 3D NWP fields (GDAS / GFS 0.25° or WRF output on pressure levels) | High-res 3D meteorological boundary conditions (WPS) + EDGAR/SAFAR emissions inventory + bio emissions |
| **Computational Footprint** | Extremely low (< 50 ms per cycle on single CPU core) | Low–Moderate (1–5 minutes for 10,000 particles on 4 CPU cores) | Massive (4–8 wallclock hours for a 72h forecast on 64–256 HPC cores) |
| **Spatial Resolution** | Continuous coordinate tracking (sub-kilometer trajectory) | Grid-independent particle coordinates | 3 km – 9 km Eulerian fixed grid cells |
| **Temporal Frequency** | Sub-hourly on demand via REST API | Hourly batch cycles | 6-hourly or 24-hourly forecast cycle runs |
| **Aerosol Chemistry & Aging** | Empirical first-order decay ($\tau \approx 36\text{ h}$) | First-order radioactive/chemical decay + resistance dry deposition | Full secondary aerosol formation ($SO_4, NO_3, NH_4$, SOA), aerosol-radiation feedback, optical depth |
| **Local Feasibility** | **100% Executable Locally** without external compiled binaries | Requires compiled Fortran binaries and multi-GB GRIB2 meteorological downloads | **Unfeasible on standard laptop/cloud VM**; requires NCMRWF PARAM supercomputer |
| **Operational Designation** | **Selected for Phase 5 Operational API & Feature Store** | Scheduled for Phase 6 Batch Pipeline Integration | Documented for future supercomputing deployment |

---

## 3. Justification for Phase 5 Implementation

ATMOSYNC explicitly adopts **Level 1 (Forward Lagrangian Segmented Puff)** for Phase 5 because:
1. **Immediate Execution:** It executes deterministically within the FastAPI REST lifecycle and Next.js frontend without stalling API request threads.
2. **Physical Interpretability:** Every calculation (alignment cosine, FRP scaling, PBL collapse multiplier) is mathematically explicit and auditable by Ministry of Earth Sciences adjudicators.
3. **Zero Data Fabrication:** It operates strictly on verified real inputs (Open-Meteo ERA5 / NWP wind and NASA FIRMS VIIRS FRP).
4. **Leakage Protection:** Operates with strict historical cutoff timestamps, ensuring zero future information leaks into forecasting models.
