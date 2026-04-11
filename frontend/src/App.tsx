/**
 * Root application layout for EarningsLens.
 *
 * Wires the Vite dev server to FastAPI via ``VITE_API_BASE_URL=/api`` (see
 * ``.env.development``): health check, optional market quote, and analyze segment.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  analyzeSegment,
  apiBase,
  getHealth,
  getStockQuote,
} from "./lib/api";
import type { AnalyzeResponse } from "./types/analyze";
import { DemoMode } from "./components/DemoMode/DemoMode";

export default function App() {
  const sessionId = useMemo(() => crypto.randomUUID(), []);
  const [health, setHealth] = useState<"idle" | "ok" | "err">("idle");
  const [healthMsg, setHealthMsg] = useState("");

  const [ticker, setTicker] = useState("AAPL");
  const [speaker, setSpeaker] = useState("CEO");
  const [segment, setSegment] = useState(
    "We remain very confident in our long-term trajectory and see significant opportunities ahead.",
  );
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [quoteJson, setQuoteJson] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const h = await getHealth();
        if (!cancelled) {
          setHealth(h.status === "ok" ? "ok" : "err");
          setHealthMsg(JSON.stringify(h));
        }
      } catch (e) {
        if (!cancelled) {
          setHealth("err");
          setHealthMsg(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runAnalyze = useCallback(async () => {
    setLoading(true);
    setAnalyzeError(null);
    setAnalyzeResult(null);
    try {
      const res = await analyzeSegment({
        segment,
        speaker,
        session_id: sessionId,
        ticker: ticker.trim() || undefined,
        question_context: null,
      });
      setAnalyzeResult(res);
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [segment, speaker, sessionId, ticker]);

  const runQuote = useCallback(async () => {
    setQuoteError(null);
    setQuoteJson(null);
    try {
      const q = await getStockQuote(ticker);
      setQuoteJson(JSON.stringify(q, null, 2));
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : String(e));
    }
  }, [ticker]);

  const api = apiBase();

  return (
    <div className="min-h-screen bg-el-bg p-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-el-accent">
            EarningsLens
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Frontend ↔ backend wiring (dev)
          </p>
        </div>
        <div className="font-mono text-xs text-slate-500">
          <span className="text-slate-400">API base:</span>{" "}
          <code className="text-el-accent">{api || "(same-origin)"}</code>
          <a
            className="ml-4 text-el-accent underline"
            href={`${api}/docs`}
            target="_blank"
            rel="noreferrer"
          >
            OpenAPI
          </a>
        </div>
      </header>

      <section className="mb-8 rounded-lg border border-slate-700 bg-el-surface p-4">
        <h2 className="text-sm font-medium text-slate-300">Backend</h2>
        <p className="mt-2 font-mono text-xs">
          <span
            className={
              health === "ok"
                ? "text-emerald-400"
                : health === "err"
                  ? "text-el-danger"
                  : "text-slate-500"
            }
          >
            {health === "idle" && "Checking /health…"}
            {health === "ok" && "Connected"}
            {health === "err" && "Not reachable"}
          </span>
          {healthMsg ? (
            <span className="ml-2 text-slate-500">{healthMsg}</span>
          ) : null}
        </p>
        {health === "err" ? (
          <p className="mt-2 text-xs text-slate-400">
            Start the API:{" "}
            <code className="rounded bg-slate-800 px-1 py-0.5">
              uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
            </code>{" "}
            from the repo root (or use your venv).
          </p>
        ) : null}
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-700 bg-el-surface p-4">
          <h2 className="text-sm font-medium text-slate-300">Session</h2>
          <p className="mt-2 break-all font-mono text-xs text-slate-500">
            {sessionId}
          </p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-el-surface p-4">
          <h2 className="text-sm font-medium text-slate-300">Market quote (GET /market/quote)</h2>
          <p className="mt-1 text-xs text-slate-500">
            Requires <code className="text-el-accent">FINNHUB_API_KEY</code> on the server.
          </p>
          <button
            type="button"
            className="mt-3 rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-slate-600"
            onClick={() => void runQuote()}
          >
            Fetch quote for ticker
          </button>
          {quoteError ? (
            <pre className="mt-2 whitespace-pre-wrap font-mono text-xs text-el-danger">
              {quoteError}
            </pre>
          ) : null}
          {quoteJson ? (
            <pre className="mt-2 max-h-48 overflow-auto font-mono text-xs text-slate-400">
              {quoteJson}
            </pre>
          ) : null}
        </div>
      </section>

      <section className="mb-8 rounded-lg border border-slate-700 bg-el-surface p-4">
        <h2 className="text-sm font-medium text-slate-300">Analyze segment (POST /analyze)</h2>
        <p className="mt-1 text-xs text-slate-500">
          Requires <code className="text-el-accent">ANTHROPIC_API_KEY</code> on the server.
          Optional ticker enables Chroma contradiction search after ingest.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-slate-400">
            Ticker
            <input
              className="mt-1 w-full rounded border border-slate-600 bg-el-bg px-2 py-1.5 font-mono text-sm text-slate-100"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
            />
          </label>
          <label className="block text-xs text-slate-400">
            Speaker
            <input
              className="mt-1 w-full rounded border border-slate-600 bg-el-bg px-2 py-1.5 font-mono text-sm text-slate-100"
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
            />
          </label>
        </div>
        <label className="mt-3 block text-xs text-slate-400">
          Transcript segment
          <textarea
            className="mt-1 w-full rounded border border-slate-600 bg-el-bg px-2 py-2 font-mono text-sm text-slate-100"
            rows={4}
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={loading}
          className="mt-3 rounded bg-el-accent px-4 py-2 text-sm font-medium text-el-bg transition hover:brightness-110 disabled:opacity-50"
          onClick={() => void runAnalyze()}
        >
          {loading ? "Running…" : "Run analyze"}
        </button>
        {analyzeError ? (
          <pre className="mt-3 whitespace-pre-wrap font-mono text-xs text-el-danger">
            {analyzeError}
          </pre>
        ) : null}
        {analyzeResult ? (
          <pre className="mt-3 max-h-96 overflow-auto rounded border border-slate-600 bg-el-bg p-3 font-mono text-xs text-slate-300">
            {JSON.stringify(analyzeResult, null, 2)}
          </pre>
        ) : null}
      </section>

      <DemoMode />
    </div>
  );
}
