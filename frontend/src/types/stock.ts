/**
 * Stock quote from ``GET /market/quote/{ticker}`` (Finnhub-backed by default).
 */
export interface StockQuote {
  ticker: string;
  provider: string;
  currency?: string | null;
  current?: number | null;
  change?: number | null;
  percent_change?: number | null;
  high?: number | null;
  low?: number | null;
  open?: number | null;
  previous_close?: number | null;
  timestamp_ms?: number | null;
  raw?: Record<string, unknown> | null;
}
