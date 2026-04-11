"""
Embedding generation using sentence-transformers (all-MiniLM-L6-v2).

Loads the model once (heavy) and exposes ``encode`` for query-time contradiction
search. Vectors are L2-normalized for cosine distance in Chroma.
"""

from __future__ import annotations

import threading
from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    from sentence_transformers import SentenceTransformer


class EmbeddingService:
    """Lazy-loaded embedding model with thread-safe first load."""

    def __init__(self, model_name: str) -> None:
        self._model_name = model_name
        self._model: SentenceTransformer | None = None
        self._lock = threading.Lock()

    def _ensure_model(self) -> SentenceTransformer:
        if self._model is not None:
            return self._model
        with self._lock:
            if self._model is None:
                from sentence_transformers import SentenceTransformer as ST

                self._model = ST(self._model_name)
        return self._model

    def encode(self, text: str) -> list[float]:
        """Return a single normalized embedding vector (dim 384 for MiniLM)."""
        model = self._ensure_model()
        vec = model.encode(text.strip() or " ", normalize_embeddings=True)
        arr = np.asarray(vec, dtype=np.float32).flatten()
        return arr.tolist()

    def encode_batch(self, texts: list[str]) -> list[list[float]]:
        model = self._ensure_model()
        vecs = model.encode(texts, normalize_embeddings=True)
        out: list[list[float]] = []
        for row in np.atleast_2d(vecs):
            out.append(np.asarray(row, dtype=np.float32).flatten().tolist())
        return out


_embedding_singleton: EmbeddingService | None = None
_embedding_model_name: str | None = None


def get_embedding_service(model_name: str) -> EmbeddingService:
    """Process-wide singleton keyed by model name."""
    global _embedding_singleton, _embedding_model_name
    if _embedding_singleton is None or _embedding_model_name != model_name:
        _embedding_singleton = EmbeddingService(model_name)
        _embedding_model_name = model_name
    return _embedding_singleton
