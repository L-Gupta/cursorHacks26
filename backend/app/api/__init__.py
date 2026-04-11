"""
HTTP API layer: route modules grouped by domain.

- ``routes_ingest``: ``POST /ingest/{ticker}`` — SEC EDGAR fetch, chunk, embed.
- ``routes_analyze``: ``POST /analyze`` — Claude tool use + vector search.
- ``routes_report``: ``GET /report/{session_id}`` — session export for PDF.
- ``routes_health``: liveness/readiness for orchestration.

Each module exposes a ``router`` with the ``APIRouter`` prefix already applied
where appropriate.
"""
