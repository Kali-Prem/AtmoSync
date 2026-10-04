# Computational Infrastructure & Hardware Sizing

**Document ID:** `DOC-RES-017`  
**Phase:** Research & Data Foundation  
**System:** ATMOSYNC  
**Date:** October 2026  
**Status:** Implementation-Ready & Pragmatically Sized  

---

## 1. Workload Profiles Across System Components

The system encompasses five distinct computational workloads, each with vastly differing CPU, memory, and I/O demands:

```
+---------------------------------------------------------------------------------------------------------+
|                                    WORKLOAD CHARACTERISTICS MATRIX                                      |
+=========================================================================================================+
| COMPONENT                  | COMPUTE BOTTLENECK    | PEAK RAM USAGE    | DISK I/O DEMAND   | GPU NEEDED |
+----------------------------+-----------------------+-------------------+-------------------+------------+
| 1. Data Ingestion & QC     | Network I/O & latency | < 250 MB          | Minimal (JSON/CSV)| No         |
| 2. Physics & Plume Engine  | CPU (Vector math)     | < 500 MB          | Low (RAM arrays)  | No         |
| 3. ML Model Training       | CPU Multi-threading   | 4 GB to 8 GB      | Moderate (Parquet)| Optional   |
| 4. ML Model Inference (72h)| CPU (Tree evaluation) | < 300 MB          | Negligible        | No         |
| 5. Database (TimescaleDB)  | Memory & Disk IOPS    | 2 GB to 4 GB      | High (SSD NVMe)   | No         |
| 6. Frontend / Map Rendering| Client WebGL GPU      | Client Browser    | Network streaming | Client GPU |
| 7. WRF-Chem Numerical Run  | Heavy HPC MPI CPU     | 32 GB to 128 GB   | Extreme (NetCDF4) | No (CPU MPI|
+---------------------------------------------------------------------------------------------------------+
```

---

## 2. Infrastructure Sizing by Tier

### Tier 1: Developer Workstation (Student Laptop)
- **Target Hardware:** Standard consumer laptop (Intel Core i5/i7 8th+ Gen, AMD Ryzen 5/7, or Apple Silicon M1/M2/M3).
- **CPU Cores:** 4 to 8 physical cores (8 to 16 threads).
- **RAM Memory:** 16 GB DDR4/DDR5 (8 GB minimum with swap file enabled).
- **Disk Storage:** 50 GB free NVMe SSD space.
- **Operating System:** Windows 10/11 with WSL2 (Ubuntu 22.04 LTS), macOS, or Linux.
- **Role:** Local code development, LightGBM training on 3-year historical dataset, Docker Compose local staging, and web dashboard authoring.

---

### Tier 2: SIH Prototype Demonstration Infrastructure
- **Target Hardware:** Single cloud virtual machine (e.g., AWS `t3.xlarge` or `c6a.xlarge`, Hetzner `CPX31`, or local bare-metal workstation).
- **CPU Cores:** 4 vCPUs (x86_64).
- **RAM Memory:** 8 GB to 16 GB ECC RAM.
- **Disk Storage:** 60 GB to 100 GB General Purpose SSD (gp3, min 3,000 IOPS).
- **Network Bandwidth:** 1 Gbps outbound link for serving vector tiles and map data.
- **Software Stack:** Docker & Docker Compose running 5 isolated containers:
  - `atmosync-frontend` (Next.js Node.js 20)
  - `atmosync-api` (FastAPI Python 3.11 with Uvicorn)
  - `atmosync-worker` (Celery background forecast runner)
  - `atmosync-db` (PostgreSQL 16 + TimescaleDB 2.14 + PostGIS 3.4)
  - `atmosync-cache` (Redis 7 Alpine)
- **Performance Capability:** Generates 72-hour forecast batches for 40 stations in **$<12\text{ seconds}$**; serves 150 concurrent API requests/second.

---

### Tier 3: Regional Production Infrastructure (MoES / CPCB Deployment)
- **Target Hardware:** Clustered Cloud Environment (Kubernetes / AWS EKS / On-Premise Government Cloud).
- **Ingestion & API Pods:** 3x `c6i.xlarge` (4 vCPUs, 8 GB RAM each) behind an Elastic Load Balancer.
- **Database Master-Replica:** AWS RDS PostgreSQL (db.m6g.2xlarge: 8 vCPUs, 32 GB RAM, 500 GB Provisioned IOPS SSD).
- **Forecasting & Plume Cluster:** Dedicated Celery worker instances scaled horizontally.
- **Object Storage:** AWS S3 / MinIO for archiving historical NetCDF/GeoJSON grids (5 TB/year).

---

### Tier 4: National HPC / Supercomputing Infrastructure (Full WRF-Chem Operational Runs)
- **Target Hardware:** National Supercomputing Mission (NSM) supercomputer (e.g., **Mihir** at NCMRWF or **Pratyush** at IITM Pune).
- **Compute Nodes:** 4 to 8 dedicated compute nodes (128 to 256 physical CPU cores, Intel Xeon Platinum or AMD EPYC).
- **Interconnect:** 100 Gbps Mellanox InfiniBand (low-latency MPI message passing).
- **RAM Memory:** 256 GB to 512 GB high-bandwidth ECC DDR4/DDR5.
- **Storage:** Lustre Parallel File System (500+ TB high-throughput storage).
- **Run Duration:** 72-hour 3-domain coupled WRF-Chem run finishes in **$1.8\text{ to } 2.5\text{ hours}$**.

---

## 3. Sizing Summary Table

```
+---------------------------------------------------------------------------------------------------------+
|                                    HARDWARE SIZING SPECIFICATION                                        |
+=========================================================================================================+
| DIMENSION           | TIER 1: DEV LAPTOP    | TIER 2: SIH DEMO VM   | TIER 3: GOVT PROD     | TIER 4: NAT. HPC|
+---------------------+-----------------------+-----------------------+-----------------------+-----------------+
| Physical Role       | Local Pair Dev        | Jury Evaluation Demo  | State-wide 24x7 Engine| Full WRF-Chem   |
| Cores / vCPUs       | 4 – 8 Cores           | 4 vCPUs               | 16 – 32 vCPUs         | 128 – 256 Cores |
| RAM                 | 16 GB                 | 8 – 16 GB             | 32 – 64 GB            | 256 – 512 GB    |
| Storage             | 50 GB SSD             | 80 GB NVMe SSD        | 500 GB NVMe + S3      | 500 TB Lustre   |
| Dedicated GPU       | None Required         | None Required         | Optional (Inference)  | Optional (CUDA) |
| Monthly Cost        | $0 (Existing Laptop)  | $0 – $40 / month      | $350 – $800 / month   | Institutional   |
+---------------------------------------------------------------------------------------------------------+
```
