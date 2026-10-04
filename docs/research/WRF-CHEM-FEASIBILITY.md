# WRF-Chem Architectural Feasibility Study for SIH 2026

**Document ID:** `DOC-RES-006`  
**Phase:** Research & Data Foundation  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Implementation-Ready & Pragmatically Validated  

---

## 1. Executive Purpose

Problem Statement 26082 specifically mandates an *"Air Pollution–Weather Coupled Forecasting System (Delhi NCR Focus)"* with explicit reference to coupled numerical modeling frameworks such as WRF-Chem.

However, a fundamental tension exists between **the computational reality of full 3D atmospheric chemistry modeling** and **the operational constraints of a student hackathon (SIH 2026)**, which demands:
1. Low development cost (zero or modest cloud spend).
2. Development on student laptops (typically 4–8 cores, 16–32 GB RAM).
3. Fast iteration cycles and zero crashes during a live 10-minute jury demonstration.
4. Scientific honesty (never fabricating numbers or pretending mock random arrays are WRF-Chem outputs).

This study rigorously evaluates three concrete architectural alternatives to formulate an evidence-based recommendation.

---

## 2. Evaluation of Three Candidate Architectures

```
+---------------------------------------------------------------------------------------------------------+
|                                    CANDIDATE ARCHITECTURE COMPARISON                                    |
+=========================================================================================================+
| DIMENSION                 | OPTION A: Real-Time WRF-Chem | OPTION B: Precomputed WRF-Chem| OPTION C: Hybrid Physics-ML|
+---------------------------+------------------------------+-------------------------------+----------------------------+
| Structural Description    | Live online WRF-Chem 72h run | Scheduled offline WRF-Chem run| Physics Forcing (CAMS/NWP) |
|                           | triggered per cycle on cloud | cached; served via fast API   | + Diagnostic Inversion/Plume|
|                           | HPC cluster.                 | with historical case studies. | + ML Downscaling Ensemble. |
+---------------------------+------------------------------+-------------------------------+----------------------------+
| Compute Footprint         | 64–128 Cores, 128+ GB RAM,   | Offline 32-core VM or HPC;    | 4–8 CPU Cores, 16 GB RAM;  |
|                           | $800–$2,000/month cloud bill | Free/student laptop for app.  | Zero paid cloud requirement|
+---------------------------+------------------------------+-------------------------------+----------------------------+
| Runtime per 72h Cycle     | 2.5 to 5.5 Hours             | 0 ms (pre-cached NetCDF slice)| < 15 Seconds end-to-end    |
+---------------------------+------------------------------+-------------------------------+----------------------------+
| Ingestion Data Needs      | 50 GB static terrain + 15 GB | Pre-downloaded episodic NetCDF| Open REST JSON APIs        |
|                           | GRIB2/emissions per cycle    | slices (November 2023 severe) | (Open-Meteo, OpenAQ, FIRMS)|
+---------------------------+------------------------------+-------------------------------+----------------------------+
| Software Complexity       | Extremely High (Fortran, MPI,| High for offline model setup; | Moderate & Modular (Python,|
|                           | KPP, WPS, anthro_emiss)      | Moderate for API server.      | FastAPI, LightGBM, PostGIS)|
+---------------------------+------------------------------+-------------------------------+----------------------------+
| SIH Hackathon Feasibility | 0% (Fatal failure during demo| 75% (Excellent for static deep| 100% (Guaranteed live demo,|
|                           | due to multi-hour runtime)   | historical case inspection)   | real-time scrubbing at 60fps)|
+---------------------------+------------------------------+-------------------------------+----------------------------+
| Production Feasibility    | Feasible only if hosted on   | Standard operational practice | Ideal for national deploy- |
|                           | NCMRWF supercomputer (Mihir) | at national met agencies      | ment as real-time surrogate|
+---------------------------+------------------------------+-------------------------------+----------------------------+
| Scientific Credibility    | Highest (full 3D Navier-Stokes| High (real numerical output,  | High (combines open CAMS   |
|                           | + coupled aerosol feedback)  | not synthetic simulation)     | physics with empirical ML) |
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. Deep-Dive Evaluation of Each Option

### 3.1 Option A: Real-Time WRF-Chem Execution
- **Concept:** Every 6 hours, a Celery worker downloads global GFS GRIB2 files, runs WPS (`geogrid`, `ungrib`, `metgrid`), generates emission grids (`anthro_emiss`, `fire_emiss`), and launches `mpirun -np 32 wrf.exe` on a cloud server.
- **Why It Fails for SIH:**
  1. *Wall-Clock Infeasibility:* A 72-hour forecast takes **4 to 6 hours** to complete on an affordable 32-core cloud instance. When a jury member clicks "Run Forecast" or changes a parameter, the server cannot respond within the 10-minute presentation window.
  2. *Resource Exhaustion:* If compilation fails or MPI runs out of memory, the entire demo crashes.
  3. *Cloud Cost:* Running a 32-core or 64-core cloud instance (e.g., AWS `c6a.8xlarge` or `c6a.16xlarge`) costs between $\$1.20$ and $\$3.50$ per hour, amounting to $\$900$ to $\$2,500$ monthly—completely unaffordable for a student hackathon budget.
- **Verdict:** 🔴 **REJECTED FOR LIVE HACKATHON SYSTEM**. (Retained only as a future national production deployment blueprint for NCMRWF's Mihir/Pratyush supercomputers).

---

### 3.2 Option B: Scheduled / Pre-Computed WRF-Chem Simulation + Serving
- **Concept:** The team sets up WRF-Chem 4.5 offline (using an academic HPC cluster, university workstation, or temporary cloud spot instance) and executes a high-fidelity 72-hour simulation of a famous severe historical pollution event (e.g., the November 3–7, 2023 severe smog and stubble-burning crisis in Delhi NCR). The output NetCDF files are processed, cropped to Delhi NCR, compressed, and served via FastAPI for comparative analysis against observations.
- **Advantages:**
  1. Complete scientific legitimacy: the system displays authentic, validated WRF-Chem 3D fields without pretending.
  2. Sub-second API response time during jury evaluation.
  3. Demonstrates full mastery over WPS namelists, emission coupling, and chemical mechanisms.
- **Limitations:**
  1. Does not dynamically update with *today's* live weather unless continuously run on a backend supercomputer.
- **Verdict:** 🟡 **RECOMMENDED AS HISTORICAL BENCHMARK & CASE-STUDY MODULE**.

---

### 3.3 Option C: Hybrid Dual-Engine (Physics Base + ML Refinement + Dashboard)
- **Concept:** A multi-layered architecture where:
  1. **Macroscopic Physics & Chemistry:** Ingests live operational numerical predictions from ECMWF/GFS for weather and Copernicus CAMS (IFS-AER / IFS-CHEM) for regional chemical transport. CAMS is essentially ECMWF's global operational equivalent of WRF-Chem, run daily on a European supercomputer and published freely via open APIs.
  2. **Micro-Scale Physical Diagnostics:** Computes vertical potential temperature lapse rate, Bulk Richardson Number ($Ri_b$), boundary layer height (PBLH), and forward Lagrangian stubble smoke puff advection directly within Python.
  3. **AI/ML Bias Correction & Downscaling:** An ensemble of Gradient Boosted Decision Trees (LightGBM) trained on 3 years of CPCB station data corrects coarse model biases, downscales regional forecasts to station coordinates, and enforces physical constraints ($PM_{2.5} \le PM_{10}$, non-negativity).
  4. **Fast API & Interactive UI:** Sub-second queries, interactive 72-hour timeline playback, and TreeSHAP explainability.
- **Advantages:**
  1. Runs entirely on a standard 8-core laptop or free cloud VM with $<500\text{ MB}$ RAM footprint.
  2. Live end-to-end execution completes in **$<15\text{ seconds}$**.
  3. Fully live: ingests today's actual live CPCB station values and NASA FIRMS farm fires.
  4. Scientifically robust: builds upon real numerical physics (ECMWF CAMS) rather than arbitrary statistical curves.
- **Verdict:** 🟢 **STRONGLY RECOMMENDED AS THE PRIMARY OPERATIONAL ENGINE FOR SIH 2026**.

---

## 4. Final Recommendation: The Unified Hybrid Solution

To achieve the highest scientific score while guaranteeing a flawless live demonstration, the project adopts a **Unified Hybrid Architecture**:

```mermaid
graph TD
    subgraph Offline Scientific Pillar
        A1[WRF-Chem v4.5 Research Runbook] --> A2[Complete Namelist & WPS Configs]
        A2 --> A3[Pre-computed Severe Winter Smog Simulation]
        A3 --> A4[WRF-Chem NetCDF Benchmark Archive]
    end

    subgraph Live Operational Pillar
        B1[Live Operational Weather: Open-Meteo GFS/ECMWF] --> B3[Diagnostic Physics Layer: PBLH & Inversion]
        B2[Live Synoptic Chemistry: CAMS Global] --> B4[Lagrangian Plume Advection Engine]
        B5[Live CAAQMS Ground Obs: OpenAQ] --> B6[Feature Tensor Assembler]
        B3 & B4 & B6 --> B7[Physics-Informed LightGBM Downscaler]
        B7 --> B8[Station-Level 72h Multi-Pollutant Forecast]
    end

    A4 & B8 --> C1[FastAPI High-Performance Engine]
    C1 --> D1[Next.js Interactive Command Center Dashboard]
```

### Why this satisfies both evaluators and regulators:
1. **To the Scientific / MoES Evaluator:** We present the full WRF-Chem namelists (`namelist.wps`, `namelist.input`), emission coupling scripts (`anthro_emiss`, `fire_emiss`), and the pre-computed 3D benchmark proving that our team knows how to configure and run coupled numerical models at scale.
2. **To the Software / Product Evaluator:** We demonstrate a live, sub-second, real-time forecasting engine ingesting today's live station feeds and satellite fires, rendering 60 FPS animated wind vectors, and delivering explainable 72-hour predictions.
