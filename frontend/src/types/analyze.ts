/**
 * Types aligned with FastAPI ``AnalyzeRequest`` / ``AnalyzeResponse`` / ``SessionSnapshot``.
 *
 * Keep field names identical to ``backend/app/models/schemas.py`` for JSON parity.
 */

export type DeceptionSignalType =
  | "hedging"
  | "deflection"
  | "passive_voice"
  | "excessive_positivity"
  | "topic_switch"
  | "vague_quantifier"
  | "appeal_to_macro"
  | "non_answer"
  | "overclaiming"
  | "omission"
  | "inconsistent_tense";

export interface DeceptionSignalItem {
  type: DeceptionSignalType | string;
  quote: string;
  explanation: string;
}

export interface AnalyzeToolResult {
  deception_signals: DeceptionSignalItem[];
  contradiction_query: string;
  score_delta: number;
  confidence: number;
}

export interface AnalyzeRequest {
  segment: string;
  speaker: string;
  session_id: string;
  ticker?: string | null;
  question_context?: string | null;
}

export interface ContradictionMatch {
  prior_text: string;
  filing_date?: string | null;
  document_type?: string | null;
  source?: string | null;
  distance?: number | null;
}

export interface AnalyzeResponse {
  session_id: string;
  ticker?: string | null;
  tool_result: AnalyzeToolResult;
  contradiction?: ContradictionMatch | null;
  credibility_by_speaker: Record<string, number>;
}

export interface SessionSnapshot {
  session_id: string;
  ticker?: string | null;
  analyze_events: AnalyzeResponse[];
  credibility_by_speaker: Record<string, number>;
}
