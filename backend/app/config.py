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
    # Embedding model id (e.g. cohere.embed-english-v3.0 / cohere.embed-multilingual-v3.0).
    oci_genai_embed_model: str = ""
    # Read timeout (seconds) for OCI inference calls. The SDK default is 60s,
    # which a large structured analysis can exceed — give it real headroom.
    oci_read_timeout: float = 240.0
    # Max clauses we ask the model to extract (latency / token guard). Fewer
    # clauses = less JSON = faster, more reliable generation.
    max_clauses: int = 8

    # Oracle Autonomous DB 23ai (vector store). Leave ADB_DSN empty to use the
    # in-memory cosine fallback — the app runs offline either way.
    adb_user: str = ""
    adb_password: str = ""
    adb_dsn: str = ""          # e.g. pactpilot_high (from tnsnames.ora in the wallet)
    tns_admin: str = ""        # path to the unzipped wallet (sets TNS_ADMIN)
    # Password set when downloading the wallet zip (only if ewallet.p12 needs it).
    wallet_password: str = ""
    # Vector dimension. Fake embeddings + Cohere v3 models are 1024-dim.
    embed_dim: int = 1024

    # Accounts + dashboard. SQLite locally; swap to OCI Oracle by changing
    # DATABASE_URL to oracle+oracledb://ADMIN:...@adb_high (same SQLAlchemy driver).
    database_url: str = "sqlite:///./pactpilot.db"
    # HS256 secret for signing JWTs. Override in .env for anything but local dev.
    jwt_secret: str = "dev-secret-change-me"
    jwt_expire_hours: int = 168  # 7 days

    @property
    def use_oracle(self) -> bool:
        """True when an Oracle ADB DSN is configured; else use in-memory store."""
        return bool(self.adb_dsn.strip())


settings = Settings()
