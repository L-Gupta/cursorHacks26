"""
Pydantic schemas for EarningsLens API contracts.

Includes analyze request/response, Claude tool output, contradiction matches,
and session snapshots for PDF export.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class DeceptionSignalItem(BaseModel):
    """Single detected signal with evidence quote."""

    type: str = Field(
        ...,
        description="One of 11 taxonomy types (e.g. hedging, deflection, ...).",
    )
    quote: str
    explanation: str


class AnalyzeToolResult(BaseModel):
    """Structured tool output shape from Claude per /analyze call."""

    deception_signals: list[DeceptionSignalItem] = Field(default_factory=list)
    contradiction_query: str = ""
    score_delta: int = 0
    confidence: float = Field(0.0, ge=0.0, le=1.0)


class AnalyzeRequest(BaseModel):
    """Client payload for POST /analyze."""

    segment: str = Field(..., min_length=1, description="1–3 sentences of transcript.")
    speaker: str = Field(..., min_length=1, description="Diarized label, e.g. CEO, CFO, Analyst.")
    session_id: str = Field(..., min_length=1)
    ticker: str | None = Field(
        default=None,
        description="Uppercase ticker; required for Chroma contradiction search.",
    )
    question_context: str | None = Field(
        default=None,
        description="Optional analyst question text for non_answer / omission signals.",
    )


class ContradictionMatch(BaseModel):
    """Top semantic match from Chroma that may contradict the current segment."""

    prior_text: str
    filing_date: str | None = None
    document_type: str | None = None
    source: str | None = Field(
        default=None,
        description="Origin label, e.g. edgar_10k, transcript.",
    )
    distance: float | None = Field(
        default=None,
        description="Chroma distance for the hit (lower is closer).",
    )


class AnalyzeResponse(BaseModel):
    """Full response including tool output, optional contradiction, and rolling credibility."""

    session_id: str
    ticker: str | None
    tool_result: AnalyzeToolResult
    contradiction: ContradictionMatch | None = None
    credibility_by_speaker: dict[str, int] = Field(
        default_factory=dict,
        description="Rolling 0–100 credibility per speaker label after this segment.",
    )


class SessionSnapshot(BaseModel):
    """Aggregated session for GET /report and PDF export."""

    session_id: str
    ticker: str | None
    analyze_events: list[AnalyzeResponse] = Field(default_factory=list)
    credibility_by_speaker: dict[str, int] = Field(default_factory=dict)


class IngestResponse(BaseModel):
    """Response from POST /ingest/{ticker}."""

    status: str
    ticker: str
    filings_fetched: int = Field(description="Number of SEC filings downloaded.")
    chunks_stored: int = Field(description="Number of text chunks upserted into Chroma.")
    collection_total: int = Field(description="Total documents in the ticker's Chroma collection.")
    filings_summary: list[str] = Field(
        default_factory=list,
        description="Human-readable list of ingested filings, e.g. '10-K (2024-02-15)'.",
    )


class StockQuote(BaseModel):
    """Normalized equity quote from an external market data provider (via backend proxy)."""

    ticker: str
    provider: str = Field(description="e.g. finnhub, polygon")
    currency: str | None = None
    current: float | None = Field(default=None, description="Last trade / current price where available.")
    change: float | None = None
    percent_change: float | None = None
    high: float | None = None
    low: float | None = None
    open: float | None = None
    previous_close: float | None = None
    timestamp_ms: int | None = Field(default=None, description="Quote time in unix milliseconds.")
    raw: dict[str, object] | None = Field(
        default=None,
        description="Optional provider-specific fields for debugging.",
    )
