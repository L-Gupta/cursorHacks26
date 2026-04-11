"""
Session state for a single earnings call: rolling credibility and event history.

In-memory store keyed by ``session_id``; ``GET /report/{session_id}`` reads the
same structures written by ``POST /analyze``.
"""

from __future__ import annotations

import threading
from typing import Any

from backend.app.models.schemas import AnalyzeResponse, SessionSnapshot


class SessionStore:
    """Thread-safe in-memory sessions (single-worker friendly)."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._sessions: dict[str, dict[str, Any]] = {}

    def _ensure(self, session_id: str) -> dict[str, Any]:
        with self._lock:
            if session_id not in self._sessions:
                self._sessions[session_id] = {
                    "ticker": None,
                    "events": [],
                    "credibility_by_speaker": {},
                }
            return self._sessions[session_id]

    def get_credibility_map(self, session_id: str) -> dict[str, int]:
        """Current rolling credibility per speaker (defaults to empty → 100 on first delta)."""
        s = self._ensure(session_id)
        with self._lock:
            return dict(s.get("credibility_by_speaker") or {})

    def record_analyze(self, payload: AnalyzeResponse) -> None:
        """Append event and merge rolling credibility."""
        s = self._ensure(payload.session_id)
        with self._lock:
            if payload.ticker:
                s["ticker"] = payload.ticker
            s["events"].append(payload.model_dump())
            s["credibility_by_speaker"] = dict(payload.credibility_by_speaker)

    def get_snapshot(self, session_id: str) -> SessionSnapshot | None:
        with self._lock:
            raw = self._sessions.get(session_id)
            if not raw:
                return None
            events = [AnalyzeResponse.model_validate(e) for e in raw["events"]]
            return SessionSnapshot(
                session_id=session_id,
                ticker=raw.get("ticker"),
                analyze_events=events,
                credibility_by_speaker=dict(raw.get("credibility_by_speaker") or {}),
            )


_store_singleton: SessionStore | None = None


def get_session_store() -> SessionStore:
    global _store_singleton
    if _store_singleton is None:
        _store_singleton = SessionStore()
    return _store_singleton


def _clamp_credibility(value: int) -> int:
    return max(0, min(100, value))


def apply_credibility_delta(
    prior: dict[str, int],
    speaker: str,
    delta: int,
) -> dict[str, int]:
    """Return updated map with speaker credibility adjusted by delta."""
    out = dict(prior)
    current = out.get(speaker, 100)
    out[speaker] = _clamp_credibility(current + delta)
    return out
