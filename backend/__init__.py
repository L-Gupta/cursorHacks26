"""
EarningsLens backend package root.

This module exists so the ``backend`` directory is treated as a Python package
when running tools (pytest, mypy, imports like ``backend.app``). Application
code lives under ``backend.app``; scripts and tests sit alongside as siblings.

Keep this file free of side effects: it should not configure logging or load
settings at import time.
"""
