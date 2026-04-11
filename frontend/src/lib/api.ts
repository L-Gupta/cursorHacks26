/**
 * Typed HTTP helpers for FastAPI endpoints.
 *
 * Base URL from ``import.meta.env.VITE_API_BASE_URL``; in dev you can set
 * ``VITE_API_BASE_URL=/api`` and rely on Vite proxy to the backend.
 */
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  SessionSnapshot,
} from "@/types/analyze";
import type { StockQuote } from "@/types/stock";

/**
 * API prefix for FastAPI. In dev, default to ``/api`` so Vite proxies to the backend.
 * Override with ``VITE_API_BASE_URL`` (e.g. direct ``http://127.0.0.1:8000``).
 */
export function apiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (raw !== undefined && String(raw).trim() !== "") {
    return String(raw).replace(/\/$/, "");
  }
  return "/api";
}

const base = () => apiBase();

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export interface HealthResponse {
  status: string;
  service?: string;
}

/** GET /health — confirms FastAPI is reachable (via /api/health in dev). */
export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${base()}/health`);
  return json<HealthResponse>(res);
}

export async function analyzeSegment(
  body: AnalyzeRequest,
): Promise<AnalyzeResponse> {
  const res = await fetch(`${base()}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return json<AnalyzeResponse>(res);
}

export async function getSessionReport(sessionId: string): Promise<SessionSnapshot> {
  const res = await fetch(`${base()}/report/${encodeURIComponent(sessionId)}`);
  return json<SessionSnapshot>(res);
}

/** Live quote from Finnhub via the backend (never put the provider key in the browser). */
export async function getStockQuote(ticker: string): Promise<StockQuote> {
  const t = encodeURIComponent(ticker.trim().toUpperCase());
  const res = await fetch(`${base()}/market/quote/${t}`);
  return json<StockQuote>(res);
}
