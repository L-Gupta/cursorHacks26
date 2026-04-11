"""
FastAPI ASGI application factory and router mounting.

This module defines the top-level ``FastAPI`` instance, attaches CORS and
lifespan hooks (e.g. Chroma client initialization), and includes routers for:
``POST /ingest/{ticker}``, ``POST /analyze``, ``GET /report/{session_id}``.

Run locally with::
    uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

Keep route handlers thin: they validate input, call services, and return
Pydantic models. Heavy work belongs in ``services`` modules.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api import routes_analyze, routes_company, routes_health, routes_ingest, routes_market, routes_report

app = FastAPI(
    title="EarningsLens API",
    description="Real-time earnings call analysis: ingest SEC filings, analyze transcript segments.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_health.router)
app.include_router(routes_ingest.router)
app.include_router(routes_analyze.router)
app.include_router(routes_report.router)
app.include_router(routes_market.router)
app.include_router(routes_company.router)


@app.get("/")
async def root() -> dict[str, str]:
    """Service root; redirects humans to OpenAPI docs."""
    return {"service": "earningslens", "docs": "/docs"}
