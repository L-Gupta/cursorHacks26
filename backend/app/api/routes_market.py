"""
Market data routes: proxy real-world quotes and trending stocks through the
backend so API keys stay server-side.
"""

from __future__ import annotations

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status

from backend.app.config import Settings
from backend.app.dependencies import cached_settings
from backend.app.models.schemas import StockQuote
from backend.app.services.market_data import fetch_fmp_quote, fetch_fmp_trending

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/market", tags=["market"])


def _require_fmp(settings: Settings) -> str:
    key = settings.fmp_api_key.strip()
    if not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Market data not configured. Set FMP_API_KEY on the server.",
        )
    return key


@router.get("/quote/{ticker}", response_model=StockQuote)
async def get_quote(
    ticker: str,
    settings: Annotated[Settings, Depends(cached_settings)],
) -> StockQuote:
    key = _require_fmp(settings)
    if not ticker.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ticker required")
    try:
        return await fetch_fmp_quote(key, ticker)
    except Exception as e:
        logger.exception("Market quote failed for %s", ticker)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Market provider error: {e!s}",
        ) from e


@router.get("/trending")
async def get_trending(
    settings: Annotated[Settings, Depends(cached_settings)],
) -> list[dict[str, Any]]:
    """Most active + top gainers, merged and deduplicated."""
    key = _require_fmp(settings)
    try:
        return await fetch_fmp_trending(key)
    except Exception as e:
        logger.exception("Trending fetch failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Trending provider error: {e!s}",
        ) from e
