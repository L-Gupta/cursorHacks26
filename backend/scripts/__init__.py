"""
Executable scripts package (not imported by the FastAPI app at runtime).

Contains one-off maintenance and demo tasks such as ``seed_demo.py`` to
pre-index a ticker and optionally download demo audio metadata. Run with
``python -m backend.scripts.seed_demo`` from the repository root with
``PYTHONPATH`` set appropriately.
"""
