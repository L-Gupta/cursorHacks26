"""
Anthropic Claude integration for structured deception analysis per segment.

Uses tool ``submit_deception_analysis`` with a JSON schema aligned to the
product contract: deception_signals[], contradiction_query, score_delta,
confidence.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from anthropic import AsyncAnthropic

from backend.app.config import Settings
from backend.app.models.schemas import AnalyzeToolResult, DeceptionSignalItem

logger = logging.getLogger(__name__)

TOOL_NAME = "submit_deception_analysis"

# JSON Schema for Claude tool (11 signal types per API spec)
DECEPTION_TOOL = {
    "name": TOOL_NAME,
    "description": (
        "Submit structured deception analysis for the earnings call segment. "
        "Use exactly one tool call per segment."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "deception_signals": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "type": {
                            "type": "string",
                            "enum": [
                                "hedging",
                                "deflection",
                                "passive_voice",
                                "excessive_positivity",
                                "topic_switch",
                                "vague_quantifier",
                                "appeal_to_macro",
                                "non_answer",
                                "overclaiming",
                                "omission",
                                "inconsistent_tense",
                            ],
                        },
                        "quote": {"type": "string"},
                        "explanation": {"type": "string"},
                    },
                    "required": ["type", "quote", "explanation"],
                },
            },
            "contradiction_query": {
                "type": "string",
                "description": "Short search query to find contradicting prior filings or transcripts.",
            },
            "score_delta": {
                "type": "integer",
                "description": "Credibility adjustment (typically negative when deception risk rises).",
            },
            "confidence": {
                "type": "number",
                "description": "Model confidence in this assessment, 0.0–1.0.",
            },
        },
        "required": ["deception_signals", "contradiction_query", "score_delta", "confidence"],
    },
}


SYSTEM_PROMPT = """You are EarningsLens, a forensic linguistics assistant for earnings calls.

For each user message you MUST call the tool submit_deception_analysis exactly once.

Classify deception signals using this taxonomy (use only these type strings):
- hedging: soft commitments ("we believe", "could", "may")
- passive_voice: accountability removed ("was incurred", "mistakes were made")
- deflection: redirecting company issues to macro/industry
- excessive_positivity: dense positive spin on negative topics
- topic_switch: answer shifts away before addressing the question
- vague_quantifiers: "significant", "meaningful" without numbers
- appeal_to_macro: blaming external forces for firm-specific choices
- non_answer: response fails to address the question (use question_context if provided)
- overclaiming: superlatives without evidence
- omission: question asks X; answer discusses Y without acknowledging X
- inconsistent_tense: past problems framed in future tense to soften

contradiction_query: a concise English phrase to retrieve prior SEC filings or transcripts
that might contradict claims in this segment (company-wide financials, guidance, risk factors).

score_delta: integer change to suggested credibility (negative when risk increases; typical range -30 to 0).

confidence: your confidence 0.0–1.0 in this assessment."""


class ClaudeAnalyzer:
    """Calls Claude with forced tool use and parses ``AnalyzeToolResult``."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client: AsyncAnthropic | None = None

    def _get_client(self) -> AsyncAnthropic:
        if self._client is None:
            self._client = AsyncAnthropic(api_key=self._settings.anthropic_api_key)
        return self._client

    async def analyze_segment(
        self,
        *,
        segment: str,
        speaker: str,
        ticker: str | None,
        question_context: str | None,
    ) -> AnalyzeToolResult:
        client = self._get_client()
        user_parts: list[str] = []
        if ticker:
            user_parts.append(f"Ticker: {ticker}")
        user_parts.append(f"Speaker label: {speaker}")
        if question_context:
            user_parts.append(f"Related analyst question (if any): {question_context}")
        user_parts.append(f"Transcript segment to analyze:\n{segment.strip()}")
        user_text = "\n\n".join(user_parts)

        response = await client.messages.create(
            model=self._settings.claude_model,
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            tools=[DECEPTION_TOOL],
            tool_choice={"type": "tool", "name": TOOL_NAME},
            messages=[{"role": "user", "content": user_text}],
        )

        tool_input = _extract_tool_input(response.content)
        if tool_input is None:
            logger.warning("No tool_use in Claude response: %s", response)
            return AnalyzeToolResult(
                deception_signals=[],
                contradiction_query="",
                score_delta=0,
                confidence=0.0,
            )
        return _parse_tool_result(tool_input)


def _extract_tool_input(content: list[Any]) -> dict[str, Any] | None:
    for block in content:
        if isinstance(block, dict):
            if block.get("type") == "tool_use" and block.get("name") == TOOL_NAME:
                raw = block.get("input")
                if isinstance(raw, dict):
                    return raw
                if isinstance(raw, str):
                    try:
                        return json.loads(raw)
                    except json.JSONDecodeError:
                        return None
            continue
        btype = getattr(block, "type", None)
        if btype == "tool_use" and getattr(block, "name", None) == TOOL_NAME:
            raw = getattr(block, "input", None)
            if isinstance(raw, dict):
                return raw
            if isinstance(raw, str):
                try:
                    return json.loads(raw)
                except json.JSONDecodeError:
                    return None
    return None


def _parse_tool_result(data: dict[str, Any]) -> AnalyzeToolResult:
    signals_raw = data.get("deception_signals") or []
    signals: list[DeceptionSignalItem] = []
    for item in signals_raw:
        if not isinstance(item, dict):
            continue
        try:
            signals.append(
                DeceptionSignalItem(
                    type=str(item.get("type", "hedging")),
                    quote=str(item.get("quote", "")),
                    explanation=str(item.get("explanation", "")),
                )
            )
        except Exception:
            continue
    cq = str(data.get("contradiction_query") or "")
    try:
        sd = int(data.get("score_delta", 0))
    except (TypeError, ValueError):
        sd = 0
    try:
        conf = float(data.get("confidence", 0.0))
    except (TypeError, ValueError):
        conf = 0.0
    conf = max(0.0, min(1.0, conf))
    return AnalyzeToolResult(
        deception_signals=signals,
        contradiction_query=cq,
        score_delta=sd,
        confidence=conf,
    )


_analyzer_singleton: ClaudeAnalyzer | None = None


def get_claude_analyzer(settings: Settings) -> ClaudeAnalyzer:
    global _analyzer_singleton
    if _analyzer_singleton is None:
        _analyzer_singleton = ClaudeAnalyzer(settings)
    return _analyzer_singleton
