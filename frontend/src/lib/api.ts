import type {
  AnalyzeRequest,
  AnalyzeResponse,
  SessionSnapshot,
} from "@/types/analyze";
import type { StockQuote } from "@/types/stock";
import type {
  CompanyProfile,
  CompanySearchResult,
  EarningsStream,
  AISummaryEntry,
} from "@/types/company";

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

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${base()}/health`);
  return json<HealthResponse>(res);
}

export async function analyzeSegment(body: AnalyzeRequest): Promise<AnalyzeResponse> {
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

export async function getStockQuote(ticker: string): Promise<StockQuote> {
  const t = encodeURIComponent(ticker.trim().toUpperCase());
  const res = await fetch(`${base()}/market/quote/${t}`);
  return json<StockQuote>(res);
}

export interface TrendingStock {
  ticker: string;
  name: string;
  price: number | null;
  change: number | null;
  percent_change: number | null;
}

export async function getTrendingStocks(): Promise<TrendingStock[]> {
  const res = await fetch(`${base()}/market/trending`);
  return json<TrendingStock[]>(res);
}

export interface AnalystInsights {
  ticker: string;
  outlook: {
    short?: { direction: string; description: string };
    mid?: { direction: string; description: string };
    long?: { direction: string; description: string };
  };
  support?: number | null;
  resistance?: number | null;
  company_scores?: Record<string, number | null>;
  sector?: string;
  significant_developments?: string[];
  analyst_reports?: { provider: string; title: string }[];
}

export async function getAnalystInsights(ticker: string): Promise<AnalystInsights> {
  const t = encodeURIComponent(ticker.trim().toUpperCase());
  const res = await fetch(`${base()}/market/insights/${t}`);
  return json<AnalystInsights>(res);
}

export async function searchCompanies(query: string): Promise<CompanySearchResult[]> {
  const res = await fetch(`${base()}/company/search?q=${encodeURIComponent(query)}`);
  return json<CompanySearchResult[]>(res);
}

export async function getCompanyProfile(ticker: string): Promise<CompanyProfile> {
  const t = encodeURIComponent(ticker.trim().toUpperCase());
  const res = await fetch(`${base()}/company/profile/${t}`);
  return json<CompanyProfile>(res);
}

export async function getEarningsStream(ticker: string): Promise<EarningsStream | null> {
  const t = encodeURIComponent(ticker.trim().toUpperCase());
  const res = await fetch(`${base()}/company/stream/${t}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data || null;
}

export async function getAISummary(body: {
  segment: string;
  speaker: string;
  ticker: string;
  market_context?: string | null;
  prior_statements?: string | null;
}): Promise<AISummaryEntry> {
  const res = await fetch(`${base()}/company/summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return json<AISummaryEntry>(res);
}

export async function getGeneralInsight(body: {
  ticker: string;
  company_name?: string;
  market_context?: string | null;
}): Promise<AISummaryEntry> {
  const res = await fetch(`${base()}/company/general-insight`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return json<AISummaryEntry>(res);
}
