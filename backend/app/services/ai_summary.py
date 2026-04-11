"""
AI summary and general insight generation via Claude.
Two modes:
1. Transcript analysis — analyze a specific earnings call segment.
2. General insight — provide investor commentary when no livestream is active.
"""

from __future__ import annotations

import logging
from typing import Any

from anthropic import AsyncAnthropic

from backend.app.config import Settings

logger = logging.getLogger(__name__)

SUMMARY_TOOL_NAME = "submit_investor_summary"

SUMMARY_TOOL = {
    "name": SUMMARY_TOOL_NAME,
    "description": "Submit a structured investor summary.",
    "input_schema": {
        "type": "object",
        "properties": {
            "headline": {
                "type": "string",
                "description": "One-line takeaway (max 120 chars).",
            },
            "body": {
                "type": "string",
                "description": "2-4 sentence analysis for an investor.",
            },
            "sentiment": {
                "type": "string",
                "enum": ["bullish", "bearish", "neutral", "warning"],
            },
            "confidence": {
                "type": "number",
                "description": "Confidence 0.0-1.0.",
            },
            "key_signals": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Short tags: hedging, strong_guidance, missed_target, etc.",
            },
        },
        "required": ["headline", "body", "sentiment", "confidence", "key_signals"],
    },
}

TRANSCRIPT_SYSTEM = """You are EarningsLens, an AI co-pilot for investors watching live earnings calls.

For each message you MUST call submit_investor_summary exactly once.

Your job:
- Analyze the latest transcript segment from an earnings call.
- Compare claims to any provided prior statements or SEC filing context.
- Consider the current market data if provided.
- Produce a concise, actionable investor summary.

Guidelines:
- Be direct: "CEO claims 20% growth but 10-K shows 8% last year" not "there may be discrepancies".
- sentiment: bullish if genuinely positive news, bearish if red flags, warning if deception signals, neutral otherwise.
- key_signals: short tags like "revenue_beat", "guidance_raised", "hedging", "missed_target", "vague_numbers".
- Keep body under 4 sentences. Investors are reading in real time."""

GENERAL_SYSTEM = """You are EarningsLens, an AI co-pilot that provides quick investor snapshots.

For each message you MUST call submit_investor_summary exactly once.

Your job:
- Given a company ticker and optional market data, provide a brief investor-oriented outlook.
- Cover: recent performance trends, what Wall Street analysts generally think, any notable news or catalysts, and overall sentiment.
- Be specific with numbers where possible (approximate is fine).
- Write as if briefing an investor who just opened the company page and wants a 10-second summary.

Guidelines:
- Keep body under 4 sentences.
- Use the most recent knowledge you have about this company.
- sentiment: bullish/bearish/neutral/warning based on your overall assessment.
- key_signals: relevant tags like "earnings_beat", "ai_momentum", "valuation_concern", "dividend_stable", "growth_slowing"."""


async def generate_summary(
    settings: Settings,
    *,
    segment: str,
    speaker: str,
    ticker: str,
    market_context: str | None = None,
    prior_statements: str | None = None,
) -> dict[str, Any]:
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    parts: list[str] = [f"Ticker: {ticker}", f"Speaker: {speaker}"]
    if market_context:
        parts.append(f"Current market data: {market_context}")
    if prior_statements:
        parts.append(f"Prior statements / SEC filings:\n{prior_statements}")
    parts.append(f"Latest transcript segment:\n{segment}")

    return await _call_claude(client, settings.claude_model, TRANSCRIPT_SYSTEM, "\n\n".join(parts))


async def generate_general_insight(
    settings: Settings,
    *,
    ticker: str,
    company_name: str = "",
    market_context: str | None = None,
) -> dict[str, Any]:
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    label = company_name or ticker
    parts: list[str] = [f"Company: {label} ({ticker})"]
    if market_context:
        parts.append(f"Current market data: {market_context}")
    parts.append("Provide a quick investor snapshot for this company right now.")

    return await _call_claude(client, settings.claude_model, GENERAL_SYSTEM, "\n\n".join(parts))


async def _call_claude(
    client: AsyncAnthropic,
    model: str,
    system: str,
    user_msg: str,
) -> dict[str, Any]:
    response = await client.messages.create(
        model=model,
        max_tokens=1024,
        system=system,
        tools=[SUMMARY_TOOL],
        tool_choice={"type": "tool", "name": SUMMARY_TOOL_NAME},
        messages=[{"role": "user", "content": user_msg}],
    )

    for block in response.content:
        if getattr(block, "type", None) == "tool_use" and getattr(block, "name", None) == SUMMARY_TOOL_NAME:
            raw = getattr(block, "input", {})
            if isinstance(raw, dict):
                return {
                    "headline": str(raw.get("headline", "")),
                    "body": str(raw.get("body", "")),
                    "sentiment": str(raw.get("sentiment", "neutral")),
                    "confidence": float(raw.get("confidence", 0.5)),
                    "signals": list(raw.get("key_signals", [])),
                }

    return {
        "headline": "Analysis unavailable",
        "body": "Could not generate insight for this company.",
        "sentiment": "neutral",
        "confidence": 0.0,
        "signals": [],
    }
