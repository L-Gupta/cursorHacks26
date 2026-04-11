"""
Application configuration loaded from environment variables.

Uses ``pydantic-settings`` (or equivalent) so secrets and URLs are validated at
startup. Defines paths for Chroma persistence, embedding model name, Claude
model id, SEC EDGAR User-Agent string (required by SEC policy), and optional
demo-mode flags.

Do not hardcode API keys in this file; read from ``os.environ`` or ``.env``
via settings only.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings for the FastAPI app."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    anthropic_api_key: str = ""
    # Finnhub (https://finnhub.io) — stock quotes; keep on server only.
    finnhub_api_key: str = ""
    # Financial Modeling Prep — optional fundamentals / calendar (server-side only).
    fmp_api_key: str = ""
    chroma_persist_directory: str = "./chroma_data"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    claude_model: str = "claude-sonnet-4-5-20250929"
    sec_edgar_user_agent: str = "EarningsLens/0.1 (contact@example.com)"


def get_settings() -> Settings:
    """Lazy settings singleton for dependency injection."""
    return Settings()
