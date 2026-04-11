"""
Text chunking for vector indexing: 512-token windows with 64-token overlap.

Uses whitespace-based word splitting (fast and model-agnostic). Emits chunk
records with stable indices and source metadata for citation in contradiction
cards.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Chunk:
    """A text window with provenance metadata for Chroma storage."""

    text: str
    chunk_index: int
    source: str = ""
    form_type: str = ""
    filing_date: str = ""
    accession: str = ""
    metadata: dict[str, str] = field(default_factory=dict)


def chunk_text(
    text: str,
    *,
    window: int = 512,
    overlap: int = 64,
    source: str = "",
    form_type: str = "",
    filing_date: str = "",
    accession: str = "",
) -> list[Chunk]:
    """Split *text* into overlapping word-level windows.

    Returns an ordered list of ``Chunk`` objects. Empty or whitespace-only
    input produces an empty list.
    """
    words = text.split()
    if not words:
        return []

    chunks: list[Chunk] = []
    step = max(1, window - overlap)
    idx = 0

    for start in range(0, len(words), step):
        segment = words[start : start + window]
        if not segment:
            break
        chunks.append(
            Chunk(
                text=" ".join(segment),
                chunk_index=idx,
                source=source,
                form_type=form_type,
                filing_date=filing_date,
                accession=accession,
            )
        )
        idx += 1
        if start + window >= len(words):
            break

    return chunks
