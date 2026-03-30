import logging
import sys
import importlib.util
from pathlib import Path

logger = logging.getLogger(__name__)

_CONNECTOR_DIR  = Path(__file__).resolve().parent.parent.parent / "DataConnector"
_CONNECTOR_MAIN = _CONNECTOR_DIR / "Main.py"


def run_refresh() -> dict:
    logger.info("Refresh started.")
    try:
        connector_dir = str(_CONNECTOR_DIR)
        # Ensure DataConnector is importable and run its main() function.
        for path in [connector_dir, str(_CONNECTOR_DIR / "Data"), str(_CONNECTOR_DIR / "Connector")]:
            if path not in sys.path:
                sys.path.insert(0, path)

        spec = importlib.util.spec_from_file_location("connector_main", _CONNECTOR_MAIN)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        result = module.main()
        logger.info("Refresh completed — %s", result.get("message"))
        return result

    except Exception as exc:
        logger.error("Refresh failed: %s", exc, exc_info=True)
        return {"status": "error", "message": str(exc)}