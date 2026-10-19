"""
Application configuration loaded from environment variables.

Loads ``.env`` from the **repository root** (and optional ``.env.local``,
``backend/.env``) so API keys work whether you start uvicorn from the repo
root or from ``backend/``. OS environment variables still override file values.

Do not hardcode API keys in this file; read from ``os.environ`` or ``.env``
via settings only.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _repo_root() -> Path:
    """``backend/app/config.py`` → parents[2] == repository root."""
    return Path(__file__).resolve().parents[2]


def _env_files() -> tuple[str, ...]:
    """Existing env files only; later entries override earlier (pydantic-settings)."""
    root = _repo_root()
    paths: list[Path] = [
        root / ".env",
        root / ".env.local",
        root / "backend" / ".env",
    ]
    out: list[str] = []
    seen: set[str] = set()
    for p in paths:
        if p.is_file():
            s = str(p.resolve())
            if s not in seen:
                seen.add(s)
                out.append(s)
    return tuple(out)


class Settings(BaseSettings):
    """Runtime settings for the FastAPI app."""

    model_config = SettingsConfigDict(
        env_file=_env_files() or None,
        env_file_encoding="utf-8",
        env_nested_delimiter="__",
        extra="ignore",
    )

    anthropic_api_key: str = ""
    deepgram_api_key: str = ""
    # Finnhub (https://finnhub.io) — stock quotes; keep on server only.
    finnhub_api_key: str = ""
    # Financial Modeling Prep — optional fundamentals / calendar (server-side only).
    fmp_api_key: str = ""
    chroma_persist_directory: str = "./chroma_data"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    claude_model: str = "claude-sonnet-4-5-20250929"
    sec_edgar_user_agent: str = "EarningsLens/0.1 (contact@example.com)"
    # Extra allowed browser origins (comma-separated), e.g. the deployed Vercel URL.
    cors_origins: str = ""


def get_settings() -> Settings:
    """Lazy settings singleton for dependency injection."""
    return Settings()
