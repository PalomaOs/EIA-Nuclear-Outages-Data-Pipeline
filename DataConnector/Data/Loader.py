import sqlite3
import logging
import pandas as pd
from typing import List

from Data.Schema import upsert_facility, upsert_generator, upsert_daily_outage

logger = logging.getLogger(__name__)


def _safe_float(value) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None

def save_to_parquet(records: list[dict], path: str) -> None:
    if not records:
        return
    df = pd.DataFrame(records)
    df.to_parquet(path, index=False)

def read_parquet(path: str):
    df = pd.read_parquet(path)
    return df.to_dict(orient="records")

# Normalizes raw API rows and writes them into the three SQLite tables.
def load_records(
    conn: sqlite3.Connection,
    records: List[dict],
    extraction_id: int,
) -> tuple[int, str | None]:
    
    if not records:
        logger.warning("load_records called with an empty list — nothing to do.")
        return 0, None

    rows_written = 0
    last_period: str | None = None

    # Cache generator ids within this batch to reduce DB round-trips.
    generator_cache: dict[tuple[int, str], int] = {}

    for row in records:
        try:
            facility_id   = int(row["facility"])
            facility_name = str(row["facilityName"])
            generator_name = str(row["generator"])
            period        = str(row["period"])

            capacity       = _safe_float(row.get("capacity"))
            outage         = _safe_float(row.get("outage"))
            percent_outage = _safe_float(row.get("percentOutage"))

        except (KeyError, ValueError, TypeError) as exc:
            logger.warning("Skipping malformed row (%s): %s", exc, row)
            continue

        upsert_facility(conn, facility_id, facility_name)

        # Generator (dimension table) — use cache to avoid repeated SELECTs
        cache_key = (facility_id, generator_name)
        if cache_key not in generator_cache:
            generator_cache[cache_key] = upsert_generator(
                conn, facility_id, generator_name
            )
        generator_id = generator_cache[cache_key]

        upsert_daily_outage(
            conn,
            generator_id  = generator_id,
            period        = period,
            capacity      = capacity,
            outage        = outage,
            percent_outage = percent_outage,
            extraction_id = extraction_id,
        )

        rows_written += 1
        last_period   = period   

    conn.commit()
    logger.info(
        "Loaded %d rows into SQLite (last period: %s).", rows_written, last_period
    )
    return rows_written, last_period