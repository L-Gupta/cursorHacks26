import anthropic
import chromadb
from sentence_transformers import SentenceTransformer
from models import AnalyzeRequest, AnalyzeResponse, ContradictionMatch
from ingestion import get_embedding_model
import os
import random

tools = [{
    "name": "analyze_deception",
    "description": "Analyze an earnings call statement for deception signals and contradictions with prior SEC filings",
    "input_schema": {
        "type": "object",
        "properties": {
            "score_delta": {
                "type": "integer",
                "description": "Score change from -30 to +5. Negative means deceptive/concerning, positive means transparent/clear."
            },
            "signals": {
                "type": "array",
                "items": {"type": "string"},
                "description": "List of deception signal types detected. Examples: hedging_language, vague_metrics, past_contradiction, deflection, overpromising, inconsistent_tone, selective_disclosure"
            },
            "contradiction": {
                "type": "object",
                "properties": {
                    "current_quote": {"type": "string"},
                    "prior_quote": {"type": "string"},
                    "source": {"type": "string"},
                    "similarity_score": {"type": "number"}
                },
                "required": ["current_quote", "prior_quote", "source", "similarity_score"]
            },
            "confidence": {
                "type": "number",
                "description": "Confidence level 0.0-1.0 in the analysis"
            }
        },
        "required": ["score_delta", "signals", "confidence"]
    }
}]


def mock_analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    """Returns a mock analysis response when no API key is available."""
    text_lower = request.text.lower()
    signals = []
    score_delta = 0

    hedging_words = ["believe", "expect", "approximately", "around", "roughly", "should", "could", "might"]
    vague_words = ["strong", "significant", "substantial", "robust", "solid", "good progress"]
    deflection_words = ["as we've discussed", "going forward", "in the future", "at this time"]

    if any(w in text_lower for w in hedging_words):
        signals.append("hedging_language")
        score_delta -= 5
    if any(w in text_lower for w in vague_words):
        signals.append("vague_metrics")
        score_delta -= 3
    if any(w in text_lower for w in deflection_words):
        signals.append("deflection")
        score_delta -= 4
    if "guidance" in text_lower and any(w in text_lower for w in ["raise", "increase", "upgrade"]):
        signals.append("overpromising")
        score_delta -= 8
    if not signals:
        score_delta = random.randint(-2, 3)

    confidence = 0.65 + random.uniform(-0.1, 0.15)

    return AnalyzeResponse(
        speaker=request.speaker,
        score_delta=score_delta,
        signals=signals,
        contradiction=None,
        confidence=round(confidence, 2)
    )


async def analyze_segment(
    request: AnalyzeRequest,
    chroma_client: chromadb.Client,
    anthropic_client: anthropic.Anthropic
) -> AnalyzeResponse:
    api_key = os.getenv("ANTHROPIC_API_KEY", "")

    # Get relevant prior context from ChromaDB
    prior_context = []
    collection_name = f"ticker_{request.ticker.upper()}"

    try:
        collection = chroma_client.get_collection(collection_name)
        model = get_embedding_model()
        query_embedding = model.encode([request.text]).tolist()[0]

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=3,
            include=["documents", "metadatas", "distances"]
        )

        if results["documents"] and results["documents"][0]:
            for doc, meta, dist in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0]
            ):
                similarity = 1 - dist
                prior_context.append({
                    "text": doc,
                    "source": meta.get("source", "Unknown"),
                    "similarity": round(similarity, 3)
                })
    except Exception:
        pass

    if not api_key or api_key == "your_anthropic_api_key_here":
        result = mock_analyze(request)
        # Attach contradiction from ChromaDB if similarity is high enough
        if prior_context and prior_context[0]["similarity"] > 0.7:
            result.contradiction = ContradictionMatch(
                current_quote=request.text[:200],
                prior_quote=prior_context[0]["text"][:200],
                source=prior_context[0]["source"],
                similarity_score=prior_context[0]["similarity"]
            )
        return result

    # Build context string for Claude
    context_str = ""
    if prior_context:
        context_str = "\n\nRelevant prior statements from SEC filings:\n"
        for i, ctx in enumerate(prior_context, 1):
            context_str += f"{i}. [{ctx['source']}] (similarity: {ctx['similarity']}): {ctx['text'][:300]}\n"

    prompt = f"""You are analyzing an earnings call statement for potential deception or contradictions.

Speaker: {request.speaker}
Ticker: {request.ticker}
Current Statement: "{request.text}"
{context_str}

Analyze this statement for:
1. Hedging language or vague metrics
2. Contradictions with prior SEC filings
3. Deflection or topic avoidance
4. Overpromising or unrealistic claims
5. Inconsistent tone or selective disclosure

Use the analyze_deception tool to return your structured analysis."""

    try:
        response = anthropic_client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1024,
            tools=tools,
            messages=[{"role": "user", "content": prompt}]
        )

        tool_use = None
        for block in response.content:
            if block.type == "tool_use" and block.name == "analyze_deception":
                tool_use = block.input
                break

        if not tool_use:
            return mock_analyze(request)

        contradiction = None
        if "contradiction" in tool_use and tool_use["contradiction"]:
            c = tool_use["contradiction"]
            contradiction = ContradictionMatch(
                current_quote=c.get("current_quote", request.text[:200]),
                prior_quote=c.get("prior_quote", ""),
                source=c.get("source", "Unknown"),
                similarity_score=float(c.get("similarity_score", 0.0))
            )
        elif prior_context and prior_context[0]["similarity"] > 0.75:
            # Auto-attach high-similarity match even if Claude didn't flag it
            contradiction = ContradictionMatch(
                current_quote=request.text[:200],
                prior_quote=prior_context[0]["text"][:200],
                source=prior_context[0]["source"],
                similarity_score=prior_context[0]["similarity"]
            )

        return AnalyzeResponse(
            speaker=request.speaker,
            score_delta=int(tool_use.get("score_delta", 0)),
            signals=tool_use.get("signals", []),
            contradiction=contradiction,
            confidence=float(tool_use.get("confidence", 0.5))
        )

    except Exception:
        return mock_analyze(request)
