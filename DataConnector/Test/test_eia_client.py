import pytest
from unittest.mock import patch, MagicMock
from Connector.EIAclient import fetch_generator_outages, date_chunks

# --- date_chunks ---

def test_date_chunks_single_chunk():
    chunks = list(date_chunks("2024-01-01", "2024-02-01", months_step=3))
    assert len(chunks) == 1
    assert chunks[0] == ("2024-01-01", "2024-02-01")

def test_date_chunks_multiple():
    chunks = list(date_chunks("2024-01-01", "2024-07-01", months_step=3))
    assert len(chunks) == 2

# --- fetch_generator_outages ---

def _fake_response(data, total):
    mock = MagicMock()
    mock.raise_for_status.return_value = None
    mock.json.return_value = {
        "response": {"data": data, "total": total}
    }
    return mock

@patch("Connector.EIAclient.requests.get")
def test_fetch_returns_records(mock_get):
    fake_records = [{"period": "2024-01-01", "facility": "46", "facilityName": "Browns Ferry",
                     "generator": "1", "capacity": 1254.8, "outage": 0, "percentOutage": 0}]
    mock_get.return_value = _fake_response(fake_records, total=1)
    result = fetch_generator_outages("2024-01-01", "2024-01-31", api_key="fake-key")
    assert len(result) == 1
    assert result[0]["facilityName"] == "Browns Ferry"


@patch("Connector.EIAclient.requests.get")
def test_fetch_retries_on_failure(mock_get):
    import requests
    mock_get.side_effect = [
        requests.exceptions.ConnectionError("timeout"),
        requests.exceptions.ConnectionError("timeout"),
        _fake_response([{"period": "2024-01-01"}], total=1),
    ]
    result = fetch_generator_outages("2024-01-01", "2024-01-31", api_key="fake-key")
    assert len(result) == 1
    assert mock_get.call_count == 3


    