"""
Ingestion routes: index SEC filings and earnings transcripts into ChromaDB.

``POST /ingest/{ticker}`` resolves CIK from ticker, pulls recent 10-K/10-Q,
chunks text with overlap, embeds with sentence-transformers, and stores under
collection ``{ticker}_filings``.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from backend.app.config import get_settings
from backend.app.models.schemas import IngestResponse
from backend.app.services.chroma_store import ChromaStore
from backend.app.services.chunking import chunk_text
from backend.app.services.embeddings import get_embedding_service
from backend.app.services.sec_edgar import fetch_recent_filings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("/{ticker}", response_model=IngestResponse)
async def ingest_ticker(ticker: str) -> IngestResponse:
    """Fetch SEC filings, chunk, embed, and write to ChromaDB."""
    ticker = ticker.strip().upper()
    if not ticker or len(ticker) > 10:
        raise HTTPException(status_code=400, detail="Invalid ticker symbol.")

    settings = get_settings()

    # 1. Fetch filings from SEC EDGAR
    logger.info("Fetching SEC filings for %s", ticker)
    try:
        filings = await fetch_recent_filings(
            ticker=ticker,
            user_agent=settings.sec_edgar_user_agent,
            form_types=("10-K", "10-Q"),
            max_filings=3,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("EDGAR fetch failed for %s", ticker)
        raise HTTPException(
            status_code=502, detail=f"SEC EDGAR fetch error: {exc}"
        ) from exc

    if not filings:
        raise HTTPException(
            status_code=404,
            detail=f"No 10-K/10-Q filings found for {ticker}.",
        )

    # 2. Chunk all filing texts
    all_chunks = []
    for filing in filings:
        chunks = chunk_text(
            filing.text,
            window=512,
            overlap=64,
            source=f"edgar_{filing.form_type.lower().replace('-', '')}",
            form_type=filing.form_type,
            filing_date=filing.filing_date,
            accession=filing.accession,
        )
        all_chunks.extend(chunks)

    if not all_chunks:
        raise HTTPException(
            status_code=422,
            detail=f"Filings for {ticker} produced no usable text chunks.",
        )

    # 3. Generate embeddings
    logger.info("Embedding %d chunks for %s", len(all_chunks), ticker)
    emb_service = get_embedding_service(settings.embedding_model)
    texts = [c.text for c in all_chunks]
    embeddings = emb_service.encode_batch(texts)

    # 4. Build Chroma documents
    ids = []
    documents = []
    metadatas = []
    for c in all_chunks:
        doc_id = f"{ticker}_{c.source}_{c.accession}_{c.chunk_index}"
        ids.append(doc_id)
        documents.append(c.text)
        metadatas.append(
            {
                "ticker": ticker,
                "source": c.source,
                "form_type": c.form_type,
                "filing_date": c.filing_date,
                "accession": c.accession,
                "chunk_index": str(c.chunk_index),
            }
        )

    # 5. Write to ChromaDB
    store = ChromaStore(persist_directory=settings.chroma_persist_directory)
    upserted = store.upsert_chunks(
        ticker=ticker,
        ids=ids,
        documents=documents,
        embeddings=embeddings,
        metadatas=metadatas,
    )

    total_in_collection = store.collection_count(ticker)
    logger.info(
        "Ingested %d chunks for %s (%d total in collection)",
        upserted,
        ticker,
        total_in_collection,
    )

    return IngestResponse(
        status="ok",
        ticker=ticker,
        filings_fetched=len(filings),
        chunks_stored=upserted,
        collection_total=total_in_collection,
        filings_summary=[
            f"{f.form_type} ({f.filing_date})" for f in filings
        ],
    )
