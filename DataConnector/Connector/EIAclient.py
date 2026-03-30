import time
import logging
from datetime import datetime, timedelta
from typing import Generator, List, Optional, Tuple
from Connector.Config import BASE_URL, PAGE_SIZE, RETRY_ATTEMPTS, RETRY_BACKOFF, REQUEST_DELAY, get_api_key
import requests
from decouple import config

logger = logging.getLogger(__name__)


#    Yields (chunk_start, chunk_end) date-string pairs.
#    If the total range is shorter than one step, yields a single chunk.    
def date_chunks(
    start: str,
    end: str,
    months_step: int = 3,
) -> Generator[Tuple[str, str], None, None]:
    fmt = "%Y-%m-%d"
    dt_start = datetime.strptime(start, fmt)
    dt_end   = datetime.strptime(end,   fmt)
    step_days = months_step * 30

    if (dt_end - dt_start).days <= step_days:
        yield start, end
        return

    current = dt_start
    while current < dt_end:
        chunk_end = min(current + timedelta(days=step_days), dt_end)
        yield current.strftime(fmt), chunk_end.strftime(fmt)
        current = chunk_end + timedelta(days=1)


# GETs `url` with `params`. Retries up to RETRY_ATTEMPTS times with
# exponential back-off. Returns parsed JSON or None on permanent failure.
def _get_with_retry(url: str, params: dict) -> Optional[dict]:
    delay = RETRY_BACKOFF
    for attempt in range(1, RETRY_ATTEMPTS + 1):
        try:
            resp = requests.get(url, params=params, timeout=60)
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.HTTPError as exc:
            status = exc.response.status_code if exc.response else "?"
            if status == 401:
                logger.error("Authentication failed (HTTP 401). Check your API_KEY.")
                raise   # no point retrying auth errors
            logger.warning(
                "HTTP %s on attempt %d/%d — %s",
                status, attempt, RETRY_ATTEMPTS, exc,
            )
        except requests.exceptions.ConnectionError as exc:
            logger.warning(
                "Network error on attempt %d/%d — %s", attempt, RETRY_ATTEMPTS, exc
            )
        except requests.exceptions.Timeout:
            logger.warning(
                "Timeout on attempt %d/%d.", attempt, RETRY_ATTEMPTS
            )
        except Exception as exc:
            logger.error("Unexpected error: %s", exc)
            raise

        if attempt < RETRY_ATTEMPTS:
            logger.info("Retrying in %.1f s…", delay)
            time.sleep(delay)
            delay *= 2

    logger.error("All %d attempts failed for %s.", RETRY_ATTEMPTS, url)
    return None


# Downloads all generator nuclear-outage records between `start` and `end`
# (inclusive).  Handles pagination automatically.
def fetch_generator_outages(
    start: str,
    end: str,
    api_key: str,
) -> List[dict]:
    url     = f"{BASE_URL}"
    records = []
    offset  = 0

    logger.info("Fetching generator outages  %s → %s", start, end)

    while True:
        params = {
            "api_key":           api_key,
            "frequency":         "daily",
            "data[0]":           "capacity",
            "data[1]":           "outage",
            "data[2]":           "percentOutage",
            "start":             start,
            "end":               end,
            "offset":            offset,
            "length":            PAGE_SIZE,
            "sort[0][column]":   "period",
            "sort[0][direction]":"asc",
        }

        payload = _get_with_retry(url, params)
        if payload is None:
            logger.error("Aborting fetch for %s → %s (network failure).", start, end)
            break

        response_body = payload.get("response", {})
        page          = response_body.get("data", [])

        if not page:
            break

        records.extend(page)
        total = int(response_body.get("total", 0))
        logger.debug("  fetched %d / %d records (offset=%d)", len(records), total, offset)

        if len(records) >= total:
            break

        offset += PAGE_SIZE
        time.sleep(REQUEST_DELAY)

    logger.info("Done — %d records fetched for %s → %s.", len(records), start, end)
    return records