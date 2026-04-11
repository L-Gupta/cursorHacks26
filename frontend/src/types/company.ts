export interface CompanyProfile {
  ticker: string;
  name: string;
  logo?: string | null;
  industry?: string | null;
  market_cap?: number | null;
  exchange?: string | null;
  ipo_date?: string | null;
  weburl?: string | null;
}

export interface CompanySearchResult {
  ticker: string;
  name: string;
  type?: string | null;
}

export interface EarningsStream {
  ticker: string;
  title: string;
  url: string;
  embed_url?: string | null;
  is_live: boolean;
  source?: string | null;
}

export interface AISummaryEntry {
  id: string;
  timestamp: string;
  headline: string;
  body: string;
  sentiment: "bullish" | "bearish" | "neutral" | "warning";
  confidence: number;
  signals?: string[];
}

export interface MarketChartPoint {
  time: string;
  price: number;
  volume?: number;
}
