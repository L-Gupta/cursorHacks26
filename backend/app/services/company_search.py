"""
Company search and profile via FMP stable API.

- search-name: full-text company name search
- profile: detailed company profile with financials
"""

from __future__ import annotations

from typing import Any

import httpx

FMP_STABLE = "https://financialmodelingprep.com/stable"


async def search_companies(api_key: str, query: str, limit: int = 10) -> list[dict[str, Any]]:
    url = f"{FMP_STABLE}/search-name"
    params = {"query": query.strip(), "apikey": api_key}
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        data = r.json()

    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for item in data:
        sym = item.get("symbol", "")
        if not sym or sym in seen:
            continue
        # Prefer US-listed exchanges
        exchange = item.get("exchange", "") or item.get("exchangeFullName", "")
        seen.add(sym)
        out.append({
            "ticker": sym,
            "name": item.get("name", sym),
            "type": exchange,
        })
        if len(out) >= limit:
            break
    return out


async def get_company_profile(api_key: str, ticker: str) -> dict[str, Any] | None:
    sym = ticker.strip().upper()
    url = f"{FMP_STABLE}/profile"
    params = {"symbol": sym, "apikey": api_key}
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.get(url, params=params)
        r.raise_for_status()
        data = r.json()

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
