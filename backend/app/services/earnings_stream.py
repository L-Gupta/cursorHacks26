"""
Find earnings call livestreams or relevant YouTube videos for a ticker.

Strategy:
1. Search YouTube for live earnings calls.
2. If none found, search for the most relevant recent video about the company
   (earnings recap, investor day, news coverage, etc.).
"""

from __future__ import annotations

import re
from typing import Any

import httpx

_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


async def find_earnings_stream(
    ticker: str,
    company_name: str = "",
) -> dict[str, Any] | None:
    company = ticker.strip().upper()

    live = await _search_youtube(f"{company} earnings call live", is_live_filter=True)
    if live:
        live["is_live"] = True
        return live

    label = company_name or company
    general = await _search_youtube(f"{label} stock earnings analysis 2026")
    if general:
        general["is_live"] = False
        return general

    fallback = await _search_youtube(f"{label} company investor news")
    if fallback:
        fallback["is_live"] = False
        return fallback

    return None


async def _search_youtube(
    query: str,
    is_live_filter: bool = False,
) -> dict[str, Any] | None:
    """Scrape YouTube search results page for the first video ID."""
    sp = "&sp=EgJAAQ%253D%253D" if is_live_filter else ""
    search_url = f"https://www.youtube.com/results?search_query={query.replace(' ', '+')}{sp}"

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            r = await client.get(search_url, headers={"User-Agent": _UA})
            body = r.text

        match = re.search(r'"videoId":"([a-zA-Z0-9_-]{11})"', body)
        if not match:
            return None

        video_id = match.group(1)

        title_match = re.search(
            r'"videoId":"' + re.escape(video_id) + r'".*?"title":\{"runs":\[\{"text":"(.*?)"\}',
            body,
        )
        title = title_match.group(1) if title_match else f"{query} (YouTube)"

        ticker_match = re.search(r"[A-Z]{1,5}", query)
        ticker = ticker_match.group(0) if ticker_match else ""

        return {
            "ticker": ticker,
            "title": title,
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "embed_url": f"https://www.youtube.com/embed/{video_id}?autoplay=0",
            "source": "youtube",
        }
    except Exception:
        return None
