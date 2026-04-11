"""
Report routes: retrieve full session data for PDF export on the client.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from backend.app.dependencies import get_session_store_dep
from backend.app.models.schemas import SessionSnapshot
from backend.app.services.session_store import SessionStore

router = APIRouter(prefix="/report", tags=["report"])


@router.get("/{session_id}", response_model=SessionSnapshot)
async def get_report(
    session_id: str,
    sessions: Annotated[SessionStore, Depends(get_session_store_dep)],
) -> SessionSnapshot:
    snap = sessions.get_snapshot(session_id)
    if snap is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown session_id")
    return snap
