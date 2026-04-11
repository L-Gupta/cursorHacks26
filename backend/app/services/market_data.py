"""
External market data (stock quotes) via server-side HTTP clients.

**Never** call provider APIs from the browser with your API key. This module
runs in FastAPI only; the React app calls ``GET /market/quote/{ticker}``.

Supported providers (extend with new functions + routing):
- **Finnhub** — ``/api/v1/quote`` (simple, free tier for development).
- **Polygon.io** — snapshot or aggregates (add ``fetch_polygon_quote`` and
  switch on ``Settings.market_data_provider``).

See https://finnhub.io/docs/api/quote for response field meanings.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from backend.app.models.schemas import StockQuote

logger = logging.getLogger(__name__)

FINNHUB_QUOTE_URL = "https://finnhub.io/api/v1/quote"


async def fetch_finnhub_quote(api_key: str, ticker: str) -> StockQuote:
    """Map Finnhub quote JSON to :class:`StockQuote`."""
    sym = ticker.strip().upper()
    params = {"symbol": sym, "token": api_key}
    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.get(FINNHUB_QUOTE_URL, params=params)
        r.raise_for_status()
        data: dict[str, Any] = r.json()

    # Finnhub: c, d, dp, h, l, o, pc, t (t is seconds in some versions — often ms)
    ts = data.get("t")
    ts_ms: int | None = None
    if isinstance(ts, (int, float)) and ts:
        ts_ms = int(ts * 1000) if ts < 1e12 else int(ts)

    return StockQuote(
        ticker=sym,
        provider="finnhub",
        currency=None,
        current=_f(data.get("c")),
        change=_f(data.get("d")),
        percent_change=_f(data.get("dp")),
        high=_f(data.get("h")),
        low=_f(data.get("l")),
        open=_f(data.get("o")),
        previous_close=_f(data.get("pc")),
        timestamp_ms=ts_ms,
        raw={k: v for k, v in data.items() if k in data},
    )


def _f(v: object) -> float | None:
    if v is None:
        return None
    try:
        x = float(v)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    return x
