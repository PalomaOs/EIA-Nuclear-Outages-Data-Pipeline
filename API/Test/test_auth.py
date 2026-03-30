from fastapi.testclient import TestClient
from unittest.mock import patch
from Main import app

client = TestClient(app)


def test_login_ok():
    response = client.post("/auth/token", json={
        "username": "admin@eia.com",
        "password": "123Adm#",
    })
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"

def test_login_wrong_password():
    response = client.post("/auth/token", json={
        "username": "admin@eia.com",
        "password": "123asd!",
    })
    assert response.status_code == 401
    assert "Incorrect" in response.json()["detail"]

def test_login_wrong_username():
    response = client.post("/auth/token", json={
        "username": "admin",
        "password": "123Adm#",
    })
    assert response.status_code == 401


def test_protected_without_token():
    response = client.get("/data/facilities")
    assert response.status_code == 401   

def test_protected_with_invalid_token():
    response = client.get("/data/facilities", headers={
        "Authorization": "Bearer token_inventado"
    })
    assert response.status_code == 401
    assert "Invalid or expired token" in response.json()["detail"]

def test_protected_with_valid_token():
    token_response = client.post("/auth/token", json={
        "username": "admin@eia.com",
        "password": "123Adm#",
    })
    token = token_response.json()["access_token"]

    response = client.get("/data/facilities", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
