import sqlite3
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def upsert_facility(conn: sqlite3.Connection, facility_id: int, facility_name: str) -> None:
    conn.execute(
        """
        INSERT INTO Facility (facilityId, facilityName)
        VALUES (?, ?)
        ON CONFLICT(facilityId) DO UPDATE SET facilityName = excluded.facilityName
        """,
        (facility_id, facility_name),
    )

def upsert_generator(
    conn: sqlite3.Connection,
    facility_id: int,
    generator_name: str,
) -> int:
    conn.execute(
        """
        INSERT OR IGNORE INTO Generator (facilityId, generatorName)
        VALUES (?, ?)
        """,
        (facility_id, generator_name),
    )
    row = conn.execute(
        """
        SELECT id FROM Generator
        WHERE facilityId = ? AND generatorName = ?
        """,
        (facility_id, generator_name),
    ).fetchone()
    return row["id"]

def upsert_daily_outage(
    conn: sqlite3.Connection,
    generator_id: int,
    period: str,
    capacity: Optional[float],
    outage: Optional[float],
    percent_outage: Optional[float],
    extraction_id: int,
) -> bool:
    cur = conn.execute(
        """
        INSERT INTO DailyOutage
            (generatorId, period, capacity, outage, percentOutage, extractionId)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(generatorId, period) DO UPDATE SET
            capacity      = excluded.capacity,
            outage        = excluded.outage,
            percentOutage = excluded.percentOutage,
            extractionId  = excluded.extractionId
        """,
        (generator_id, period, capacity, outage, percent_outage, extraction_id),
    )
    return cur.rowcount > 0 # True if inserted or updated, False if no change (same values)