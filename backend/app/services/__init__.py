"""
Service layer: side-effecting and stateful operations used by API routes.

Modules are intentionally separated by concern:
- ``chroma_store``: collections per ticker, query API.
- ``embeddings``: sentence-transformers wrapper and batch encode.
- ``sec_edgar``: CIK lookup, submissions JSON, filing full-text download.
- ``chunking``: 512-token segments with 64-token overlap.
- ``claude_analyzer``: Anthropic client, tool schema, streaming optional.
- ``session_store``: in-memory or persistent session aggregates for reports.

Routes should depend on these via ``dependencies.py`` for testability.
"""
