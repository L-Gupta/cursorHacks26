"""
Market data via Yahoo Finance (no API key required) with FMP fallback.

Yahoo's public chart endpoint provides real-time quotes without authentication.
FMP stable API is used as fallback for company profiles and search.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

import httpx

from backend.app.models.schemas import StockQuote

logger = logging.getLogger(__name__)

YF_CHART = "https://query1.finance.yahoo.com/v8/finance/chart"
_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

POPULAR_TICKERS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA",
    "META", "TSLA", "JPM", "V", "WMT",
    "JNJ", "MA", "PG", "HD", "BAC",
    "NFLX", "CRM", "AMD", "INTC", "DIS",
]

_cache: dict[str, tuple[Any, float]] = {}
QUOTE_TTL = 120
TRENDING_TTL = 300


def _cached(key: str, ttl: float) -> Any | None:
    entry = _cache.get(key)
    if entry and (time.time() - entry[1]) < ttl:
        return entry[0]
    return None


def _set_cache(key: str, data: Any) -> None:
    _cache[key] = (data, time.time())


async def fetch_yf_quote(symbol: str) -> dict[str, Any] | None:
    """Fetch quote data from Yahoo Finance chart endpoint."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(
                f"{YF_CHART}/{symbol}",
                params={"interval": "1d", "range": "1d"},
                headers={"User-Agent": _UA},
            )
            r.raise_for_status()
            data = r.json()

        result = data.get("chart", {}).get("result")
        if not result:
            return None

        meta = result[0].get("meta", {})
        price = meta.get("regularMarketPrice")
        prev_close = meta.get("chartPreviousClose") or meta.get("previousClose")
        change = None
        pct = None
        if price is not None and prev_close:
            change = round(price - prev_close, 4)
            pct = round((change / prev_close) * 100, 4) if prev_close else None

        return {
            "symbol": meta.get("symbol", symbol),
            "name": meta.get("shortName") or meta.get("longName") or symbol,
            "price": price,
            "change": change,
            "percent_change": pct,
            "high": meta.get("regularMarketDayHigh"),
            "low": meta.get("regularMarketDayLow"),
            "open": meta.get("regularMarketOpen") or meta.get("open"),
            "previous_close": prev_close,
            "volume": meta.get("regularMarketVolume"),
            "timestamp": meta.get("regularMarketTime"),
        }
    except Exception as e:
        logger.debug("Yahoo Finance failed for %s: %s", symbol, e)
        return None


async def fetch_stock_quote(_api_key: str, ticker: str) -> StockQuote:
    """Primary quote fetcher. Uses Yahoo Finance (no key needed)."""
    sym = ticker.strip().upper()
    cache_key = f"quote:{sym}"

    cached = _cached(cache_key, QUOTE_TTL)
    if cached is not None:
        return cached

    d = await fetch_yf_quote(sym)
    if d is None:
        stale = _cached(cache_key, QUOTE_TTL * 50)
        if stale is not None:
            return stale
        raise ValueError(f"No quote data for {sym}")

    ts = d.get("timestamp")
    ts_ms = int(ts * 1000) if isinstance(ts, (int, float)) and ts else None

    result = StockQuote(
        ticker=sym,
        provider="yahoo",
        currency="USD",
        current=_f(d.get("price")),
        change=_f(d.get("change")),
        percent_change=_f(d.get("percent_change")),
        high=_f(d.get("high")),
        low=_f(d.get("low")),
        open=_f(d.get("open")),
        previous_close=_f(d.get("previous_close")),
        timestamp_ms=ts_ms,
        raw=d,
    )
    _set_cache(cache_key, result)
    return result


async def fetch_trending(_api_key: str) -> list[dict[str, Any]]:
    """Fetch quotes for popular tickers, sorted by absolute percent change."""
    cached = _cached("trending", TRENDING_TTL)
    if cached is not None:
        return cached

    async with httpx.AsyncClient(timeout=15.0) as client:
        tasks = [_safe_yf(client, t) for t in POPULAR_TICKERS]
        results = await asyncio.gather(*tasks)

    items = [r for r in results if r is not None]

    if not items:
        stale = _cached("trending", TRENDING_TTL * 50)
        if stale:
            return stale
        return [{"ticker": t, "name": t, "price": None, "change": None, "percent_change": None} for t in POPULAR_TICKERS]

    items.sort(key=lambda x: abs(x.get("percent_change") or 0), reverse=True)

    # Warm individual quote caches from the batch
    for item in items:
        sym = item.get("ticker", "")
        raw = item.get("_raw")
        if sym and raw:
            ts = raw.get("timestamp")
            ts_ms = int(ts * 1000) if isinstance(ts, (int, float)) and ts else None
            sq = StockQuote(
                ticker=sym,
                provider="yahoo",
                currency="USD",
                current=_f(raw.get("price")),
                change=_f(raw.get("change")),
                percent_change=_f(raw.get("percent_change")),
                high=_f(raw.get("high")),
                low=_f(raw.get("low")),
                open=_f(raw.get("open")),
                previous_close=_f(raw.get("previous_close")),
                timestamp_ms=ts_ms,
                raw=raw,
            )
            _set_cache(f"quote:{sym}", sq)

    clean = [{k: v for k, v in item.items() if k != "_raw"} for item in items]
    _set_cache("trending", clean)
    return clean


async def _safe_yf(client: httpx.AsyncClient, ticker: str) -> dict[str, Any] | None:
    try:
        r = await client.get(
            f"{YF_CHART}/{ticker}",
            params={"interval": "1d", "range": "1d"},
            headers={"User-Agent": _UA},
        )
        r.raise_for_status()
        data = r.json()
        result = data.get("chart", {}).get("result")
        if not result:
            return None

        meta = result[0].get("meta", {})
        price = meta.get("regularMarketPrice")
        prev_close = meta.get("chartPreviousClose") or meta.get("previousClose")
        change = None
        pct = None
        if price is not None and prev_close:
            change = round(price - prev_close, 4)
            pct = round((change / prev_close) * 100, 4) if prev_close else None

        raw_data = {
            "price": price,
            "change": change,
            "percent_change": pct,
            "high": meta.get("regularMarketDayHigh"),
            "low": meta.get("regularMarketDayLow"),
            "open": meta.get("regularMarketOpen"),
            "previous_close": prev_close,
            "timestamp": meta.get("regularMarketTime"),
        }

        return {
            "ticker": meta.get("symbol", ticker),
            "name": meta.get("shortName") or meta.get("longName") or ticker,
            "price": price,
            "change": change,
            "percent_change": pct,
            "_raw": raw_data,
        }
    except Exception:
        logger.debug("Yahoo Finance trending failed for %s", ticker)
        return None


YF_INSIGHTS = "https://query2.finance.yahoo.com/ws/insights/v2/finance/insights"


async def fetch_analyst_insights(ticker: str) -> dict[str, Any]:
    """Analyst outlook, company metrics, and significant developments from Yahoo Finance."""
    sym = ticker.strip().upper()
    cache_key = f"insights:{sym}"

    cached = _cached(cache_key, TRENDING_TTL)
    if cached is not None:
        return cached

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(
                YF_INSIGHTS,
                params={"symbol": sym},
                headers={"User-Agent": _UA},
            )
            r.raise_for_status()
            data = r.json()

        res = data.get("finance", {}).get("result", {})
        inst = res.get("instrumentInfo", {})
        tech = inst.get("technicalEvents", {})
        kt = inst.get("keyTechnicals", {})
        snap = res.get("companySnapshot", {})
        sig_devs = res.get("sigDevs", [])
        reports = res.get("reports", [])

        short_outlook = tech.get("shortTermOutlook", {})
        mid_outlook = tech.get("intermediateTermOutlook", {})
        long_outlook = tech.get("longTermOutlook", {})

        company_scores = snap.get("company", {})

        top_reports = []
        for rpt in reports[:3]:
            top_reports.append({
                "provider": rpt.get("provider", ""),
                "title": rpt.get("headHtml", ""),
            })

        headlines = []
        for sd in sig_devs[:3]:
            headlines.append(sd.get("headline", ""))

        result = {
            "ticker": sym,
            "outlook": {
                "short": {
                    "direction": short_outlook.get("direction", "Neutral"),
                    "description": short_outlook.get("scoreDescription", ""),
                },
                "mid": {
                    "direction": mid_outlook.get("direction", "Neutral"),
                    "description": mid_outlook.get("scoreDescription", ""),
                },
                "long": {
                    "direction": long_outlook.get("direction", "Neutral"),
                    "description": long_outlook.get("scoreDescription", ""),
                },
            },
            "support": kt.get("support"),
            "resistance": kt.get("resistance"),
            "company_scores": {
                "innovativeness": company_scores.get("innovativeness"),
                "hiring": company_scores.get("hiring"),
                "earnings_reports": company_scores.get("earningsReports"),
                "dividends": company_scores.get("dividends"),
                "insider_sentiments": company_scores.get("insiderSentiments"),
                "sustainability": company_scores.get("sustainability"),
            },
            "sector": snap.get("sectorInfo", ""),
            "significant_developments": headlines,
            "analyst_reports": top_reports,
        }
        _set_cache(cache_key, result)
        return result
    except Exception:
        logger.debug("Yahoo insights failed for %s", sym)
        return {"ticker": sym, "outlook": {}, "company_scores": {}, "significant_developments": [], "analyst_reports": []}


def _f(v: object) -> float | None:
    if v is None:
        return None
    try:
        return float(v)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
