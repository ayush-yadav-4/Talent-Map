from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    app_name: str = "Talent Map"
    app_env: str = "development"
    app_secret_key: str = "dev-change-me-in-production-min-32-chars"
    app_allowed_origins: str = "http://localhost:3000,http://localhost:3001,http://localhost:3002"

    database_url: str
    database_pool_size: int = 5
    database_max_overflow: int = 10

    redis_url: str = "redis://localhost:6379/0"

    jwt_secret_key: str = "dev-change-me-jwt-secret-min-32-characters"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 7

    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: bool = True
    email_from: str = "noreply@talentmap.local"
    app_login_url: str = "http://localhost:3001/login"

    sentry_dsn: Optional[str] = None
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-1.5-flash-latest"
    mongodb_url: Optional[str] = None


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
