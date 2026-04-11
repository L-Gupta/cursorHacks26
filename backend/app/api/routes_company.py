"""
Company search, profile, earnings stream discovery, and AI summary/insight routes.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from backend.app.config import Settings
from backend.app.dependencies import cached_settings
from backend.app.services.company_search import get_company_profile, search_companies
from backend.app.services.earnings_stream import find_earnings_stream
from backend.app.services.ai_summary import generate_summary, generate_general_insight

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/company", tags=["company"])


class CompanySearchResult(BaseModel):
    ticker: str
    name: str
    type: str | None = None


class CompanyProfile(BaseModel):
    ticker: str
    name: str
    logo: str | None = None
    industry: str | None = None
    market_cap: float | None = None
    exchange: str | None = None
    ipo_date: str | None = None
    weburl: str | None = None


class EarningsStreamResult(BaseModel):
    ticker: str
    title: str
    url: str
    embed_url: str | None = None
    is_live: bool
    source: str | None = None


class SummaryRequest(BaseModel):
    segment: str = Field(..., min_length=1)
    speaker: str = Field(default="Unknown")
    ticker: str = Field(..., min_length=1)
    market_context: str | None = None
    prior_statements: str | None = None


class SummaryResponse(BaseModel):
    id: str
    timestamp: str
    headline: str
    body: str
    sentiment: str
    confidence: float
    signals: list[str] = Field(default_factory=list)


class GeneralInsightRequest(BaseModel):
    ticker: str = Field(..., min_length=1)
    company_name: str = Field(default="")
    market_context: str | None = None


def _require_fmp(settings: Settings) -> str:
    key = settings.fmp_api_key.strip()
    if not key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="FMP_API_KEY not set")
    return key


@router.get("/search", response_model=list[CompanySearchResult])
async def search(
    q: str,
    settings: Annotated[Settings, Depends(cached_settings)],
) -> list[CompanySearchResult]:
    key = _require_fmp(settings)
    results = await search_companies(key, q)
    return [CompanySearchResult(**r) for r in results]


@router.get("/profile/{ticker}", response_model=CompanyProfile | None)
async def profile(
    ticker: str,
    settings: Annotated[Settings, Depends(cached_settings)],
) -> CompanyProfile | None:
    key = _require_fmp(settings)
    data = await get_company_profile(key, ticker)
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No profile for {ticker}")
    return CompanyProfile(**data)


@router.get("/stream/{ticker}", response_model=EarningsStreamResult | None)
async def stream(
    ticker: str,
    settings: Annotated[Settings, Depends(cached_settings)],
) -> Any:
    result = await find_earnings_stream(ticker, company_name="")
    if not result:
        return None
    return EarningsStreamResult(**result)


@router.post("/summary", response_model=SummaryResponse)
async def summary(
    body: SummaryRequest,
    settings: Annotated[Settings, Depends(cached_settings)],
) -> SummaryResponse:
    if not settings.anthropic_api_key.strip():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="ANTHROPIC_API_KEY not set")
    result = await generate_summary(
        settings,
        segment=body.segment,
        speaker=body.speaker,
        ticker=body.ticker,
        market_context=body.market_context,
        prior_statements=body.prior_statements,
    )
    return SummaryResponse(
        id=str(uuid.uuid4()),
        timestamp=datetime.now(timezone.utc).isoformat(),
        **result,
    )


@router.post("/general-insight", response_model=SummaryResponse)
async def general_insight(
    body: GeneralInsightRequest,
    settings: Annotated[Settings, Depends(cached_settings)],
) -> SummaryResponse:
    """AI-generated general insight about a company (no transcript needed)."""
    if not settings.anthropic_api_key.strip():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="ANTHROPIC_API_KEY not set")
    result = await generate_general_insight(
        settings,
        ticker=body.ticker,
        company_name=body.company_name,
        market_context=body.market_context,
    )
    return SummaryResponse(
        id=str(uuid.uuid4()),
        timestamp=datetime.now(timezone.utc).isoformat(),
        **result,
    )
