"""
Seed ChromaDB and session fixtures for hackathon demo mode.

Loads a known ticker (e.g. demo company), runs ``POST /ingest`` pipeline
equivalent locally, and verifies contradiction queries return hits. Optionally
registers paths to pre-loaded MP3 assets under ``frontend/public/demo/``.

Intended to be run manually before judging; not invoked from the web server
during normal requests.
"""

def main() -> None:
    """Placeholder entrypoint for ``python -m backend.scripts.seed_demo``."""
    raise NotImplementedError("Wire to ingest + Chroma seeding.")


if __name__ == "__main__":
    main()
