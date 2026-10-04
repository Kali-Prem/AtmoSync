# Comprehensive Documentation & Architecture Audit

**Document ID:** `DOC-RES-001`  
**Phase:** Research & Data Foundation  
**System:** ATMOSYNC (Air Pollution–Weather Coupled Forecasting System)  
**Problem Statement:** MoES / NCMRWF — PS 26082  
**Date of Audit:** October 2026  
**Auditor:** Lead Systems Architect & Scientific Research Team  

---

## 1. Executive Summary of Audit

An exhaustive, line-by-line inspection of all architectural blueprints, requirement specifications, assumptions, and data-flow designs across the `/docs` directory (`01-project`, `02-requirements`, `03-system-architecture`) was conducted.

The goal of this audit is not to discard the existing work, but to critically evaluate its scientific honesty, practical viability for the SIH 2026 hackathon, computational feasibility, and data accessibility. 

### Key Findings:
1. **Scientific Integrity vs. Prototype Reality:** The initial architecture established a sound conceptual grasp of Delhi NCR's atmospheric crises (thermal inversion, nocturnal boundary layer collapse, stubble-burning plume transport, and aerosol-radiation feedback). However, it contained critical operational gaps—such as assuming GFS pressure levels could resolve a 50m nocturnal inversion, or assuming polar satellite fires arrive every 3 hours.
2. **Data Availability Blindspots:** Official CPCB real-time APIs (`data.gov.in` and `app.cpcbccr.com`) suffer from frequent downtime, rate limits, and captcha/session hurdles that were under-specified in the baseline data flow. Reliable open mirrors (OpenAQ, Open-Meteo CAMS/ECMWF) must be explicitly integrated as primary or fallback conduits.
3. **WRF-Chem Operational Dilemma:** While Problem Statement 26082 highlights coupled numerical modeling (WRF-Chem), executing 72-hour coupled 3-domain WRF-Chem runs in real-time during a 10-minute SIH live demonstration or on consumer hardware is computationally impossible. A definitive, scientifically honest hybrid strategy is required.

---

## 2. Systematic Audit Findings Matrix

| Area | Existing Decision / Claim | Problem / Gap Identified | Required Research | Recommended Action |
| :--- | :--- | :--- | :--- | :--- |
| **Scientific Model** | ADR-002 proposes WRF-Chem with pre-computed hindcasts + live GFS surrogate forcing. | Does not define the exact WRF-Chem version, chemistry mechanism, aerosol module, or physics parameterizations. | Research WRF-Chem 4.x dependencies, namelist options, and CPU benchmark runtimes. | Document complete WRF-Chem operational runbook (`WRF-CHEM-RESEARCH.md`) and establish a clear 3-option feasibility study (`WRF-CHEM-FEASIBILITY.md`). |
| **Meteorological Vertical Profile** | Compute Bulk Richardson number ($Ri_b$) and inversion from GFS standard isobaric levels (1000, 925, 850 hPa). | Delhi's elevation is ~215 m ASL. The 1000 hPa level is frequently below the ground surface, and 925 hPa is ~750 m ASL (~535 m AGL). Standard isobaric GFS layers cannot resolve the shallow nocturnal boundary layer (50–150 m AGL). | Research boundary layer height outputs (`HPBL` in GFS, `boundary_layer_height` in ERA5 / Open-Meteo, and Safdarjung radiosonde soundings). | Use direct NWP diagnosed PBL height variables and multi-level agl temperature/wind fields rather than coarse isobaric slices (`INVERSION-DETECTION.md`, `PBL-HEIGHT.md`). |
| **Satellite Fire Ingestion** | Ingest NASA FIRMS VIIRS/MODIS every 3 hours (FR-INGEST-03, Data Flow Stage 1). | VIIRS (Suomi-NPP, NOAA-20, NOAA-21) and MODIS (Terra, Aqua) are sun-synchronous polar-orbiting satellites with only 2 to 4 overpasses per day per satellite over Northwest India. True 3-hourly continuous fire observations do not exist from LEO sensors. | Research exact overpass times, FIRMS REST API parameters, and Fire Radiative Power (FRP) latency. | Redesign fire ingestion to trigger around known satellite overpasses (~01:30, ~10:30, ~13:30, ~15:30 IST) and buffer active fires with temporal decay (`STUBBLE-BURNING-DATA.md`). |
| **Ground Air Quality API** | FR-INGEST-01 specifies polling CPCB/DPCC endpoints hourly via JSON. | The CPCB CCR portal (`app.cpcbccr.com`) does not offer an open, unauthenticated REST API; `data.gov.in` CPCB APIs frequently change resource IDs or experience 504 gateway timeouts. | Investigate OpenAQ v3 API, CPCB OGD API keys, and Open-Meteo CAAQMS-calibrated streams. | Implement a resilient multi-tier ingestion client: Primary = OpenAQ REST API (CPCB stations), Secondary = data.gov.in OGD API, Tertiary = CPCB CCR scraper (`DATA-SOURCES-VERIFIED.md`). |
| **AQI Calculation Methodology** | FR-FORECAST-01 specifies composite Indian NAQI calculation. | Does not document the exact 8 criteria pollutants, the mathematical piecewise linear sub-index formula, the 24h/8h/1h averaging periods, or the minimum 3-pollutant mandatory particulate rule. | Research the official CPCB / IIT Kanpur 2014-2015 National Air Quality Index report. | Author `INDIA-AQI-METHODOLOGY.md` with complete breakpoint lookup tables, mathematical formulations, and Python reference logic. |
| **Gridded Forecast Ground Truth** | Deliver $1\text{ km} \times 1\text{ km}$ gridded predictions across Delhi NCR (FR-FORECAST-01, ADR-001). | Delhi NCR has ~40 ground stations. There is no observed $1\text{ km}$ ground truth grid for training ML models; high-resolution gridded fields are synthetic spatial downscaling products, not direct measurements. | Determine how to scientifically downscale point forecasts to a continuous raster (Kriging, IDW, or atmospheric dispersion overlays). | Clarify in documentation: station-level predictions are directly trained on verified CAAQMS sensors; $1\text{ km}$ gridded maps are spatial downscalings derived from physics + station interpolation (`ML-MODEL-SELECTION.md`). |
| **Plume Dispersion Modeling** | FR-PLUME-01 specifies forward Lagrangian puff dispersion simulation using Briggs curves. | Lagrangian puff modeling requires wind field slicing, injection height estimation from FRP, and boundary layer vertical diffusion. Full HYSPLIT execution has significant latency. | Research simplified Gaussian puff dispersion vs HYSPLIT trajectory vs CAMS biomass burning tracer. | Detail the scientific vs prototype approach in `PLUME-MODELING.md`, clearly separating real-time hackathon approximations from offline HYSPLIT benchmarks. |
| **Aerosol-Radiation Feedback** | Document `problem-understanding.md` highlights two-way aerosol-radiation feedback as vital. | Machine-learning downscaling cannot dynamically modify NWP weather fields in real time without running an active numerical solver (WRF-Chem). | Clarify where feedback is captured: in pre-computed WRF-Chem hindcasts or CAMS coupled runs vs offline ML downscaling. | Explicitly define the boundary between coupled numerical runs and post-processing ML corrections in `HYBRID-PHYSICS-ML.md`. |
| **Hardware & Compute Constraints** | ADR-007 and ASSUMP-ENG-03 state 8 CPU cores and 32 GB RAM can run inference in $\le 180\text{ s}$. | While accurate for LightGBM and spatial Kriging, WRF-Chem compilation and live execution require high-performance multi-node clusters and cannot run in 180 seconds. | Verify compute footprints for data ingestion, ML training, ML inference, and numerical modeling. | Produce `COMPUTE-REQUIREMENTS.md` with strict tier separation: Developer Laptop vs SIH Prototype VM vs Production HPC. |
| **Latency & Real-Time Nomenclature** | System documents use "Real-Time 72-Hour Forecasting" throughout. | Global NWP cycles (GFS, ECMWF) take 3.5 to 5 hours to publish. CAAQMS station data has 15-45 min latency. Satellite fires have 1-3 hr latency. | Define what "real-time" means in operational meteorology. | Publish `REALTIME-STRATEGY.md` adopting the scientifically accurate term "Near-Real-Time (NRT) Scheduled Forecasting Cycle" updated every 6 hours. |
| **Cost & Cloud Budget** | ADR documents mention cloud deployment but do not detail pricing or service tiers. | Cloud GPU instances and enterprise databases incur high monthly costs; student hackathon teams require free/open-source configurations. | Research zero-cost / low-cost hosting (Hugging Face Spaces, Render, local Docker, Open-Meteo free tier, AWS Free Tier). | Author `COST-ANALYSIS.md` outlining zero-budget development paths and estimated production scale costs. |

---

## 3. Scientific Claims Requiring Verification

The baseline documentation makes several scientific claims that require explicit literature citations and empirical verification:
1. **Bulk Richardson Number Critical Value ($Ri_c = 0.25$):**  
   *Claim:* Inversion and laminar flow onset occur when $Ri_b \ge 0.25$.  
   *Status:* Scientifically verified in boundary layer meteorology literature (Stull, 1988; Arya, 2001). However, under strongly stable nocturnal conditions, turbulence can collapse at $Ri_b$ between $0.20$ and $0.30$.
2. **Wooster / Kaufman FRP-to-Biomass Linear Scaling:**  
   *Claim:* $PM_{2.5}$ emissions scale linearly with Fire Radiative Energy ($FRE = \int FRP \, dt$).  
   *Status:* Verified by Wooster et al. (2005) and used in GFAS/CAMS. The smoke emission coefficient for agricultural crop residue burning typically ranges between $0.015$ and $0.030\text{ kg } PM_{2.5} / \text{MJ}$.
3. **VOC-Limited Ozone Regime in Delhi NCR:**  
   *Claim:* Urban Delhi's photochemical ozone regime is predominantly VOC-limited during winter.  
   *Status:* Verified in Indian scientific literature (Sharma et al., 2016; CPCB / IIT Delhi, 2021). Nocturnal $O_3$ titration by traffic $NO$ is an established physical phenomenon in Delhi.
4. **Volume Contraction Relationship ($C \propto \frac{Q}{PBLH \cdot U}$):**  
   *Claim:* Ground concentration is inversely proportional to the ventilation coefficient ($PBLH \times \bar{U}$).  
   *Status:* Standard box-model approximation (Hanna et al., 1982). Valid for qualitative explainability and macro-diagnostics.

---

## 4. Architecture Continuity & Action Plan

No architectural components need to be discarded. Instead, the architecture is reinforced with:
1. **Definitive Data Source Specifications:** Replacing generic provider names with verified API endpoints, schemas, formats, and fallbacks.
2. **A Pragmatic Hybrid Modeling Bridge:** Formally defining how open global atmospheric composition data (CAMS/ECMWF), physical boundary layer diagnostics, and gradient boosted ML ensemble interact without requiring an unattainable live WRF-Chem HPC run on stage.
3. **Standardized AQI & Physics Modules:** Solidifying the exact mathematical equations, breakpoints, and unit conversions.

The subsequent research documents in `docs/research/` address every identified gap systematically.
