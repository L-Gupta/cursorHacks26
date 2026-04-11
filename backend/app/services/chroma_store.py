"""
ChromaDB persistence layer for filing and transcript chunks.

Queries collections named ``{TICKER}_filings`` with precomputed query embeddings.
Ingest populates the same collections; if missing, contradiction search returns
no match without failing the analyze call.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import chromadb
from chromadb.api.models.Collection import Collection


def _collection_name(ticker: str) -> str:
    return f"{ticker.strip().upper()}_filings"


@dataclass
class ChromaHit:
    """Single similarity hit with document text and metadata."""

    document: str
    distance: float | None
    metadata: dict[str, Any]


class ChromaStore:
    """Thin wrapper around persistent Chroma client."""

    def __init__(self, persist_directory: str) -> None:
        self._client = chromadb.PersistentClient(path=persist_directory)

    def _get_collection(self, ticker: str) -> Collection | None:
        name = _collection_name(ticker)
        try:
            return self._client.get_collection(name=name)
        except Exception:
            return None

    def query_similar(
        self,
        ticker: str,
        query_embedding: list[float],
        n_results: int = 5,
    ) -> list[ChromaHit]:
        """Return top-k nearest chunks by embedding distance."""
        col = self._get_collection(ticker)
        if col is None:
            return []
        n = max(1, min(n_results, 50))
        res = col.query(
            query_embeddings=[query_embedding],
            n_results=n,
            include=["documents", "metadatas", "distances"],
        )
        docs = (res.get("documents") or [[]])[0]
        metas = (res.get("metadatas") or [[]])[0]
        dists = (res.get("distances") or [[]])[0]
        hits: list[ChromaHit] = []
        for i, doc in enumerate(docs or []):
            meta_raw = metas[i] if i < len(metas) else {}
            metadata = dict(meta_raw) if isinstance(meta_raw, dict) else {}
            dist = dists[i] if i < len(dists) else None
            hits.append(ChromaHit(document=doc or "", distance=dist, metadata=metadata))
        return hits
