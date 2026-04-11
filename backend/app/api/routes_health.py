"""
Health and readiness endpoints for load balancers and hackathon demos.

Provides ``/health/live`` and optionally ``/health/ready`` that verify Chroma
connectivity and embedding model load. Keep responses fast and side-effect
free for orchestration probes.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health() -> dict[str, str]:
    """Simple liveness JSON for humans and uptime checks."""
    return {"status": "ok", "service": "earningslens"}


@router.get("/live")
async def live() -> dict[str, str]:
    """Process is up."""
    return {"status": "live"}
