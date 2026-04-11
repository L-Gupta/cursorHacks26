"""
FastAPI dependency providers (shared resources per request).
"""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from backend.app.config import Settings, get_settings
from backend.app.services.chroma_store import ChromaStore
from backend.app.services.claude_analyzer import ClaudeAnalyzer, get_claude_analyzer
from backend.app.services.embeddings import get_embedding_service, EmbeddingService
from backend.app.services.session_store import SessionStore, get_session_store


@lru_cache
def cached_settings() -> Settings:
    """Cached settings instance (avoid re-parsing env on every request)."""
    return get_settings()


@lru_cache
def _chroma_singleton(path: str) -> ChromaStore:
    return ChromaStore(persist_directory=path)


def get_chroma_store_dep(
    settings: Annotated[Settings, Depends(cached_settings)],
) -> ChromaStore:
    """Single Chroma client per persist directory."""
    return _chroma_singleton(settings.chroma_persist_directory)


def get_embedding_dep(
    settings: Annotated[Settings, Depends(cached_settings)],
) -> EmbeddingService:
    return get_embedding_service(settings.embedding_model)


def get_analyzer_dep(
    settings: Annotated[Settings, Depends(cached_settings)],
) -> ClaudeAnalyzer:
    return get_claude_analyzer(settings)


def get_session_store_dep() -> SessionStore:
    return get_session_store()
