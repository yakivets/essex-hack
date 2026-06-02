"""App settings (pydantic-settings). Reads from environment / .env."""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # FAKE_OCI=1 -> canned response (no cloud). FAKE_OCI=0 -> real OCI GenAI pipeline.
    fake_oci: bool = True
    cache_ttl_seconds: int = 3600
    # CORS: open in dev so the Vite/TanStack dev server can call us from any port.
    cors_origins: list[str] = ["*"]

    # OCI Generative AI (only needed when fake_oci=False). Auth comes from ~/.oci/config.
    oci_region: str = ""
    oci_genai_endpoint: str = ""
    oci_compartment_id: str = ""
    oci_genai_chat_model: str = ""
    # Max clauses we ask the model to extract (latency / token guard).
    max_clauses: int = 14


settings = Settings()
