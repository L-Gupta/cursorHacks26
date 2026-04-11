"""
Market data via Financial Modeling Prep (FMP) — stable API.

Free tier supports: single quote, profile, search-name.
Batch quotes and market movers require premium, so trending is built by
fetching individual quotes for popular tickers in parallel and sorting by
absolute percent change.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx

from backend.app.models.schemas import StockQuote

logger = logging.getLogger(__name__)

FMP_STABLE = "https://financialmodelingprep.com/stable"

POPULAR_TICKERS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA",
    "META", "TSLA", "JPM", "V", "WMT",
    "JNJ", "MA", "PG", "HD", "BAC",
    "NFLX", "CRM", "AMD", "INTC", "DIS",
]


async def fetch_fmp_quote(api_key: str, ticker: str) -> StockQuote:
    sym = ticker.strip().upper()
    url = f"{FMP_STABLE}/quote"
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.get(url, params={"symbol": sym, "apikey": api_key})
        r.raise_for_status()
        data_list: list[dict[str, Any]] = r.json()

    if not data_list:
        raise ValueError(f"No FMP quote data for {sym}")

    d = data_list[0]
    pct = _f(d.get("changesPercentage"))
    if pct is not None:
        pct = round(pct * 100, 4) if abs(pct) < 1 else round(pct, 4)

    return StockQuote(
        ticker=sym,
        provider="fmp",
        currency=None,
        current=_f(d.get("price")),
        change=_f(d.get("change")),
        percent_change=pct,
        high=_f(d.get("dayHigh")),
        low=_f(d.get("dayLow")),
        open=_f(d.get("open")),
        previous_close=_f(d.get("previousClose")),
        timestamp_ms=_ts(d.get("timestamp")),
        raw=dict(d),
    )


async def fetch_fmp_trending(api_key: str) -> list[dict[str, Any]]:
    """
    Fetch quotes for popular tickers in parallel, sort by absolute percent
    change to simulate "most active / trending" list.
    """
    async with httpx.AsyncClient(timeout=20.0) as client:
        tasks = [
            _safe_quote(client, api_key, t) for t in POPULAR_TICKERS
        ]
        results = await asyncio.gather(*tasks)

    items = [r for r in results if r is not None]
    items.sort(key=lambda x: abs(x.get("percent_change") or 0), reverse=True)
    return items


async def _safe_quote(
    client: httpx.AsyncClient,
    api_key: str,
    ticker: str,
) -> dict[str, Any] | None:
    try:
        r = await client.get(
            f"{FMP_STABLE}/quote",
            params={"symbol": ticker, "apikey": api_key},
        )
        r.raise_for_status()
        data = r.json()
        if not data:
            return None
        d = data[0]
        pct = _f(d.get("changesPercentage"))
        if pct is not None:
            pct = round(pct * 100, 4) if abs(pct) < 1 else round(pct, 4)
        return {
            "ticker": d.get("symbol", ticker),
            "name": d.get("name", ticker),
            "price": _f(d.get("price")),
            "change": _f(d.get("change")),
            "percent_change": pct,
        }
    except Exception:
        logger.debug("Failed to fetch quote for %s", ticker)
        return None


def _f(v: object) -> float | None:
    if v is None:
        return None
    try:
        return float(v)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


def _ts(v: object) -> int | None:
    if v is None:
        return None
    try:
        val = int(float(v))  # type: ignore[arg-type]
        return val * 1000 if val < 10_000_000_000 else val
    except (TypeError, ValueError):
        return None
