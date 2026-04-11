"""
EarningsLens FastAPI application package.

Subpackages:
- ``api``: HTTP route modules (ingest, analyze, report, health).
- ``services``: ChromaDB, embeddings, SEC EDGAR, Claude, session persistence.
- ``models``: Pydantic schemas and shared enums.

The ASGI entrypoint is ``app.main:app`` for uvicorn.
"""
