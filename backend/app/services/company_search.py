"""
Company search and profile via Yahoo Finance (no API key) with FMP fallback.

- Yahoo /v1/finance/search — ticker/name search
- FMP stable/profile — detailed company profile (when not rate-limited)
- Yahoo chart meta — fallback for basic profile info
"""

from __future__ import annotations

from typing import Any

import httpx

FMP_STABLE = "https://financialmodelingprep.com/stable"
YF_SEARCH = "https://query2.finance.yahoo.com/v1/finance/search"
YF_CHART = "https://query1.finance.yahoo.com/v8/finance/chart"
_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


async def search_companies(_api_key: str, query: str, limit: int = 10) -> list[dict[str, Any]]:
    """Search via Yahoo Finance (no key required)."""
    params = {"q": query.strip(), "quotesCount": limit, "newsCount": 0}
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(YF_SEARCH, params=params, headers={"User-Agent": _UA})
        r.raise_for_status()
        data = r.json()

    out: list[dict[str, Any]] = []
    for item in data.get("quotes", []):
        sym = item.get("symbol", "")
        if not sym or item.get("quoteType") not in ("EQUITY", "ETF"):
            continue
        out.append({
            "ticker": sym,
            "name": item.get("shortname") or item.get("longname") or sym,
            "type": item.get("exchDisp"),
        })
        if len(out) >= limit:
            break
    return out


async def get_company_profile(api_key: str, ticker: str) -> dict[str, Any] | None:
    """Try FMP first, fall back to Yahoo chart meta for basic info."""
    sym = ticker.strip().upper()

    # Try FMP (may be rate-limited)
    if api_key.strip():
        try:
            result = await _fmp_profile(api_key, sym)
            if result:
                return result
        except Exception:
            pass

    # Fallback: Yahoo chart meta
    return await _yf_profile(sym)


async def _fmp_profile(api_key: str, sym: str) -> dict[str, Any] | None:
    url = f"{FMP_STABLE}/profile"
    params = {"symbol": sym, "apikey": api_key}
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        data = r.json()

    if isinstance(data, dict) and "Error Message" in data:
        return None
    if not data:
        return None

    d = data[0] if isinstance(data, list) else data
    if not d.get("symbol"):
        return None

    return {
        "ticker": d.get("symbol", sym),
        "name": d.get("companyName", ""),
        "logo": d.get("image"),
        "industry": d.get("industry"),
        "market_cap": d.get("marketCap") or d.get("mktCap"),
        "exchange": d.get("exchangeShortName"),
        "ipo_date": d.get("ipoDate"),
        "weburl": d.get("website"),
    }


async def _yf_profile(sym: str) -> dict[str, Any] | None:
    """Basic profile from Yahoo Finance chart metadata."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(
                f"{YF_CHART}/{sym}",
                params={"interval": "1d", "range": "1d"},
                headers={"User-Agent": _UA},
            )
            r.raise_for_status()
            data = r.json()

        result = data.get("chart", {}).get("result")
        if not result:
            return None

        meta = result[0].get("meta", {})
        return {
            "ticker": meta.get("symbol", sym),
            "name": meta.get("longName") or meta.get("shortName") or sym,
            "logo": None,
            "industry": None,
            "market_cap": None,
            "exchange": meta.get("exchangeName"),
            "ipo_date": None,
            "weburl": None,
        }
    except Exception:
        return None
