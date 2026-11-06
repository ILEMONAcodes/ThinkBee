from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "local"
    database_url: str = "postgresql+asyncpg://thinkbee:thinkbee@localhost:5432/thinkbee"
    redis_url: str = "redis://localhost:6379/0"
    allowed_origins: str = "http://localhost:3000"
    supabase_url: str = ""
    supabase_jwt_audience: str = "authenticated"
    supabase_jwt_issuer: str = ""
    supabase_jwt_algorithms: str = "ES256,RS256,EdDSA"
    supabase_required_role: str = "authenticated"
    supabase_jwks_cache_ttl_seconds: int = Field(default=300, ge=60, le=3600)
    supabase_jwks_timeout_seconds: float = Field(default=5.0, gt=0, le=30)
    supabase_jwt_leeway_seconds: int = Field(default=30, ge=0, le=300)
    supabase_service_role_key: SecretStr = SecretStr("")
    farmer_id_max_attempts: int = Field(default=5, ge=1, le=20)
    default_locale: str = "en-NG"
    supported_locales: str = "en-NG"
    max_farms_per_user: int = Field(default=20, ge=1, le=1000)
    max_units_per_farm: int = Field(default=200, ge=1, le=10000)
    page_size: int = Field(default=50, ge=1, le=100)
    max_page_size: int = Field(default=100, ge=1, le=1000)
    supabase_admin_timeout_seconds: float = Field(default=10, gt=0, le=30)
    deletion_batch_size: int = Field(default=25, ge=1, le=100)
    deletion_retry_seconds: int = Field(default=60, ge=1, le=3600)
    deletion_max_retry_seconds: int = Field(default=3600, ge=1, le=86400)
    deletion_job_timeout_seconds: int = Field(default=3600, ge=60, le=86400)

    @property
    def allowed_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def normalized_supabase_url(self) -> str:
        return self.supabase_url.rstrip("/")

    @property
    def effective_supabase_jwt_issuer(self) -> str:
        return self.supabase_jwt_issuer or f"{self.normalized_supabase_url}/auth/v1"

    @property
    def supabase_jwks_url(self) -> str:
        return f"{self.normalized_supabase_url}/auth/v1/.well-known/jwks.json"

    @property
    def supabase_jwt_algorithm_list(self) -> list[str]:
        return [
            algorithm.strip()
            for algorithm in self.supabase_jwt_algorithms.split(",")
            if algorithm.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
