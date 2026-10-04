# Data Directory Management & Governance

This directory hierarchy holds all local datasets used across development and production pipelines.
Under no circumstances should raw binary datasets (NetCDF, GRIB2, HDF5, large CSVs) or trained model weights be committed to version control.

## Subdirectories:
- `data/raw/`: Original, immutable data dumps fetched directly from external providers (OpenAQ JSON dumps, Open-Meteo weather exports, NASA FIRMS fire CSVs).
- `data/interim/`: Intermediate transformed, cleaned, and standardized datasets awaiting feature extraction.
- `data/processed/`: Analysis-ready multidimensional tensors, tabular feature matrices (Parquet format), and spatial GeoJSON extracts.

## Data Retention & Storage Policy:
- Raw observation payloads in development may be cached for up to 90 days.
- In production, persistent storage is maintained within TimescaleDB Hypertables and AWS S3 / MinIO object storage.
