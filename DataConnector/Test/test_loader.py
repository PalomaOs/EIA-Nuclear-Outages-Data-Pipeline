import pytest
from Data.Database import init_db
from Data.Loader import load_records

@pytest.fixture
def conn():
    connection = init_db(path=":memory:")
    connection.execute("INSERT INTO ExtractionLog (status) VALUES ('running')")
    connection.commit()
    yield connection
    connection.close()

def _sample_records():
    return [
        {
            "period": "2024-01-01",
            "facility": "46",
            "facilityName": "Browns Ferry",
            "generator": "1",
            "capacity": 1254.8,
            "outage": 0,
            "percentOutage": 0,
        },
        {
            "period": "2024-01-02",
            "facility": "46",
            "facilityName": "Browns Ferry",
            "generator": "1",
            "capacity": 1254.8,
            "outage": 100,
            "percentOutage": 8.0,
        },
    ]

# --- load_records ---

def test_load_records_writes_correct_count(conn):
    written, _ = load_records(conn, _sample_records(), extraction_id=1)
    assert written == 2

def test_load_records_data_in_db(conn):
    load_records(conn, _sample_records(), extraction_id=1)
    rows = conn.execute("SELECT * FROM DailyOutage ORDER BY period").fetchall()
    assert len(rows) == 2
    assert rows[0]["outage"]   == 0
    assert rows[0]["percentOutage"] == 0.0
    assert rows[1]["capacity"] == 1254.8
    assert rows[1]["outage"]   == 100
    assert rows[1]["percentOutage"] == 8.0
    assert rows[0]["capacity"] == 1254.8

def test_load_records_creates_facility(conn):
    load_records(conn, _sample_records(), extraction_id=1)
    row = conn.execute("SELECT facilityName FROM Facility WHERE facilityId = 46").fetchone()
    assert row["facilityName"] == "Browns Ferry"

def test_load_records_creates_generator(conn):
    load_records(conn, _sample_records(), extraction_id=1)
    count = conn.execute("SELECT COUNT(*) FROM Generator").fetchone()[0]
    assert count == 1  

def test_load_records_empty_list(conn):
    written, last_period = load_records(conn, [], extraction_id=1)
    assert written    == 0
    assert last_period is None
