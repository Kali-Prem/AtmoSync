# Project Objectives: Air Pollution–Weather Coupled Forecasting System

**Document ID:** `DOC-01-PROJ-002`  
**Problem Statement ID:** 26082  
**Host Organization:** Ministry of Earth Sciences (MoES)  
**Target Delivery Horizon:** SIH 2026 Grand Finale & Operational MoES/NCMRWF Roadmap  

---

## 1. Executive Summary & Vision Statement

To engineer an operational-grade, scientifically sound, and explainable **Air Pollution–Weather Coupled Forecasting Platform** focused on the National Capital Region (Delhi NCR), capable of providing continuous, high-resolution 72-hour forecasts of criteria pollutants ($PM_{2.5}, PM_{10}, O_3, NO_x$), atmospheric inversion intensity, planetary boundary layer dynamics, and transboundary agricultural fire smoke plumes.

---

## 2. Core Scientific Objectives

```
+--------------------------------------------------------------------------------------------------+
|                                    CORE SCIENTIFIC OBJECTIVES                                    |
+==================================================================================================+
| SO-1: Dynamic Weather-Chemistry Coupling                                                         |
| Quantify and simulate the non-linear two-way interactions between atmospheric thermodynamics      |
| (radiation, temperature lapse rate, wind shear, turbulent kinetic energy) and chemical processes|
| (aerosol optical depth radiative extinction, photolysis rates, secondary aerosol formation).     |
+--------------------------------------------------------------------------------------------------+
| SO-2: Planetary Boundary Layer (PBL) & Inversion Diagnosis                                       |
| Accurately predict diurnal and nocturnal boundary layer collapse (PBLH) and compute quantitative |
| metrics for atmospheric inversion strength (bulk Richardson number, vertical temperature lapse   |
| gradient) across Delhi NCR at hourly intervals.                                                  |
+--------------------------------------------------------------------------------------------------+
| SO-3: Regional Source-Receptor Transport & Plume Advection                                       |
| Model upstream emissions (including Punjab/Haryana post-monsoon paddy straw burning and regional|
| brick kilns/power plants) to dynamically project plume transport trajectories, arrival times,    |
| and mass contribution percentages to Delhi's ground-level PM2.5.                                  |
+--------------------------------------------------------------------------------------------------+
| SO-4: Multi-Pollutant Photochemical Kinetics                                                     |
| Resolve daytime photochemical ozone accumulation and nocturnal NO titration to deliver accurate  |
| Ground-Level Ozone (O3) and Nitrogen Oxides (NOx) forecasts alongside particulate matter.         |
+--------------------------------------------------------------------------------------------------+
```

---

## 3. Engineering & Computational Objectives

### 3.1 Dual-Engine Architecture (Physics + AI/ML)
- **Objective EO-1:** Bridge the gap between high-fidelity numerical physics (WRF-Chem style coupled simulation) and operational inference latency by constructing a **Hybrid Coupled Framework**. 
- In this framework, macro-scale meteorological-chemical fields provide physically grounded boundary forcing, while a physics-informed spatiotemporal machine learning engine (e.g., Spatiotemporal Graph Neural Network or Gradient Boosted Ensemble with physical loss constraints) performs spatial downscaling and local bias correction.

### 3.2 Automated Ingestion & Processing Pipeline
- **Objective EO-2:** Build automated ETL pipelines ingesting real-time data from:
  1. CPCB / DPCC Continuous Ambient Air Quality Monitoring Stations (CAAQMS) (~40 stations across Delhi NCR).
  2. Numerical Weather Prediction (NWP) outputs (IMD-GFS / NCMRWF NCUM / ECMWF Open Data).
  3. Satellite Active Fire Products (NASA FIRMS VIIRS 375m & MODIS 1km, ISRO INSAT-3D/3DR).
  4. Aerosol Optical Depth (AOD) products (Copernicus CAMS / NASA MODIS/Sentinel-5P).

### 3.3 Sub-Minute Inference & Real-Time Dissemination
- **Objective EO-3:** Ensure that once new daily/hourly weather and boundary fields arrive, the entire 72-hour forecast for 40+ monitoring locations and a $1\text{ km} \times 1\text{ km}$ gridded field over Delhi NCR is generated in under **3 minutes** on accessible compute, enabling automated hourly updates.

---

## 4. Operational & Policy Support Objectives (MoES / CAQM Focus)

### 4.1 Graded Response Action Plan (GRAP) Proactive Decision Support
Currently, environmental regulators (Commission for Air Quality Management - CAQM, CPCB, DPCC) implement emergency restrictions (GRAP Stages I through IV—e.g., banning diesel generators, halting construction, closing schools, implementing odd-even vehicle schemes) **reactively** after air quality has already crossed severe thresholds.
- **Objective PO-1:** Provide high-confidence 48-to-72-hour advance alerts for severe inversion episodes and incoming stubble plumes, allowing CAQM to impose targeted pre-emptive mitigation 24–48 hours *before* catastrophic surface accumulation occurs.

### 4.2 Transparent, Explainable Forecasting (XAI)
- **Objective PO-2:** Replace opaque deep learning predictions with **attributable feature breakdown**. Every forecast chart must answer:
  * *"Why is $PM_{2.5}$ projected to spike from $180\,\mu\text{g/m}^3$ to $420\,\mu\text{g/m}^3$ at 04:00 tomorrow?"*  
  * (e.g., $45\%$ due to nocturnal PBL collapse to $<110\text{ m}$; $35\%$ due to stagnant winds $<1.2\text{ m/s}$; $15\%$ due to advected stubble plume; $5\%$ baseline urban emissions).

---

## 5. Specific Measurable Milestones (SMART Targets)

| Milestone ID | Target Metric | Baseline / Benchmark | Target Objective |
| :--- | :--- | :--- | :--- |
| **M-1: Forecast Horizon** | Continuous temporal lead time | 24-hour persistence or single-day CPCB bulletins | **72 hours (hourly resolution)** |
| **M-2: Particulate Accuracy** | $PM_{2.5}$ 24-hr forecast $R^2$ | $0.55 - 0.65$ (standard uncoupled statistical baseline) | **$R^2 \ge 0.82$, MAE $\le 25\,\mu\text{g/m}^3$** |
| **M-3: Inversion Detection** | Inversion event identification | Binary qualitative guess or post-event sounding | **Quantitative Bulk Richardson & Lapse Rate index updated hourly** |
| **M-4: Plume Arrival Time** | Stubble plume time-of-arrival error | $\pm 12\text{ hours}$ in standard regional models | **$\le \pm 3\text{ hours}$ arrival window** |
| **M-5: Spatial Resolution** | Geographic granularity over NCR | $10\text{ km} - 25\text{ km}$ (standard global/regional CTMs) | **$1\text{ km} \times 1\text{ km}$ gridded + 40+ point stations** |
| **M-6: Latency to Dashboard** | Ingestion-to-visualization cycle | Offline batch (>6 hours) | **$< 5\text{ minutes}$ from data receipt** |

---

## 6. Document Sign-off
- **Lead Systems Architect:** Approved
- **Atmospheric Modeler:** Approved
- **Next Document:** Project Scope (`docs/01-project/scope.md`)
