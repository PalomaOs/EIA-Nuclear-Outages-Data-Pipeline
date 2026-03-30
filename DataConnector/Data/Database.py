import sqlite3
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

DB_PATH = str(Path(__file__).resolve().parent.parent / "Data" / "processed" / "database.db")

def get_connection(path: str = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    return conn


def init_db(path: str = DB_PATH) -> sqlite3.Connection:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = get_connection(path)

    conn.executescript("""
        CREATE TABLE IF NOT EXISTS Facility (
            facilityId   INTEGER NOT NULL,
            facilityName TEXT    NOT NULL,
            PRIMARY KEY (facilityId)
        );

        CREATE TABLE IF NOT EXISTS Generator (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            facilityId    INTEGER NOT NULL,
            generatorName TEXT    NOT NULL,
            FOREIGN KEY (facilityId) REFERENCES Facility (facilityId),
            UNIQUE (facilityId, generatorName)
        );

        CREATE TABLE IF NOT EXISTS DailyOutage (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            generatorId    INTEGER NOT NULL,
            period         DATE    NOT NULL,
            capacity       REAL,
            outage         REAL,
            percentOutage  REAL,
            extractionId   INTEGER NOT NULL,
            FOREIGN KEY (generatorId)  REFERENCES Generator(id),
            FOREIGN KEY (extractionId) REFERENCES ExtractionLog(id),
            UNIQUE (generatorId, period)
        );

        CREATE TABLE IF NOT EXISTS ExtractionLog (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            extracted_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_period_end TEXT,
            records_fetched INTEGER,
            status          TEXT
        );
    """)

    conn.commit()
    logger.info("Database initialized at '%s'.", path)
    return conn