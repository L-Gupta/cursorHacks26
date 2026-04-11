# EarningsLens

Real-time earnings call transcription, deception-signal scoring, and contradiction search against indexed SEC filings — hackathon scaffold.

## Repository layout

- **`backend/`** — FastAPI app under `backend/app` (`main.py`, `api/`, `services/`, `models/`), `scripts/`, `tests/`. Python packages use `__init__.py` in each folder.
- **`frontend/`** — Vite + React + TypeScript + Tailwind; UI components under `frontend/src/components/<Name>/`. TypeScript folders use `__init__.ts` as package markers with documentation.
- **`.env.example`** — root template; `backend/.env.example` and `frontend/.env.example` split process-specific variables.

## Quick start (after implementation)

- Backend: `pip install -r backend/requirements.txt` then `uvicorn backend.app.main:app --reload` from repo root (ensure Python path includes the repo root).
- Frontend: `cd frontend && npm install && npm run dev`

## Environment

Copy `.env.example` files to `.env` / `.env.local` and fill API keys (Anthropic, Deepgram, SEC User-Agent). Never commit secrets.
