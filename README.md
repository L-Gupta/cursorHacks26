# EarningsLens 🔍

**Real-Time Earnings Call Deception Detector**

EarningsLens analyzes live earnings calls for deceptive language, vague metrics, and contradictions against prior SEC filings — using Claude AI + ChromaDB vector search.

## Features

- 🎙️ **Live audio capture** via Deepgram WebSocket (with demo simulation mode)
- 🤖 **AI-powered analysis** using Claude with tool use (claude-sonnet-4-5)
- 📊 **Credibility scoring** per speaker with animated gauges
- 📈 **Credibility timeline** charts across the call
- ⚠️ **Contradiction detection** against ingested SEC filings (EDGAR)
- 📄 **PDF report export** with full transcript and flagged contradictions

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+

### 1. Clone & configure environment
```bash
cp .env.example .env
# Edit .env and add your API keys:
#   ANTHROPIC_API_KEY=...   (required for AI analysis; falls back to mock mode)
#   VITE_DEEPGRAM_API_KEY=... (optional; falls back to demo simulation)
```

### 2. Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Usage

1. Enter a stock ticker (e.g. `AAPL`) and click **Ingest SEC Filings** to index prior statements
2. Click **Start Demo** (or **Start Recording** with a Deepgram key) to begin analysis
3. Watch credibility scores update in real-time as each segment is analyzed
4. Contradictions with prior filings appear in the right panel
5. Click **Export PDF Report** to download a full analysis report

## Architecture

```
frontend/          React + Vite + Tailwind + Recharts
  src/
    App.jsx                  Main layout & state
    components/
      AudioCapture.jsx       Deepgram WS + simulation fallback
      TranscriptFeed.jsx     Live scrolling transcript
      DeceptionDashboard.jsx SVG gauge per speaker
      CredibilityTimeline.jsx Recharts line chart
      ContradictionCard.jsx  Before/after comparison cards
      ReportExport.jsx       jsPDF export

backend/           FastAPI + ChromaDB + Anthropic
  main.py          API routes
  models.py        Pydantic schemas
  ingestion.py     EDGAR SEC filing fetcher + ChromaDB indexer
  analysis.py      Claude tool-use deception analyzer
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/ingest/{ticker}` | Ingest SEC filings for ticker |
| POST | `/analyze` | Analyze a transcript segment |
| GET | `/report/{session_id}` | Get session report |
| DELETE | `/session/{session_id}` | Delete session |

## Demo Mode

No API keys required for demo mode:
- **Backend**: Falls back to rule-based mock analysis
- **Frontend**: Simulates 10 realistic earnings call segments cycling every 3.5s
