"""
Market data routes: proxy quotes and trending stocks through the backend.
Uses Yahoo Finance (no key required) with FMP as profile/search fallback.
"""

from __future__ import annotations

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status

from backend.app.config import Settings
from backend.app.dependencies import cached_settings
from backend.app.models.schemas import StockQuote
from backend.app.services.market_data import fetch_stock_quote, fetch_trending

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/quote/{ticker}", response_model=StockQuote)
async def get_quote(
    ticker: str,
    settings: Annotated[Settings, Depends(cached_settings)],
) -> StockQuote:
    if not ticker.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ticker required")
    try:
        return await fetch_stock_quote(settings.fmp_api_key, ticker)
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
    """Most active stocks sorted by absolute percent change."""
    try:
        return await fetch_trending(settings.fmp_api_key)
    except Exception as e:
        logger.exception("Trending fetch failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Trending provider error: {e!s}",
        ) from e
