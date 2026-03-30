import logging
import sys
from datetime import datetime

from Data.Database  import init_db
from Connector.Checkpoint import load_last_period, open_extraction_log, close_extraction_log, load_last_run_date
from Connector.EIAclient  import get_api_key, date_chunks, fetch_generator_outages
from Data.Loader          import load_records, save_to_parquet, read_parquet
from pathlib import Path

logging.basicConfig(
    level   = logging.INFO,
    format  = "%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt = "%Y-%m-%d %H:%M:%S",
    handlers = [
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)


def main() -> dict:
    today = datetime.now().strftime("%Y-%m-%d")
    conn = init_db()

    last_run = load_last_run_date(conn)
    print(f"Last successful run date: {last_run}")  
    if last_run == today:
        logger.info("Already up to date (last run: %s), nothing to do.", last_run)
        conn.close()
        return {"status": "ok", "records_fetched": 0, "message": "Already up to date, nothing to do."}

    start_date = load_last_period(conn)
    extraction_id = open_extraction_log(conn)
    total_records = 0
    last_period   = None
    final_status  = "success"

    try:
        api_key = get_api_key()
    except EnvironmentError:
        logger.critical("API key not found — aborting.")
        conn.close()
        return {"status": "failed", "records_fetched": 0, "last_period": None, "message": "API key not found."}


    try:
        for chunk_start, chunk_end in date_chunks(start_date, today, months_step=3):
            logger.info("--- Chunk: %s → %s ---", chunk_start, chunk_end)
            try:
                records = fetch_generator_outages(chunk_start, chunk_end, api_key)
            except EnvironmentError:
                logger.critical("API key not found — aborting.")
                final_status = "failed"
                break
            except Exception as exc:
                logger.error("Fetch failed: %s", exc)
                final_status = "partial"
                continue

            if not records:
                continue

            RAW_DIR = Path(__file__).resolve().parent / "Data" / "Raw"
            RAW_DIR.mkdir(parents=True, exist_ok=True)
            parquet_path = str(RAW_DIR / f"outages_{chunk_start}_{chunk_end}.parquet")
            save_to_parquet(records, parquet_path)
            records_from_parquet = read_parquet(parquet_path)
            try:
                written, chunk_last_period = load_records(conn, records_from_parquet, extraction_id)
            except Exception as exc:
                logger.error("Load failed: %s", exc)
                final_status = "partial"
                continue

            total_records += written
            # ISO date strings (YYYY-MM-DD) sort lexicographically in the same
            # order as chronologically, so a plain > comparison is correct here.
            if chunk_last_period and (last_period is None or chunk_last_period > last_period):
                last_period = chunk_last_period

    except KeyboardInterrupt:
        logger.warning("Interrupted by user.")
        final_status = "partial"

    finally:
        close_extraction_log(conn, extraction_id, last_period, total_records, final_status)
        conn.close()

    logger.info("=== Done — status: %s | records: %d ===", final_status, total_records)

    return {
        "status": final_status,
        "records_fetched": total_records,
        "last_period": last_period,
        "message": f"{total_records} new records added." if total_records > 0 else "Already up to date, no new records.",
    }


if __name__ == "__main__":
    result = main()
    print(result)