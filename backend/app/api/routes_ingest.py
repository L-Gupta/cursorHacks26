"""
Ingestion routes: index SEC filings and earnings transcripts into ChromaDB.

``POST /ingest/{ticker}`` resolves CIK from ticker, pulls recent 10-K/10-Q (and
optional transcript sources), chunks text with overlap, embeds with
sentence-transformers, and stores under collection ``{ticker}_filings``.

Implementation will call ``services.sec_edgar``, ``chunking``, ``embeddings``,
and ``chroma_store``.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("/{ticker}")
async def ingest_ticker(ticker: str) -> dict[str, str]:
    """Placeholder; wire to ingestion pipeline."""
    return {"status": "not_implemented", "ticker": ticker}
