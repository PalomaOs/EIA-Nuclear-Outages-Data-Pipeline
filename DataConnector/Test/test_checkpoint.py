import pytest
from Data.Database import init_db
from Connector.Checkpoint import (
    load_last_period,
    load_last_run_date,
    open_extraction_log,
    close_extraction_log,
)

@pytest.fixture
def conn():
    connection = init_db(path=":memory:")
    yield connection
    connection.close()

# --- load_last_period ---

def test_load_last_period_after_success(conn):
    """Devuelve la fecha del último run exitoso."""
    conn.execute("""
        INSERT INTO ExtractionLog (last_period_end, records_fetched, status)
        VALUES ('2024-06-01', 100, 'success')
    """)
    conn.commit()

    result = load_last_period(conn)
    assert result == "2024-06-01"


def test_load_last_period_picks_latest(conn):
    """Si hay varios éxitos, toma el más reciente."""
    conn.executescript("""
        INSERT INTO ExtractionLog (last_period_end, records_fetched, status)
        VALUES ('2024-01-01', 50, 'success');
        INSERT INTO ExtractionLog (last_period_end, records_fetched, status)
        VALUES ('2024-06-01', 80, 'success');
    """)

    result = load_last_period(conn)
    assert result == "2024-06-01"

def test_load_last_run_date_success(conn):
    """load_last_run_date debe devolver la fecha del último run exitoso."""
    conn.execute("""
        INSERT INTO ExtractionLog (extracted_at, status)
        VALUES ('2024-06-15 10:00:00', 'success')
    """)
    conn.commit()

    result = load_last_run_date(conn)
    assert result == "2024-06-15"

# --- open / close extraction_log ---

def test_open_extraction_log_returns_id(conn):
    extraction_id = open_extraction_log(conn)
    assert isinstance(extraction_id, int)
    assert extraction_id >= 1

def test_open_extraction_log_status_is_running(conn):
    extraction_id = open_extraction_log(conn)
    row = conn.execute(
        "SELECT status FROM ExtractionLog WHERE id = ?", (extraction_id,)
    ).fetchone()
    assert row["status"] == "running"

def test_close_extraction_log_updates_row(conn):
    extraction_id = open_extraction_log(conn)
    close_extraction_log(conn, extraction_id, "2024-06-01", 150, "success")

    row = conn.execute(
        "SELECT * FROM ExtractionLog WHERE id = ?", (extraction_id,)
    ).fetchone()

    assert row["status"]          == "success"
    assert row["last_period_end"] == "2024-06-01"
    assert row["records_fetched"] == 150

def test_close_extraction_log_partial(conn):
    extraction_id = open_extraction_log(conn)
    close_extraction_log(conn, extraction_id, None, 0, "partial")

    row = conn.execute(
        "SELECT status FROM ExtractionLog WHERE id = ?", (extraction_id,)
    ).fetchone()
    assert row["status"] == "partial"