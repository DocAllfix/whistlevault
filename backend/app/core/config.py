"""Application configuration loaded from environment (prefix WB_)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="WB_", env_file=".env", extra="ignore")

    environment: str = "development"

    # Database
    database_url: str = "postgresql+asyncpg://wb:wb_dev_password@localhost:5432/whistleblower"

    # SMTP (notifications)
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_from: str = "no-reply@whistleblower.local"
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_starttls: bool = True

    # Receipt lookup pepper (HMAC key). MUST be a strong secret in production;
    # never stored in the DB. Without it a DB dump cannot brute-force receipts.
    receipt_pepper: str = "dev-only-pepper-change-me"

    # Sessions / auth
    session_ttl_minutes: int = 120

    # Encrypted attachment storage
    files_path: str = "data/files"
    max_upload_bytes: int = 50 * 1024 * 1024  # 50 MB

    # Argon2id cost: "interactive" (OWASP-compliant, default), "moderate", "sensitive".
    # Raise to "moderate" in production for stronger password hardening.
    argon2_level: str = "interactive"

    # CORS (frontend origins, comma-separated)
    cors_origins: str = "http://localhost:5173"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def validate_for_production(self) -> None:
        """Fail-fast on insecure config when running in production.

        Refuses to boot with example/placeholder secrets so a misconfigured
        deploy can never go live with a weak receipt pepper.
        """
        if not self.is_production:
            return
        problems: list[str] = []
        if not self.receipt_pepper or "change-me" in self.receipt_pepper.lower():
            problems.append("WB_RECEIPT_PEPPER must be set to a strong unique secret")
        if problems:
            raise RuntimeError("Insecure production configuration: " + "; ".join(problems))


@lru_cache
def get_settings() -> Settings:
    return Settings()
