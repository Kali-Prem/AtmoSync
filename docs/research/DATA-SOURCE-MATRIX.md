# Data Source Evaluation Matrix

**Document ID:** `DOC-RES-003`  
**Phase:** Research & Data Foundation  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Implementation-Ready  

---

## 1. Evaluation Methodology & Classification Criteria

Datasets are categorized according to rigorous operational and scientific criteria:

- 🟢 **Recommended:** Verified authoritative provider, open access/license, zero or negligible cost, programmatic API, acceptable latency for 72-hour operational cycles, and completely executable within the SIH hackathon development and demo constraints.
- 🟡 **Possible Alternative:** Authoritative and scientifically sound, but possesses operational friction (e.g., heavy GRIB2 parsing, 24–48h latency, 2x/day frequency, or portal instability). Retained as secondary fallback, offline training benchmark, or validation baseline.
- 🔴 **Not Suitable:** Scientifically inadequate, computationally prohibitive for an operational hackathon prototype, paywalled/proprietary, or lacking open programmatic automation.

---

## 2. Comprehensive Data Source Matrix

| Data | Provider | Dataset | Variables | Resolution | Frequency | Coverage | Access | API | Format | Cost | Reliability | Project Role |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Operational Weather Forecast** 🟢 | Open-Meteo GmbH | Weather Forecast API (ECMWF/GFS blend) | $T_{2m}, RH, P_{sfc}, U_{10}, V_{10}, \text{PBLH}, T_{80m}, T_{180m}, \text{Radiation}$ | Downscaled to station / 0.05° (~5 km) | Hourly out to 72h | Global / Delhi NCR | Open REST GET | Yes (`api.open-meteo.com`) | JSON / CSV | Free (10k req/day) | High (99.9% uptime CDN) | **Primary Live Weather Forcing & Diagnostic Input** |
| **Historical Weather Training** 🟢 | ECMWF / C3S | ERA5 Atmospheric Reanalysis | Full vertical thermodynamics, $T, U, V, q, \text{blh}, \text{ssrd}, \text{tp}$ | $0.25^\circ \times 0.25^\circ$ (~31 km) | Hourly (1940–2025) | Global | CDS REST API | Yes (`cdsapi`) | NetCDF-4 / GRIB | Free (registration) | Very High (Gold standard) | **Historical ML Training & Physics Validation Ground Truth** |
| **Live Ground Air Quality Obs** 🟢 | OpenAQ | OpenAQ API v3 (CPCB Mirror) | $PM_{2.5}, PM_{10}, NO_2, SO_2, CO, O_3$ | Point monitors (40+ Delhi stations) | Hourly | Delhi NCR stations | REST GET with API Key | Yes (`api.openaq.org/v3`) | JSON | Free (Open non-profit) | High (Continuous multi-station sync) | **Primary Live Ground Truth & Model Feature Conditioning** |
| **Synoptic Chemical Forecast** 🟢 | ECMWF / CAMS | CAMS Global Composition (via Open-Meteo) | $PM_{2.5}, PM_{10}, NO_2, O_3, SO_2, CO, \text{AOD}, \text{Dust}$ | $0.4^\circ \times 0.4^\circ$ (~40 km) | Hourly out to 72h | Global / South Asia | Open REST GET | Yes (`air-quality-api.open-meteo.com`) | JSON | Free | High | **Macro Chemical Baseline & Boundary Condition** |
| **Active Stubble Fires** 🟢 | NASA EOSDIS | FIRMS NRT (VIIRS 375m S-NPP / NOAA-20/21) | Lat, Lon, Brightness Temp, FRP (MW), Scan, Track, Confidence | $375\text{ m} \times 375\text{ m}$ nadir | ~4 passes/day per region | Northwest India (Punjab/Haryana) | HTTPS REST API | Yes (`firms.modaps.eosdis.nasa.gov`) | CSV / GeoJSON | Free (Instant MAP_KEY) | Very High (NASA operational) | **Primary Fire Detection & Smoke Injection Engine Input** |
| **Official NWP Raw GRIB2** 🟡 | NOAA NCEP | GFS 0.25° Operational (`gfs.0p25`) | $T_{2m}, RH, U, V, \text{HPBL}$, isobaric profiles (1000–10 hPa) | $0.25^\circ \times 0.25^\circ$ | 4x daily (00, 06, 12, 18Z), hourly steps | Global | NOMADS GRIB Filter / AWS S3 | Yes (HTTP Range) | GRIB2 | Free | High (3.5h cycle latency) | **Secondary Weather Fallback & WRF Boundary Condition** |
| **ECMWF Raw Forecast** 🟡 | ECMWF | ECMWF Open Data IFS | $2t, 10u, 10v, sp, blh$, isobaric levels | $0.25^\circ \times 0.25^\circ$ | 4x daily, 3-hourly steps | Global | Python `ecmwf-opendata` | Yes | GRIB2 | Free | High | **Ensemble Weather Comparison Benchmark** |
| **Official Ground AQ Portal** 🟡 | CPCB / MoEFCC | CAAQMS CCR Portal / `data.gov.in` | All 8 criteria pollutants + met parameters | 40+ Delhi stations | 15-min / 1-hour | Delhi NCR | Portal Export / OGD API | Fragile / Variable API keys | HTML / CSV / JSON | Free | Moderate (Frequent portal 504 timeouts) | **Authoritative Verification Source & Regulatory Reference** |
| **Upper Air Sounding** 🟡 | IMD / Univ of Wyoming | Safdarjung Radiosonde (WMO 42182) | Vertical $P, Z, T, T_d, RH, U, V$ sounding | Vertical profile (Safdarjung) | Twice daily (00Z & 12Z) | Single point (Safdarjung Airport) | HTTP scrape of Wyoming archive | Scriptable HTTP | Plain Text Table | Free | High (When balloon launches occur) | **Ground-Truth Inversion & PBL Validation Baseline** |
| **High-Res Satellite AOD** 🟡 | NASA LP DAAC | MODIS MAIAC Combined (`MCD19A2`) | Daily AOD at 0.47 $\mu\text{m}$ and 0.55 $\mu\text{m}$ | $1\text{ km} \times 1\text{ km}$ | 1–2 passes/day | Global | NASA Earthdata / GEE | GEE Python API | HDF4 / GeoTIFF | Free | High (24–48h latency) | **Offline Spatial Downscaling Calibration Benchmark** |
| **Satellite Tropospheric Columns** 🟡 | ESA Copernicus | Sentinel-5P TROPOMI Level-2 | Tropospheric $NO_2, CO, SO_2$, UV Aerosol Index | $3.5\text{ km} \times 5.5\text{ km}$ | Daily afternoon pass (~13:30 IST) | Global | Copernicus Data Space Ecosystem | Yes (OData / GEE) | NetCDF-4 | Free | High (3h latency) | **Regional Plume Validation & Spaceborne Cross-Check** |
| **Anthropogenic Emissions** 🟡 | JRC / TF-HTAP | EDGAR-HTAP v3 Gridded Inventory | Sectoral mass flux for $PM, NO_x, SO_2, CO, VOC$ | $0.1^\circ \times 0.1^\circ$ (~11 km) | Monthly diurnal profiles | Global | HTTP / FTP download | Static files | NetCDF-4 | Free (Academic) | High (Static historical) | **Static Prior for Chemical Emission Conditioning** |
| **Live 3D WRF-Chem on Server** 🔴 | Custom Build | Live WRF-Chem 4.5 3-Domain Simulation | 3D coupled weather + chemistry fields | $1\text{ km}$ inner domain | Dynamic 72h run | Delhi NCR | Custom Linux HPC cluster | No (CLI MPI execution) | NetCDF-4 (multi-GB) | High CPU / Cloud cost | Low during live demo (takes 2–4 hours) | **Rejected for Live Hackathon Execution (Feasible only as precomputed benchmark)** |
| **Commercial Air Quality APIs** 🔴 | IQAir / Ambee / AccuWeather | Proprietary Commercial Endpoints | Aggregated AQI & PM estimates | Variable / Interpolated | Hourly | Commercial cities | Proprietary REST | Paid / Paywalled | JSON | High ($200–$1,000/mo) | Variable (Proprietary black-box) | **Rejected (Violates Open Science & SIH Reproducibility Guidelines)** |
| **Geostationary Thermal Fire** 🔴 | ISRO / IMD | INSAT-3D / 3DR Imager Fire Product | Thermal fire flag | Coarse (~4 km nadir, >6 km over Punjab) | Half-hourly | South Asia | MOSDAC portal | No open automated REST API | HDF5 | Free (manual request) | Moderate (Coarse resolution misses 80% farm fires) | **Rejected (Too coarse compared to VIIRS 375m; lacks open API)** |

---

## 3. Factual Justification for Categorizations

### 3.1 Why Open-Meteo & OpenAQ are 🟢 Recommended over Raw Government Portals
- **Reliability:** Direct government endpoints (`data.gov.in` and `app.cpcbccr.com`) frequently suffer from unplanned maintenance, CORS blocks, rate-limiting, and changing JSON schemas during hackathons. OpenAQ and Open-Meteo sit behind global CDNs with guaranteed 99.9% uptime, caching official data while preserving exact raw measurement provenance.
- **Developer Agility:** Open-Meteo provides pre-parsed boundary layer height (`boundary_layer_height`), eliminating the need to compile Fortran `wgrib2` binaries or C-libraries (`eccodes`) on Windows developer laptops.

### 3.2 Why VIIRS 375m is 🟢 Recommended over MODIS 1km and INSAT-3D
- **Physical Detection Capability:** Paddy stubble fires in Punjab and Haryana are typically small, field-scale burns lasting 1 to 3 hours. Scientific literature (Vadrevu et al., 2013; Sharma et al., 2020) demonstrates that MODIS ($1\text{ km}$) and INSAT-3D ($4\text{ km}$) miss between $40\%$ and $75\%$ of individual farm fires due to pixel saturation and spatial blurring. VIIRS 375m I-band detects fires down to $10\text{ m}^2$ flaming area.
- **Free Programmatic API:** NASA FIRMS provides an instant, automated REST endpoint with CSV/GeoJSON output for any bounding box.

### 3.3 Why Live WRF-Chem is 🔴 Not Suitable for Real-Time Execution
- **Wall-Clock Latency:** Executing a 72-hour forecast on a 3-domain grid ($27\text{ km} \rightarrow 9\text{ km} \rightarrow 3\text{ km}$) with full RADM2/MADE-SORGAM chemistry requires over 100 CPU-core hours. Running this live during an on-stage presentation or in a lightweight CI/CD pipeline is physically impossible.
- **Scientific Honesty:** Adopting pre-computed WRF-Chem hindcasts for historical benchmark episodes alongside an agile, physics-constrained ML downscaling engine for live data preserves both scientific rigor and hackathon responsiveness.
