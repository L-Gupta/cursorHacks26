"""
Embedding generation with all-MiniLM-L6-v2 via Chroma's ONNX runtime wrapper.

Uses the same model as sentence-transformers (384-dim) but through
onnxruntime, avoiding torch so the backend fits in ~512 MB of RAM. The model
is loaded lazily once and exposes ``encode`` for query-time contradiction
search. Vectors are L2-normalized for cosine distance in Chroma.
"""

from __future__ import annotations

import threading
from typing import Any

import numpy as np

_MAX_BATCH = 8


class EmbeddingService:
    """Lazy-loaded ONNX embedding model with thread-safe first load."""

    def __init__(self, model_name: str) -> None:
        # Only all-MiniLM-L6-v2 is bundled with Chroma's ONNX wrapper.
        self._model_name = model_name
        self._model: Any | None = None
        self._lock = threading.Lock()

    def _ensure_model(self) -> Any:
        if self._model is not None:
            return self._model
        with self._lock:
            if self._model is None:
                from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2

                self._model = ONNXMiniLM_L6_V2(preferred_providers=["CPUExecutionProvider"])
        return self._model

    @staticmethod
    def _normalize(vec: Any) -> list[float]:
        arr = np.asarray(vec, dtype=np.float32).flatten()
        norm = float(np.linalg.norm(arr))
        return (arr / norm if norm else arr).tolist()

    def encode(self, text: str) -> list[float]:
        """Return a single normalized embedding vector (dim 384 for MiniLM)."""
        return self.encode_batch([text.strip() or " "])[0]

    def encode_batch(self, texts: list[str]) -> list[list[float]]:
        model = self._ensure_model()
        out: list[list[float]] = []
        # Small batches keep peak memory low (Render free tier is 512 MB).
        for i in range(0, len(texts), _MAX_BATCH):
            out.extend(self._normalize(v) for v in model(texts[i : i + _MAX_BATCH]))
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
