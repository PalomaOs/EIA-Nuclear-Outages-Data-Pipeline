from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = BASE_DIR / ".env" if (BASE_DIR / ".env").exists() else None

_default_db = (
    Path("/app/DataConnector/Data/processed/database.db")
    if Path("/app").exists()
    else BASE_DIR / "DataConnector" / "Data" / "processed" / "database.db"
)

class Settings(BaseSettings):
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 5

    app_username: str
    app_password: str  

    db_path: str = str(_default_db)

    allowed_origins: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore")


settings = Settings()