from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import chromadb
import anthropic
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

from models import AnalyzeRequest, AnalyzeResponse, SessionReport
from ingestion import ingest_ticker
from analysis import analyze_segment

app = FastAPI(title="EarningsLens API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions: dict = {}

chroma_client = chromadb.Client()
anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.post("/ingest/{ticker}")
async def ingest_endpoint(ticker: str):
    result = await ingest_ticker(ticker.upper(), chroma_client)
    return result


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_endpoint(request: AnalyzeRequest):
    if request.session_id not in sessions:
        sessions[request.session_id] = {"transcript": [], "scores": {}}

    result = await analyze_segment(request, chroma_client, anthropic_client)

    sessions[request.session_id]["transcript"].append({
        "timestamp": datetime.utcnow().isoformat(),
        "speaker": request.speaker,
        "text": request.text,
        "score_delta": result.score_delta,
        "signals": result.signals,
    })

    if request.speaker not in sessions[request.session_id]["scores"]:
        sessions[request.session_id]["scores"][request.speaker] = 100

    sessions[request.session_id]["scores"][request.speaker] += result.score_delta
    sessions[request.session_id]["scores"][request.speaker] = max(
        0, min(100, sessions[request.session_id]["scores"][request.speaker])
    )

    return result


@app.get("/report/{session_id}")
async def report_endpoint(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return sessions[session_id]


@app.delete("/session/{session_id}")
async def delete_session(session_id: str):
    if session_id in sessions:
        del sessions[session_id]
    return {"status": "deleted"}
