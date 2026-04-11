"""
Analysis routes: transcript segment scoring and contradiction search.

``POST /analyze`` invokes Claude with structured tool output, embeds
``contradiction_query``, queries Chroma, updates session credibility, and
returns ``AnalyzeResponse``.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from backend.app.config import Settings
from backend.app.dependencies import (
    cached_settings,
    get_analyzer_dep,
    get_chroma_store_dep,
    get_embedding_dep,
    get_session_store_dep,
)
from backend.app.models.schemas import AnalyzeRequest, AnalyzeResponse, ContradictionMatch
from backend.app.services.chroma_store import ChromaHit, ChromaStore
from backend.app.services.claude_analyzer import ClaudeAnalyzer
from backend.app.services.embeddings import EmbeddingService
from backend.app.services.session_store import SessionStore, apply_credibility_delta

router = APIRouter(prefix="/analyze", tags=["analyze"])


def _hit_to_contradiction(hit: ChromaHit) -> ContradictionMatch:
    meta = hit.metadata or {}
    filing_date = meta.get("filing_date")
    if filing_date is not None:
        filing_date = str(filing_date)
    doc_type = meta.get("document_type")
    if doc_type is not None:
        doc_type = str(doc_type)
    src = meta.get("source")
    if src is not None:
        src = str(src)
    return ContradictionMatch(
        prior_text=hit.document,
        filing_date=filing_date,
        document_type=doc_type,
        source=src,
        distance=hit.distance,
    )


@router.post("/", response_model=AnalyzeResponse)
async def analyze_segment(
    body: AnalyzeRequest,
    settings: Annotated[Settings, Depends(cached_settings)],
    analyzer: Annotated[ClaudeAnalyzer, Depends(get_analyzer_dep)],
    embedder: Annotated[EmbeddingService, Depends(get_embedding_dep)],
    chroma: Annotated[ChromaStore, Depends(get_chroma_store_dep)],
    sessions: Annotated[SessionStore, Depends(get_session_store_dep)],
) -> AnalyzeResponse:
    if not settings.anthropic_api_key.strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ANTHROPIC_API_KEY is not configured.",
        )

    ticker = body.ticker.strip().upper() if body.ticker else None
    prior_cred = sessions.get_credibility_map(body.session_id)

    tool_result = await analyzer.analyze_segment(
        segment=body.segment,
        speaker=body.speaker,
        ticker=ticker,
        question_context=body.question_context,
    )

    contradiction: ContradictionMatch | None = None
    if ticker:
        query_text = tool_result.contradiction_query.strip() or body.segment.strip()[:500]
        q_emb = embedder.encode(query_text)
        hits = chroma.query_similar(ticker, q_emb, n_results=5)
        if hits:
            best = min(
                hits,
                key=lambda h: h.distance if h.distance is not None else float("inf"),
            )
            if best.document.strip():
                contradiction = _hit_to_contradiction(best)

    new_cred = apply_credibility_delta(prior_cred, body.speaker, tool_result.score_delta)

    response = AnalyzeResponse(
        session_id=body.session_id,
        ticker=ticker,
        tool_result=tool_result,
        contradiction=contradiction,
        credibility_by_speaker=new_cred,
    )
    sessions.record_analyze(response)
    return response
