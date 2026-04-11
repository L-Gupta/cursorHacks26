"""
SEC EDGAR HTTP client: submissions, CIK resolution, and full-text filing fetch.

Uses ``https://data.sec.gov/submissions/CIK##########.json`` (zero-padded CIK)
to enumerate recent 10-K and 10-Q filings, then retrieves plain text or HTML
and strips to analyzable content. Sets ``User-Agent`` per SEC fair access policy.

Earnings transcripts may be supplemented from Motley Fool / Seeking Alpha HTML
or user-uploaded TXT; those paths are orchestrated by the ingest route, not
necessarily this module alone.
"""

# Implementation placeholder — httpx async client with rate limiting.
