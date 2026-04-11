"""
Enumerations for speaker roles, signal types, and document sources.

Signal string values match the Claude tool schema and frontend TypeScript unions.
"""

from enum import Enum


class SpeakerRole(str, Enum):
    """High-level speaker category for dashboard coloring."""

    CEO = "CEO"
    CFO = "CFO"
    ANALYST = "Analyst"
    OTHER = "Other"


class DeceptionSignalType(str, Enum):
    """Full taxonomy implemented by the analyzer (API string values)."""

    HEDGING = "hedging"
    DEFLECTION = "deflection"
    PASSIVE_VOICE = "passive_voice"
    EXCESSIVE_POSITIVITY = "excessive_positivity"
    TOPIC_SWITCH = "topic_switch"
    VAGUE_QUANTIFIER = "vague_quantifier"
    APPEAL_TO_MACRO = "appeal_to_macro"
    NON_ANSWER = "non_answer"
    OVERCLAIMING = "overclaiming"
    OMISSION = "omission"
    INCONSISTENT_TENSE = "inconsistent_tense"
