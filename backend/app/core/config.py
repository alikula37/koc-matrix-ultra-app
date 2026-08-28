"""
Core settings — Pydantic Settings v2.
All env vars can be overridden via .env or docker-compose environment.
Self-documenting: each field has description.
"""
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # App
    ENV: str = "development"
    LOG_LEVEL: str = "info"
    SECRET_KEY: str = "change-me-32chars-minimum-secret-key-12345"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: str = "http://localhost:3000,http://frontend:3000"

    # DB
    DATABASE_URL: str = "postgresql+asyncpg://koc_matrix:koc_matrix_secret_2025@db:5432/koc_matrix_ultra"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://koc_matrix:koc_matrix_secret_2025@db:5432/koc_matrix_ultra"

    # Features
    WEBHOOK_ENABLED: bool = False
    RCLONE_ENABLED: bool = False

    # Notifications
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
