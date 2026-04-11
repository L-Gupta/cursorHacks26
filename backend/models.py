from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    session_id: str
    speaker: str
    text: str
    ticker: str


class ContradictionMatch(BaseModel):
    current_quote: str
    prior_quote: str
    source: str
    similarity_score: float


class AnalyzeResponse(BaseModel):
    speaker: str
    score_delta: int
    signals: list[str]
    contradiction: ContradictionMatch | None = None
    confidence: float


class TranscriptEntry(BaseModel):
    timestamp: str
    speaker: str
    text: str
    score_delta: int
    signals: list[str]


class SessionReport(BaseModel):
    transcript: list[TranscriptEntry]
    scores: dict[str, int]
