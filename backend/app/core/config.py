from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    app_name: str = "Plantify API"
    app_env: str = "development"
    secret_key: str = Field(default="change-me-in-production", min_length=16)
    access_token_expire_minutes: int = 60 * 24
    refresh_token_expire_days: int = 30
    algorithm: str = "HS256"

    sqlite_path: str = str(BACKEND_DIR / "plantify.db")
    model_path: str = str(BACKEND_DIR / "model" / "plantify_model.onnx")
    labels_path: str = str(BACKEND_DIR / "model" / "classes.json")
    checkpoint_path: str = str(REPO_ROOT / "plantify_model.pth")
    upload_max_bytes: int = 5 * 1024 * 1024
    upload_allowed_mime_types: str = "image/jpeg,image/png,image/webp"

    cors_origins: str = "http://localhost:3000,http://localhost"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def sqlite_url(self) -> str:
        db_path = Path(self.sqlite_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite+aiosqlite:///{db_path}"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def upload_allowed_mime_list(self) -> list[str]:
        return [mime.strip() for mime in self.upload_allowed_mime_types.split(",") if mime.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
