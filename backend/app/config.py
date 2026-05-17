from functools import lru_cache
from typing import Literal, Optional

from pydantic import AliasChoices, Field
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")

    app_name: str = "Talent Map"
    app_env: Literal["development", "staging", "production"] = "development"
    app_log_level: str = "INFO"
    app_enable_docs: bool = True
    app_secret_key: str = "dev-change-me-in-production-min-32-chars"
    app_allowed_origins: str = "http://localhost:3000,http://localhost:3001,http://localhost:3002"
    app_cors_include_localhost: bool = True

    database_url: str
    database_pool_size: int = 5
    database_max_overflow: int = 10
    database_connect_timeout: int = 30
    database_pool_timeout: int = 30
    database_pool_recycle: int = 1800
    database_statement_timeout_ms: int = 15000

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
    gemini_api_key: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("GEMINI_API_KEY", "GOOGLE_API_KEY"),
    )
    gemini_model: str = "gemini-1.5-flash-latest"
    gemini_embedding_model: str = "models/text-embedding-004"
    mongodb_url: Optional[str] = None

    pinecone_api_key: Optional[str] = None
    pinecone_index_name: str = "talentmap-rag"

    @field_validator("app_log_level")
    @classmethod
    def _normalize_log_level(cls, value: str) -> str:
        return value.strip().upper() or "INFO"

    @field_validator("database_pool_size", "database_max_overflow", "database_connect_timeout", "database_pool_timeout", "database_pool_recycle", "database_statement_timeout_ms")
    @classmethod
    def _validate_positive_ints(cls, value: int) -> int:
        if value < 1:
            raise ValueError("must be >= 1")
        return value

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.app_allowed_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @model_validator(mode="after")
    def _validate_security_requirements(self) -> "Settings":
        if len(self.app_secret_key) < 32:
            raise ValueError("APP_SECRET_KEY must be at least 32 characters")
        if len(self.jwt_secret_key) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters")

        if self.is_production:
            insecure_defaults = {
                "dev-change-me-in-production-min-32-chars",
                "dev-change-me-jwt-secret-min-32-characters",
                "change-me-min-32-characters-long-secret",
                "change-me-another-32-char-minimum-secret-key",
            }
            if self.app_secret_key in insecure_defaults:
                raise ValueError("APP_SECRET_KEY uses an insecure default for production")
            if self.jwt_secret_key in insecure_defaults:
                raise ValueError("JWT_SECRET_KEY uses an insecure default for production")
            if not self.allowed_origins_list:
                raise ValueError("APP_ALLOWED_ORIGINS must contain at least one origin in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
