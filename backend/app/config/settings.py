from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "Opsara"
    VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    API_PREFIX: str = "/api"

    # LLM
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:opsarapassword@localhost:5432/opsara"

    # Kubernetes
    KUBECONFIG_PATH: Optional[str] = None
    DEFAULT_NAMESPACE: str = "opsara-demo"
    CLUSTER_NAME: str = "opsara"

    # Policy & Safety
    AUTO_APPROVE_READ_ONLY: bool = True
    REQUIRE_APPROVAL_MEDIUM_RISK: bool = True
    REQUIRE_APPROVAL_HIGH_RISK: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
