"""
Market data routes: proxy real-world quotes through the backend (keys stay server-side).
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

logger = logging.getLogger(__name__)

from backend.app.config import Settings
from backend.app.dependencies import cached_settings
from backend.app.models.schemas import StockQuote
from backend.app.services.market_data import fetch_finnhub_quote

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/quote/{ticker}", response_model=StockQuote)
async def get_quote(
    ticker: str,
    settings: Annotated[Settings, Depends(cached_settings)],
) -> StockQuote:
    """
    Return a live quote for ``ticker`` using the configured provider.

    Set ``FINNHUB_API_KEY`` in the backend environment. For production, consider
    caching and rate limits per IP.
    """
    if not settings.finnhub_api_key.strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Market data is not configured. Set FINNHUB_API_KEY on the server.",
        )
    if not ticker.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ticker required")
    try:
        return await fetch_finnhub_quote(settings.finnhub_api_key, ticker)
    except Exception as e:
        logger.exception("Market quote failed for %s", ticker)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Market provider error: {e!s}",
        ) from e
