import { useCallback, useEffect, useRef, useState } from "react";
import {
  getHealth,
  getStockQuote,
  searchCompanies,
  getCompanyProfile,
  getEarningsStream,
  getAISummary,
  getTrendingStocks,
  getGeneralInsight,
} from "./lib/api";
import type { TrendingStock } from "./lib/api";
import { generateMockChart } from "./lib/mockChart";
import type { StockQuote } from "./types/stock";
import type {
  CompanyProfile,
  CompanySearchResult,
  EarningsStream,
  AISummaryEntry,
  MarketChartPoint,
} from "./types/company";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function App() {
  const [backendOk, setBackendOk] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [chartData, setChartData] = useState<MarketChartPoint[]>([]);
  const [stream, setStream] = useState<EarningsStream | null>(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [summaries, setSummaries] = useState<AISummaryEntry[]>([]);
  const [captionInput, setCaptionInput] = useState("");
  const [speakerInput, setSpeakerInput] = useState("CEO");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [trending, setTrending] = useState<TrendingStock[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  useEffect(() => {
    getHealth().then((h) => setBackendOk(h.status === "ok")).catch(() => setBackendOk(false));
  }, []);

  // Load trending stocks
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTrendingLoading(true);
      try {
        const data = await getTrendingStocks();
        if (!cancelled) setTrending(data);
      } catch {
        if (!cancelled) setTrending([]);
      } finally {
        if (!cancelled) setTrendingLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Refresh trending every 60s on landing
  useEffect(() => {
    if (selectedTicker) return;
    const iv = setInterval(async () => {
      try {
        const data = await getTrendingStocks();
        setTrending(data);
      } catch { /* skip */ }
    }, 60_000);
    return () => clearInterval(iv);
  }, [selectedTicker]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await searchCompanies(query);
        setResults(r);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 350);
  }, [query]);

  // Select a company
  const selectCompany = useCallback(async (ticker: string) => {
    setSelectedTicker(ticker);
    setQuery("");
    setResults([]);
    setProfile(null);
    setQuote(null);
    setChartData([]);
    setStream(null);
    setSummaries([]);
    setInsightLoading(false);

    let fetchedProfile: CompanyProfile | null = null;
    let fetchedQuote: StockQuote | null = null;

    try {
      const [p, q] = await Promise.all([
        getCompanyProfile(ticker).catch(() => null),
        getStockQuote(ticker).catch(() => null),
      ]);
      fetchedProfile = p;
      fetchedQuote = q;
      setProfile(p);
      setQuote(q);
      if (q?.current) setChartData(generateMockChart(q.current));
    } catch { /* handled per-call */ }

    setStreamLoading(true);
    try {
      const s = await getEarningsStream(ticker);
      setStream(s);
    } catch { setStream(null); }
    finally { setStreamLoading(false); }

    // Auto-generate AI general insight
    setInsightLoading(true);
    try {
      const marketCtx = fetchedQuote?.current
        ? `${ticker}: $${fetchedQuote.current.toFixed(2)} (${(fetchedQuote.percent_change ?? 0) >= 0 ? "+" : ""}${fetchedQuote.percent_change?.toFixed(2)}%)`
        : undefined;
      const insight = await getGeneralInsight({
        ticker,
        company_name: fetchedProfile?.name || "",
        market_context: marketCtx,
      });
      setSummaries([insight]);
    } catch {
      /* AI unavailable — no initial insight */
    } finally {
      setInsightLoading(false);
    }
  }, []);

  // Refresh quote every 30s
  useEffect(() => {
    if (!selectedTicker) return;
    const iv = setInterval(async () => {
      try {
        const q = await getStockQuote(selectedTicker);
        setQuote(q);
        if (q.current) {
          setChartData((prev) => {
            const next = [...prev];
            next.push({
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              price: q.current!,
              volume: Math.round(Math.random() * 1_000_000),
            });
            if (next.length > 96) next.shift();
            return next;
          });
        }
      } catch { /* skip */ }
    }, 30_000);
    return () => clearInterval(iv);
  }, [selectedTicker]);

  const runSummary = useCallback(async () => {
    if (!captionInput.trim() || !selectedTicker) return;
    setSummaryLoading(true);
    try {
      const marketCtx = quote
        ? `${quote.ticker}: $${quote.current} (${(quote.percent_change ?? 0) >= 0 ? "+" : ""}${quote.percent_change}%)`
        : undefined;
      const s = await getAISummary({
        segment: captionInput,
        speaker: speakerInput,
        ticker: selectedTicker,
        market_context: marketCtx,
      });
      setSummaries((prev) => [s, ...prev]);
      setCaptionInput("");
    } catch (e) { console.error(e); }
    finally { setSummaryLoading(false); }
  }, [captionInput, speakerInput, selectedTicker, quote]);

  // Shared search dropdown
  const searchDropdown = results.length > 0 && (
    <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-rh-border bg-rh-surface shadow-2xl">
      {results.map((r) => (
        <button
          key={r.ticker}
          type="button"
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-rh-hover"
          onClick={() => void selectCompany(r.ticker)}
        >
          <span className="font-mono text-sm font-semibold text-rh-green">{r.ticker}</span>
          <span className="truncate text-sm text-rh-muted">{r.name}</span>
        </button>
      ))}
    </div>
  );

  const sentimentColor: Record<string, string> = {
    bullish: "text-rh-green",
    bearish: "text-rh-red",
    warning: "text-yellow-400",
    neutral: "text-rh-muted",
  };
  const sentimentBorder: Record<string, string> = {
    bullish: "border-rh-green/40",
    bearish: "border-rh-red/40",
    warning: "border-yellow-400/40",
    neutral: "border-rh-border",
  };
  const sentimentBg: Record<string, string> = {
    bullish: "bg-rh-green/5",
    bearish: "bg-rh-red/5",
    warning: "bg-yellow-400/5",
    neutral: "bg-rh-surface",
  };

  // ─── LANDING PAGE ───
  if (!selectedTicker) {
    const hero = trending[0];
    const rest = trending.slice(1);

    return (
      <div className="min-h-screen bg-rh-bg font-sans text-rh-text">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-rh-border bg-rh-bg/95 px-6 py-3 backdrop-blur">
          <h1 className="text-lg font-bold text-rh-green tracking-tight">EarningsLens</h1>
          <div className="relative ml-2 w-full max-w-md">
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-rh-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="w-full rounded-full border border-rh-border bg-rh-surface py-2 pl-10 pr-4 text-sm text-rh-text placeholder-rh-subtle outline-none transition focus:border-rh-green focus:ring-1 focus:ring-rh-green/50"
              placeholder="Search stocks..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {searching && <span className="absolute right-4 top-2.5 text-xs text-rh-subtle">Searching...</span>}
            {searchDropdown}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${backendOk ? "bg-rh-green" : "bg-rh-red"}`} />
            <span className="text-xs text-rh-subtle">{backendOk ? "Connected" : "Offline"}</span>
          </div>
        </header>

        <div className="px-6 py-8">
          {/* Hero trending stock */}
          {trendingLoading ? (
            <div className="mb-8 animate-pulse rounded-2xl border border-rh-border bg-rh-surface p-8">
              <div className="h-6 w-48 rounded bg-rh-card" />
              <div className="mt-4 h-10 w-32 rounded bg-rh-card" />
            </div>
          ) : hero ? (
            <button
              type="button"
              className="mb-8 w-full rounded-2xl border border-rh-border bg-rh-surface p-8 text-left transition hover:border-rh-green/30 hover:bg-rh-hover"
              onClick={() => void selectCompany(hero.ticker)}
            >
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-rh-green">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd"/></svg>
                Trending Now
              </div>
              <div className="mt-4 flex items-baseline gap-4">
                <h2 className="text-3xl font-bold">{hero.ticker}</h2>
                <span className="text-lg text-rh-muted">{hero.name}</span>
              </div>
              <div className="mt-3 flex items-baseline gap-4">
                {hero.price !== null && (
                  <span className="text-4xl font-bold">${hero.price.toFixed(2)}</span>
                )}
                {hero.percent_change !== null && (
                  <span className={`text-lg font-semibold ${(hero.percent_change ?? 0) >= 0 ? "text-rh-green" : "text-rh-red"}`}>
                    {(hero.percent_change ?? 0) >= 0 ? "+" : ""}{hero.change?.toFixed(2)} ({(hero.percent_change ?? 0) >= 0 ? "+" : ""}{hero.percent_change.toFixed(2)}%)
                  </span>
                )}
              </div>
            </button>
          ) : null}

          {/* Trending grid */}
          <h2 className="mb-4 text-base font-semibold text-rh-text">
            {trendingLoading ? "" : "Most Active"}
          </h2>
          {trendingLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-xl border border-rh-border bg-rh-surface p-6">
                  <div className="h-5 w-16 rounded bg-rh-card" />
                  <div className="mt-2 h-4 w-24 rounded bg-rh-card" />
                  <div className="mt-4 h-7 w-24 rounded bg-rh-card" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {rest.map((s) => {
                const up = (s.percent_change ?? 0) >= 0;
                return (
                  <button
                    key={s.ticker}
                    type="button"
                    className="group rounded-xl border border-rh-border bg-rh-surface p-6 text-left transition hover:border-rh-green/30 hover:bg-rh-hover"
                    onClick={() => void selectCompany(s.ticker)}
                  >
                    <p className="font-mono text-base font-semibold text-rh-text group-hover:text-rh-green">{s.ticker}</p>
                    <p className="mt-1 truncate text-sm text-rh-subtle">{s.name}</p>
                    {s.price !== null ? (
                      <>
                        <p className="mt-4 text-2xl font-bold text-rh-text">${s.price.toFixed(2)}</p>
                        <p className={`mt-1 text-sm font-medium ${up ? "text-rh-green" : "text-rh-red"}`}>
                          {up ? "+" : ""}{s.percent_change?.toFixed(2)}%
                        </p>
                      </>
                    ) : (
                      <p className="mt-4 text-sm text-rh-subtle">Loading...</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── COMPANY DETAIL PAGE ───
  const priceUp = (quote?.percent_change ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-rh-bg font-sans text-rh-text">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-rh-border bg-rh-bg/95 px-6 py-3 backdrop-blur">
        <button
          type="button"
          className="text-sm text-rh-muted transition hover:text-rh-green"
          onClick={() => { setSelectedTicker(null); setProfile(null); setQuote(null); }}
        >
          &larr; Back
        </button>
        <h1 className="text-lg font-bold text-rh-green tracking-tight">EarningsLens</h1>
        <div className="relative ml-2 w-full max-w-xs">
          <input
            className="w-full rounded-full border border-rh-border bg-rh-surface px-4 py-1.5 text-sm text-rh-text placeholder-rh-subtle outline-none focus:border-rh-green"
            placeholder="Search stocks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {searchDropdown}
        </div>
      </header>

      <div className="grid gap-5 p-5 lg:grid-cols-3">
        {/* LEFT COLUMN */}
        <div className="space-y-5 lg:col-span-2">
          {/* Company header + quote */}
          <section className="rounded-2xl border border-rh-border bg-rh-surface p-6">
            <div className="flex flex-wrap items-start gap-4">
              {profile?.logo && (
                <img src={profile.logo} alt="" className="h-14 w-14 rounded-xl bg-white object-contain p-1.5" />
              )}
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline gap-3">
                  <h2 className="text-2xl font-bold">{profile?.name || selectedTicker}</h2>
                  <span className="font-mono text-sm text-rh-muted">{selectedTicker}</span>
                  {profile?.exchange && <span className="text-xs text-rh-subtle">{profile.exchange}</span>}
                </div>
                {profile?.industry && <p className="mt-1 text-xs text-rh-subtle">{profile.industry}</p>}
              </div>
              {quote && (
                <div className="text-right">
                  <p className="text-3xl font-bold">${quote.current?.toFixed(2) ?? "—"}</p>
                  <p className={`mt-1 text-sm font-semibold ${priceUp ? "text-rh-green" : "text-rh-red"}`}>
                    {priceUp ? "+" : ""}{quote.change?.toFixed(2)} ({priceUp ? "+" : ""}{quote.percent_change?.toFixed(2)}%)
                  </p>
                </div>
              )}
            </div>
            {quote && (
              <div className="mt-5 flex flex-wrap gap-6 text-xs text-rh-subtle">
                <span>Open <span className="text-rh-muted">${quote.open?.toFixed(2)}</span></span>
                <span>High <span className="text-rh-muted">${quote.high?.toFixed(2)}</span></span>
                <span>Low <span className="text-rh-muted">${quote.low?.toFixed(2)}</span></span>
                <span>Prev Close <span className="text-rh-muted">${quote.previous_close?.toFixed(2)}</span></span>
                {profile?.market_cap && (
                  <span>Mkt Cap <span className="text-rh-muted">${(profile.market_cap / 1_000_000_000).toFixed(1)}B</span></span>
                )}
              </div>
            )}
          </section>

          {/* Chart */}
          <section className="rounded-2xl border border-rh-border bg-rh-surface p-5">
            <h3 className="mb-3 text-sm font-medium text-rh-muted">Price</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={340}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={priceUp ? "#00C805" : "#FF5000"} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={priceUp ? "#00C805" : "#FF5000"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#6F7178" }} tickLine={false} axisLine={false} interval={11} />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#6F7178" }} tickLine={false} axisLine={false} width={55} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                  <Tooltip
                    contentStyle={{ background: "#1E1F23", border: "1px solid #2F3037", borderRadius: "12px", fontSize: "12px", color: "#fff" }}
                    labelStyle={{ color: "#9B9B9B" }}
                    formatter={(v: number) => [`$${v.toFixed(2)}`, "Price"]}
                  />
                  <Area type="monotone" dataKey="price" stroke={priceUp ? "#00C805" : "#FF5000"} fill="url(#priceGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-16 text-center text-xs text-rh-subtle">Loading chart...</p>
            )}
          </section>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">
          {/* Video — stream or YouTube fallback */}
          <section className="rounded-2xl border border-rh-border bg-rh-surface p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-rh-muted">
              {stream?.is_live && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-rh-red" />
                  <span className="text-xs font-semibold text-rh-red">LIVE</span>
                </span>
              )}
              {stream?.is_live ? "Earnings Call" : "Related Video"}
            </h3>
            {streamLoading ? (
              <div className="aspect-video animate-pulse rounded-lg bg-rh-card" />
            ) : stream?.embed_url ? (
              <div className="overflow-hidden rounded-lg">
                <div className="aspect-video">
                  <iframe
                    src={stream.embed_url}
                    className="h-full w-full"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    title={stream.title}
                  />
                </div>
                <p className="mt-2 text-[11px] text-rh-subtle truncate">{stream.title}</p>
              </div>
            ) : (
              <div className="aspect-video flex items-center justify-center rounded-lg bg-rh-card">
                <div className="text-center">
                  <svg className="mx-auto h-8 w-8 text-rh-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2 text-xs text-rh-subtle">No video found</p>
                </div>
              </div>
            )}
          </section>

          {/* AI Insights */}
          <section className="rounded-2xl border border-rh-border bg-rh-surface p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-rh-muted">
              <svg className="h-4 w-4 text-rh-green" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z"/></svg>
              AI Insights
            </h3>
            {insightLoading && summaries.length === 0 ? (
              <div className="space-y-3">
                <div className="animate-pulse rounded-lg bg-rh-card p-4">
                  <div className="h-4 w-3/4 rounded bg-rh-border" />
                  <div className="mt-3 h-3 w-full rounded bg-rh-border" />
                  <div className="mt-2 h-3 w-2/3 rounded bg-rh-border" />
                </div>
              </div>
            ) : summaries.length === 0 ? (
              <div className="rounded-lg bg-rh-card px-4 py-8 text-center">
                <p className="text-xs text-rh-subtle">No insights yet.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {summaries.map((s) => (
                  <article
                    key={s.id}
                    className={`rounded-xl border-l-4 p-4 ${sentimentBorder[s.sentiment] || "border-rh-border"} ${sentimentBg[s.sentiment] || "bg-rh-card"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-rh-text">{s.headline}</h4>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${sentimentColor[s.sentiment] || "text-rh-muted"}`}>
                        {s.sentiment}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-rh-muted">{s.body}</p>
                    {s.signals && s.signals.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {s.signals.map((tag, i) => (
                          <span key={i} className="rounded-full bg-rh-border/50 px-2 py-0.5 text-[10px] text-rh-subtle">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-[10px] text-rh-subtle">
                      Confidence: {(s.confidence * 100).toFixed(0)}% &middot; {new Date(s.timestamp).toLocaleTimeString()}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
