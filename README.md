# EarningsLens

> **Real-time earnings call deception detection — built in one hackathon.**
> Every statement, scored. Every contradiction, surfaced. Backed by Claude AI, SEC filings, and live market data.

---

## What It Does

Public companies hold quarterly earnings calls. Executives choose every word carefully. EarningsLens listens with a forensic ear.

Paste a transcript segment — or feed an entire call — and EarningsLens will:

1. **Score deception risk** using 11 linguistic signal types (hedging, deflection, overclaiming, non-answers, and more), powered by Claude with structured tool use
2. **Surface contradictions** by semantically querying a ChromaDB vector store pre-loaded with indexed SEC filings (10-K, 10-Q, prior earnings transcripts)
3. **Track speaker credibility** across the full call, per speaker label, with a rolling 0–100 score updated after every segment
4. **Pull live market data** for the ticker via the backend proxy (Finnhub), so price action and deception signals are visible side-by-side
5. **Export a session report** via `GET /report/{session_id}` — full history, credibility map, and flagged contradictions in one payload

---

## Architecture

```
┌─────────────────────────────────────────────┐
│               Browser (React + TS)          │
│  • Transcript segment input                 │
│  • Live deception score + signal breakdown  │
│  • Speaker credibility timeline             │
│  • Contradiction cards                      │
│  • Market quote panel                       │
└────────────────┬────────────────────────────┘
                 │ HTTP  (Vite proxy → /api)
┌────────────────▼────────────────────────────┐
│           FastAPI  (Python 3.11+)           │
│                                             │
│  POST /analyze   ←── core pipeline          │
│  POST /ingest/{ticker}  ←── SEC indexing    │
│  GET  /market/quote/{ticker}                │
│  GET  /report/{session_id}                  │
│  GET  /health                               │
└──────┬──────────────┬────────────────┬──────┘
       │              │                │
  AsyncAnthropic  ChromaDB        Finnhub API
  (Claude tool    (vector         (market quotes)
   forced use)    store)
       │              ▲
       │         sentence-transformers
       │         (local embeddings)
       │
   SEC EDGAR (10-K / 10-Q / prior transcripts)
```

### `/analyze` Pipeline (the core)

```
segment + speaker + ticker
        │
        ▼
ClaudeAnalyzer.analyze_segment()
  → forced tool call: submit_deception_analysis
  → returns: deception_signals[], contradiction_query, score_delta, confidence
        │
        ├──► EmbeddingService.encode(contradiction_query)
        │           │
        │           ▼
        │    ChromaStore.query_similar(ticker, embedding, n=5)
        │           │
        │           ▼
        │    ContradictionMatch (best semantic hit from prior filings)
        │
        └──► SessionStore.apply_credibility_delta(speaker, score_delta)
                    │
                    ▼
             AnalyzeResponse  →  client
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Backend** | FastAPI, Python 3.11+, Uvicorn |
| **AI** | Anthropic Claude (forced tool use, structured JSON output) |
| **Vector DB** | ChromaDB with sentence-transformers embeddings |
| **Market Data** | Finnhub (proxied through backend — no API key in browser) |
| **SEC Filings** | SEC EDGAR (10-K, 10-Q ingested via `POST /ingest/{ticker}`) |
| **Validation** | Pydantic v2 (request/response schemas, settings) |

---

## Deception Signal Taxonomy

Claude classifies each segment using exactly these 11 signal types:

| Signal | What It Catches |
|---|---|
| `hedging` | Soft commitments — *"we believe," "could," "may"* |
| `deflection` | Redirecting company problems to macro / industry |
| `passive_voice` | Accountability removed — *"mistakes were made"* |
| `excessive_positivity` | Dense positive spin layered over negative facts |
| `topic_switch` | Answer drifts away before addressing the question |
| `vague_quantifier` | *"significant," "meaningful"* with no actual numbers |
| `appeal_to_macro` | Blaming external forces for firm-specific decisions |
| `non_answer` | Response doesn't address what was asked |
| `overclaiming` | Superlatives stated without supporting evidence |
| `omission` | Question asks X; answer discusses Y only |
| `inconsistent_tense` | Past problems reframed in future tense to soften impact |

Each signal comes back with a **verbatim quote** and a one-sentence **explanation** from Claude.

---

## Quick Start

### 1. Clone & configure

```bash
git clone https://github.com/L-Gupta/cursorHacks26.git
cd cursorHacks26
cp .env.example .env
# Fill in your API keys (see table below)
```

### 2. Start the backend

```bash
git clone <repository-url>
cd cursorHacks26
pip install -r backend/requirements.txt
cd frontend && npm install && cd ..
```

### 2. Configure environment

Copy the template and fill in values:

```bash
cp .env.example .env
```

Edit **`.env`** at the **repository root**. The backend resolves this path regardless of your current working directory when running Uvicorn as shown below.

### 3. Run the API

From the **repository root**:

```bash
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server (port 5173) proxies `/api/*` to `http://127.0.0.1:8000` automatically via the committed `frontend/.env.development`. No manual config needed.

Open **http://localhost:5173** — the UI checks `/health` on load and will tell you if the backend isn't running.

---

## Environment Variables

All keys live in **`.env` at the repo root**. The FastAPI settings layer resolves `.env`, `.env.local`, and `backend/.env` in order — so one file covers both frontend proxy and backend.

| Variable | Required for | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | `POST /analyze` (Claude deception scoring) | [Anthropic Console](https://console.anthropic.com/) |
| `FINNHUB_API_KEY` | `GET /market/quote/{ticker}` | [Finnhub](https://finnhub.io/register) — free tier available |
| `DEEPGRAM_API_KEY` | Live mic transcription (wiring in progress) | [Deepgram](https://deepgram.com/) |
| `FMP_API_KEY` | Earnings transcript fetch (Financial Modeling Prep) | [FMP](https://site.financialmodelingprep.com/developer/docs) |
| `SEC_EDGAR_USER_AGENT` | `POST /ingest/{ticker}` SEC EDGAR crawl | `"AppName your@email.com"` per [SEC policy](https://www.sec.gov/os/accessing-edgar-data) |

> **Never prefix secret keys with `VITE_`** — anything prefixed `VITE_` is bundled into the browser build.

---

## API Reference

Full interactive docs at **http://localhost:8000/docs** (Swagger UI) once the backend is running.

### `POST /analyze`

Scores one transcript segment, queries Chroma for contradictions, and updates session credibility.

```json
{
  "segment": "We remain very confident in our long-term trajectory...",
  "speaker": "CEO",
  "session_id": "uuid-v4",
  "ticker": "AAPL",
  "question_context": "Can you quantify the headwind from FX?"
}
```

**Response includes:**
- `tool_result.deception_signals[]` — array of `{ type, quote, explanation }`
- `tool_result.score_delta` — credibility change for this segment
- `tool_result.confidence` — Claude's confidence (0.0 – 1.0)
- `contradiction` — best semantic match from ChromaDB (prior filing / transcript)
- `credibility_by_speaker` — rolling 0–100 map for all speakers this session

### `POST /ingest/{ticker}`

Index SEC filings for a ticker into ChromaDB so future `/analyze` calls can find contradictions.

### `GET /market/quote/{ticker}`

Proxied Finnhub quote. Returns normalized `StockQuote` — price, change, % change, OHLC, timestamp.

### `GET /report/{session_id}`

Full session snapshot: all analyze events, final credibility map, flagged contradictions.

---

## Repository Layout

```
cursorHacks26/
├── backend/
│   ├── app/
│   │   ├── api/              # Route handlers (thin — validate, call service, return)
│   │   │   ├── routes_analyze.py
│   │   │   ├── routes_health.py
│   │   │   ├── routes_ingest.py
│   │   │   ├── routes_market.py
│   │   │   └── routes_report.py
│   │   ├── models/
│   │   │   ├── schemas.py    # Pydantic request/response models
│   │   │   └── enums.py
│   │   ├── services/
│   │   │   ├── claude_analyzer.py   # Anthropic forced tool use
│   │   │   ├── chroma_store.py      # Vector similarity search
│   │   │   ├── embeddings.py        # sentence-transformers
│   │   │   ├── market_data.py       # Finnhub proxy
│   │   │   ├── sec_edgar.py         # SEC EDGAR crawl
│   │   │   └── session_store.py     # In-memory credibility state
│   │   ├── config.py         # pydantic-settings (loads .env)
│   │   ├── dependencies.py   # FastAPI dependency injection
│   │   └── main.py           # App factory, CORS, router mount
│   └── requirements.txt
└── frontend/
    └── src/
        ├── components/
        │   ├── AudioCapture/         # Deepgram mic transcription
        │   ├── ContradictionCard/    # Surfaces ChromaDB hits
        │   ├── CredibilityTimeline/  # Rolling score chart
        │   ├── DeceptionDashboard/   # Signal breakdown panel
        │   ├── DemoMode/             # One-click demo flow
        │   ├── ReportExport/         # Session report download
        │   └── TranscriptFeed/       # Live transcript display
        ├── hooks/
        │   └── useDeepgram.ts        # Live mic → transcript hook
        ├── lib/
        │   └── api.ts                # Typed fetch wrappers for all routes
        └── types/
            ├── analyze.ts            # AnalyzeRequest / AnalyzeResponse types
            └── stock.ts              # StockQuote type
```

---

## How Contradiction Detection Works

When a segment is analyzed, Claude generates a `contradiction_query` — a concise natural-language search phrase targeting the specific claim being made. That query is embedded using `sentence-transformers` and searched against ChromaDB, which holds chunks of previously indexed SEC filings for that ticker.

The closest semantic match is returned as a `ContradictionMatch` with the original filing text, filing date, document type, and similarity distance. A CEO saying *"We have never had inventory issues"* might surface a 10-Q from two quarters ago disclosing *"elevated finished-goods inventory requiring promotional markdowns."*

---

## Built At

**CursorHacks 2026** — built in ~3 hours by a two-person team using Cursor AI.

Team: **Yash** · **Lakshya Gupta**
