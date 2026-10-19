# EarningsLens backend (FastAPI) — built from the repo root so `backend.app.main` resolves.
# Sized for Render's free tier (512 MB RAM): no torch; embeddings run on onnxruntime.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MALLOC_ARENA_MAX=2 \
    OMP_NUM_THREADS=1

WORKDIR /app

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Bake the ONNX MiniLM model into the image so the first request isn't a download.
RUN python -c "from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2; ONNXMiniLM_L6_V2(preferred_providers=['CPUExecutionProvider'])(['warmup'])"

COPY backend backend

EXPOSE 8000
# Single worker: each extra process would duplicate the model in memory.
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
