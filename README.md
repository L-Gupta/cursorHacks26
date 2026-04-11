# EarningsLens

**EarningsLens** is a full-stack application for analyzing earnings calls: live or recorded audio is transcribed with speaker diarization, executive statements are scored for deception signals via **Anthropic Claude**, and optional semantic search compares claims against **SEC filings** indexed in **ChromaDB**. A React dashboard surfaces credibility trends, contradiction highlights, and exportable reports.

> **Status.** Core API routes (`/health`, `/analyze`, `/report`, `/market/quote`) and a development UI are integrated. Ingestion of SEC documents into Chroma, Deepgram live transcription, production-grade dashboard components, and PDF export are planned or partially scaffolded—see the codebase for `TODO` / placeholder modules.

---

## Features

| Area | Description |
|------|-------------|
| **Analysis** | `POST /analyze` accepts a transcript segment and speaker context; Claude returns structured deception signals and a contradiction search query; optional Chroma retrieval for prior-document matches. |
| **Sessions** | `GET /report/{session_id}` returns aggregated session data for reporting and future PDF export. |
| **Market data** | `GET /market/quote/{ticker}` proxies **Finnhub** from the server so API keys are not exposed to the browser. |
| **Frontend** | Vite + React + TypeScript + Tailwind; development build proxies API calls under `/api`. |

---

## Architecture

- **Backend:** Python 3.11+, **FastAPI**, **Pydantic Settings**, **ChromaDB** (local persistence), **sentence-transformers** embeddings, **Anthropic** (Claude) for analysis.
- **Frontend:** **React 18**, **Vite**, **Tailwind CSS**; typed API client under `frontend/src/lib/`.
- **Configuration:** Repository-root **`.env`** is loaded automatically by [`backend/app/config.py`](backend/app/config.py) (including optional `.env.local` and `backend/.env`). Never commit secrets.

---

## Requirements

- **Python** 3.11 or newer  
- **Node.js** 18+ (for the frontend)  
- API accounts as described in [Environment variables](#environment-variables)

---

## Getting started

### 1. Clone and install dependencies

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

Interactive documentation: **http://127.0.0.1:8000/docs**

### 4. Run the web client

In a second terminal:

```bash
cd frontend
npm run dev
```

The app defaults to **http://localhost:5173**. Committed [`frontend/.env.development`](frontend/.env.development) sets `VITE_API_BASE_URL=/api`, which forwards requests through Vite’s dev proxy to the API on port `8000`. To call the API directly, set `VITE_API_BASE_URL=http://127.0.0.1:8000` in **`frontend/.env.local`** (CORS is configured for local origins).

---

## Environment variables

| Variable | Purpose | Notes |
|----------|---------|--------|
| `ANTHROPIC_API_KEY` | Claude inference for `/analyze` | [Anthropic Console](https://console.anthropic.com/) |
| `DEEPGRAM_API_KEY` | Speech-to-text (when integrated) | [Deepgram](https://deepgram.com/) |
| `FINNHUB_API_KEY` | Stock quotes via `/market/quote/{ticker}` | [Finnhub](https://finnhub.io/register) |
| `FMP_API_KEY` | Optional fundamentals (future routes) | [Financial Modeling Prep](https://site.financialmodelingprep.com/developer/docs/pricing) |
| `SEC_EDGAR_USER_AGENT` | Identification string for SEC EDGAR HTTP requests | App name and contact email per [SEC guidance](https://www.sec.gov/os/accessing-edgar-data) |
| `VITE_API_BASE_URL` | Frontend → backend base URL | Usually `/api` in dev; omit from root `.env` if only used in `frontend/.env.local` |

**Security:** Do not commit `.env`. Do not prefix secrets intended for the server with `VITE_`, as Vite exposes those values to the browser bundle.

---

## Repository layout

```
cursorHacks26/
├── backend/
│   ├── app/                 # FastAPI application (routes, services, models)
│   ├── requirements.txt
│   └── tests/
├── frontend/
│   ├── src/                 # React application
│   └── public/
├── .env.example             # Root template for backend-oriented keys
└── README.md
```

---

## Branching (for collaborators)

- **`main`** — Primary integration branch (FastAPI + `frontend/` Vite app, market proxy, environment loading).
- Feature branches should merge via pull request; keep local secrets out of version control.

---

## Troubleshooting

| Issue | Suggestion |
|--------|------------|
| `/analyze` returns 503 | Set `ANTHROPIC_API_KEY` in root `.env` and restart Uvicorn. |
| `/market/quote` returns 503 | Set `FINNHUB_API_KEY` in root `.env`. |
| Frontend cannot reach API | Ensure the API is on port `8000` and `VITE_API_BASE_URL` matches your setup (`/api` vs direct URL). |
| Chroma empty / no contradictions | Run or implement `POST /ingest/{ticker}` and populate Chroma for that ticker. |

---

## Project context

Cursor Hackathon 2026 — *EarningsLens*.
