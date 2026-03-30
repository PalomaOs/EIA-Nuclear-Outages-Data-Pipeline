import pytest
from fastapi.testclient import TestClient
from Main import app
from Core.Dependencies import get_db, get_current_user
from Core.Config import settings
from Core.Security import create_access_token
import sqlite3


def override_get_current_user():
    return "test_user"

def override_get_db():
    conn = sqlite3.connect(settings.db_path, check_same_thread=False)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

@pytest.fixture(autouse=True)
def override_dependencies():
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()

@pytest.fixture
def token():
    return create_access_token(subject=settings.app_username)

@pytest.fixture
def client(token):
    return TestClient(app, headers={"Authorization": f"Bearer {token}"})




def test_facilities_ok(client):
    response = client.get("/data/facilities")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_facilities_structure(client):
    response = client.get("/data/facilities")
    data = response.json()
    if data:   # check structure only if there's at least one facility
        assert "facilityId"   in data[0]
        assert "facilityName" in data[0]

def test_generator_ok(client):
    response = client.get("/data/generator")
    assert response.status_code == 200
    body = response.json()
    assert "total"     in body
    assert "page"      in body
    assert "page_size" in body
    assert "results"   in body

def test_generator_result_fields(client):
    response = client.get("/data/generator?page_size=1")
    results  = response.json()["results"]
    if results:
        for field in ["period", "facilityId", "facilityName",
                      "generatorName", "capacity", "outage", "percentOutage"]:
            assert field in results[0]

def test_generator_invalid_date_format(client):
    response = client.get("/data/generator?date_from=01-01-2024")
    assert response.status_code == 422

def test_us_ok(client):
    response = client.get("/data/US")
    assert response.status_code == 200
    body = response.json()
    assert "total"   in body
    assert "results" in body

def test_us_no_duplicate_periods(client):
    response = client.get("/data/US?page_size=500")
    periods  = [r["period"] for r in response.json()["results"]]
    assert len(periods) == len(set(periods))

def test_us_invalid_date_format(client):
    response = client.get("/data/US?date_from=2024/01/01")
    assert response.status_code == 422