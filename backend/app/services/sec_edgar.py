"""
SEC EDGAR HTTP client: submissions, CIK resolution, and full-text filing fetch.

Uses ``https://data.sec.gov/submissions/CIK##########.json`` (zero-padded CIK)
to enumerate recent 10-K and 10-Q filings, then retrieves plain text or HTML
and strips to analyzable content. Sets ``User-Agent`` per SEC fair access policy.
"""

from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass

import httpx
from bs4 import BeautifulSoup

_TICKER_CIK_URL = "https://www.sec.gov/files/company_tickers.json"
_SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik}.json"
_ARCHIVES_BASE = "https://www.sec.gov/Archives/edgar/data"

_SEC_RATE_LIMIT = 0.12  # 10 requests/sec max; we stay under


@dataclass
class Filing:
    """Parsed SEC filing ready for chunking."""

    accession: str
    form_type: str
    filing_date: str
    document_url: str
    text: str


async def _get(client: httpx.AsyncClient, url: str) -> httpx.Response:
    resp = await client.get(url)
    resp.raise_for_status()
    await asyncio.sleep(_SEC_RATE_LIMIT)
    return resp


async def resolve_cik(ticker: str, user_agent: str) -> str:
    """Map an equity ticker to a zero-padded 10-digit CIK string."""
    async with httpx.AsyncClient(
        headers={"User-Agent": user_agent},
        timeout=20.0,
        follow_redirects=True,
    ) as client:
        resp = await _get(client, _TICKER_CIK_URL)
        data = resp.json()

    upper = ticker.strip().upper()
    for entry in data.values():
        if entry.get("ticker", "").upper() == upper:
            return str(entry["cik_str"]).zfill(10)

    raise ValueError(f"Ticker '{ticker}' not found in SEC company_tickers.json")


def _strip_html(html: str) -> str:
    """Extract visible text from an SEC filing HTML document."""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "meta", "link", "head"]):
        tag.decompose()
    text = soup.get_text(separator="\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


async def fetch_recent_filings(
    ticker: str,
    user_agent: str,
    form_types: tuple[str, ...] = ("10-K", "10-Q"),
    max_filings: int = 3,
) -> list[Filing]:
    """Pull the most recent 10-K and 10-Q filing texts from EDGAR."""
    cik = await resolve_cik(ticker, user_agent)

    async with httpx.AsyncClient(
        headers={"User-Agent": user_agent},
        timeout=30.0,
        follow_redirects=True,
    ) as client:
        sub_resp = await _get(client, _SUBMISSIONS_URL.format(cik=cik))
        sub = sub_resp.json()

        recent = sub.get("filings", {}).get("recent", {})
        forms = recent.get("form", [])
        accessions = recent.get("accessionNumber", [])
        dates = recent.get("filingDate", [])
        primary_docs = recent.get("primaryDocument", [])

        filings: list[Filing] = []
        for i, form in enumerate(forms):
            if form not in form_types or len(filings) >= max_filings:
                continue
            acc = accessions[i]
            acc_slug = acc.replace("-", "")
            doc_name = primary_docs[i] if i < len(primary_docs) else ""
            if not doc_name:
                continue

            doc_url = f"{_ARCHIVES_BASE}/{cik.lstrip('0')}/{acc_slug}/{doc_name}"
            try:
                doc_resp = await _get(client, doc_url)
                raw = doc_resp.text
            except httpx.HTTPStatusError:
                continue

            text = _strip_html(raw) if "<html" in raw[:500].lower() else raw
            if len(text) < 200:
                continue

            filings.append(
                Filing(
                    accession=acc,
                    form_type=form,
                    filing_date=dates[i],
                    document_url=doc_url,
                    text=text,
                )
            )

    return filings
