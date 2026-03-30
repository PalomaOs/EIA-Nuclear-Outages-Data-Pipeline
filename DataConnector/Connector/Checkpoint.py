import sqlite3
import logging
from typing import Optional
from Data.Database import get_connection

logger = logging.getLogger(__name__)

_FALLBACK_DATE = "2007-01-01"


def load_last_period(conn: sqlite3.Connection) -> str:
    row = conn.execute("""
        SELECT last_period_end
        FROM   ExtractionLog
        WHERE  status = 'success'
          AND  last_period_end IS NOT NULL
        ORDER  BY id DESC
        LIMIT  1
    """).fetchone()

    date = row["last_period_end"] if row else _FALLBACK_DATE #Falls back to _FALLBACK_DATE if no successful run exists.
    logger.info("Checkpoint loaded — resuming from: %s", date)
    return date

def load_last_run_date(conn: sqlite3.Connection) -> Optional[str]:
    row = conn.execute("""
        SELECT DATE(extracted_at) as run_date
        FROM   ExtractionLog
        WHERE  status = 'success'
        ORDER  BY id DESC
        LIMIT  1
    """).fetchone()
    return row["run_date"] if row else None

def open_extraction_log(conn: sqlite3.Connection) -> int:
    cur = conn.execute(
        "INSERT INTO ExtractionLog (status) VALUES ('running')"
    )
    conn.commit()
    extraction_id = cur.lastrowid
    logger.info("Extraction log opened (id=%d).", extraction_id)
    return extraction_id

def close_extraction_log(
    conn: sqlite3.Connection,
    extraction_id: int,
    last_period_end: Optional[str],
    records_fetched: int,
    status: str = "success",
) -> None:
    conn.execute(
        """
        UPDATE ExtractionLog
        SET    last_period_end = ?,
               records_fetched = ?,
               status          = ?
        WHERE  id = ?
        """,
        (last_period_end, records_fetched, status, extraction_id),
    )
    conn.commit()
    logger.info(
        "Extraction log closed (id=%d, status=%s, records=%d, last_period=%s).",
        extraction_id,
        status,
        records_fetched,
        last_period_end,
    )