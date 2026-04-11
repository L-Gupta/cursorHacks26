# EarningsLens

Real-time earnings call transcription, deception-signal scoring, and contradiction search against indexed SEC filings.

## Branches

- **`main`** — Integrates the teammate **`cursor/earningslens-hack-proto-8425c`** prototype with **`lakshya_dev`** (FastAPI backend, `frontend/` Vite app, market quote proxy). The duplicate **`earningslens/`** tree (which had included `node_modules`) was **removed**; development uses **`frontend/`** only.
- **`lakshya_dev`** — Reset to track **`main`** after merges; use this for day-to-day work (`git checkout lakshya_dev`).
- **`origin/copilot/add-earnings-call-deception-detector`** — Separate Copilot line; merge later if you want those dependency bumps / alternate UI.

## Repository layout

- **`backend/`** — FastAPI (`backend/app/main.py`), routes under `backend/app/api/`, services under `backend/app/services/`.
- **`frontend/`** — Vite + React + TypeScript + Tailwind.

## Quick start

From the repo root (Python path must include the repo root):

```bash
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

```bash
cd frontend && npm install && npm run dev
```

Use **`frontend/.env.local`** with `VITE_API_BASE_URL=/api` and rely on the Vite proxy to the backend, or point `VITE_API_BASE_URL` at `http://127.0.0.1:8000`.

## Environment variables

Copy **`.env.example`** to **`.env`** at the repo root (and optionally **`frontend/.env.local`**). See the table below for what you must obtain **outside the repo**.

| Variable | Required for | Where to get it |
|----------|----------------|------------------|
| `ANTHROPIC_API_KEY` | `/analyze` (Claude) | [Anthropic Console](https://console.anthropic.com/) |
| `DEEPGRAM_API_KEY` | Live transcription (when wired) | [Deepgram](https://deepgram.com/) |
| `FINNHUB_API_KEY` | `GET /market/quote/{ticker}` | [Finnhub](https://finnhub.io/register) |
| `FMP_API_KEY` | Optional future fundamentals | [Financial Modeling Prep](https://site.financialmodelingprep.com/developer/docs/pricing) |
| `SEC_EDGAR_USER_AGENT` | SEC EDGAR requests | Your app name + contact email ([SEC policy](https://www.sec.gov/os/accessing-edgar-data)) |

Never commit real keys. Do not prefix **secret** keys with `VITE_` (they would ship to the browser).
