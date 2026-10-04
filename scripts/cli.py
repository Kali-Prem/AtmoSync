#!/usr/bin/env python3
"""
ATMOSYNC — Data Pipeline & Management CLI (SIH-26082)
Usage:
    python scripts/cli.py db init
    python scripts/cli.py db seed
    python scripts/cli.py ingest weather [--lat 28.6139] [--lon 77.2090]
    python scripts/cli.py ingest air-quality [--station-id stn_dl_anand_vihar]
    python scripts/cli.py ingest fire [--days 1]
    python scripts/cli.py data validate
"""
import sys
from pathlib import Path

# Ensure repo root is on sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import argparse
import logging
from database.connection import init_database, SessionLocal
from database.seed_data import seed_monitoring_stations
from services.ingestion.src.pipeline import IngestionPipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("vayudrishti.cli")

def cmd_db_init(args):
    logger.info("Initializing database schema...")
    init_database()
    logger.info("Database schema initialized successfully.")

def cmd_db_seed(args):
    logger.info("Seeding verified Delhi NCR monitoring stations...")
    with SessionLocal() as db:
        count = seed_monitoring_stations(db)
        logger.info(f"Successfully seeded {count} stations.")

def cmd_ingest_weather(args):
    pipeline = IngestionPipeline()
    with SessionLocal() as db:
        res = pipeline.ingest_weather(db, latitude=args.lat, longitude=args.lon)
        logger.info(f"Weather ingestion result: {res}")

def cmd_ingest_air_quality(args):
    pipeline = IngestionPipeline()
    with SessionLocal() as db:
        res = pipeline.ingest_air_quality(db, station_id=args.station_id)
        logger.info(f"Air quality ingestion result: {res}")

def cmd_ingest_fire(args):
    pipeline = IngestionPipeline()
    with SessionLocal() as db:
        res = pipeline.ingest_fires(db, days=args.days)
        logger.info(f"Fire ingestion result: {res}")

def cmd_data_validate(args):
    logger.info("Running data quality validation smoke test...")
    from services.ingestion.src.validation.validator import DataValidator
    sample = {
        "time": "2026-10-03T12:00:00Z",
        "pm25": 142.5,
        "pm10": 210.0,
        "no2": 45.2,
        "o3": 28.1,
        "co": 1.4,
        "so2": 12.0
    }
    res = DataValidator.validate_air_quality_record(sample)
    logger.info(f"Sample validation result: is_valid={res.is_valid}, qc_flag={res.qc_flag}, warnings={res.warnings}")

def main():
    parser = argparse.ArgumentParser(description="ATMOSYNC Management CLI (SIH-26082)")
    subparsers = parser.add_subparsers(dest="subcommand", help="Available subcommands")

    # DB subcommands
    db_parser = subparsers.add_parser("db", help="Database management commands")
    db_sub = db_parser.add_subparsers(dest="db_action")
    db_sub.add_parser("init", help="Create tables")
    db_sub.add_parser("seed", help="Seed monitoring stations")

    # Ingest subcommands
    ingest_parser = subparsers.add_parser("ingest", help="Data ingestion commands")
    ingest_sub = ingest_parser.add_subparsers(dest="ingest_action")

    w_parser = ingest_sub.add_parser("weather", help="Ingest weather")
    w_parser.add_argument("--lat", type=float, default=28.6139, help="Latitude")
    w_parser.add_argument("--lon", type=float, default=77.2090, help="Longitude")

    aq_parser = ingest_sub.add_parser("air-quality", help="Ingest air quality")
    aq_parser.add_argument("--station-id", type=str, default="stn_dl_anand_vihar", help="Station ID")

    f_parser = ingest_sub.add_parser("fire", help="Ingest satellite fire data")
    f_parser.add_argument("--days", type=int, default=1, help="Number of past days")

    # Data subcommands
    data_parser = subparsers.add_parser("data", help="Data quality commands")
    data_sub = data_parser.add_subparsers(dest="data_action")
    data_sub.add_parser("validate", help="Validate data sample")

    args = parser.parse_args()

    if args.subcommand == "db":
        if args.db_action == "init":
            cmd_db_init(args)
        elif args.db_action == "seed":
            cmd_db_seed(args)
        else:
            db_parser.print_help()
    elif args.subcommand == "ingest":
        if args.ingest_action == "weather":
            cmd_ingest_weather(args)
        elif args.ingest_action == "air-quality":
            cmd_ingest_air_quality(args)
        elif args.ingest_action == "fire":
            cmd_ingest_fire(args)
        else:
            ingest_parser.print_help()
    elif args.subcommand == "data":
        if args.data_action == "validate":
            cmd_data_validate(args)
        else:
            data_parser.print_help()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
