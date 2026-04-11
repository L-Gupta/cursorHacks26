import httpx
import chromadb
from sentence_transformers import SentenceTransformer
import re
import json
import asyncio
from typing import Optional

_model: Optional[SentenceTransformer] = None


def get_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer('all-MiniLM-L6-v2')
    return _model


def chunk_text(text: str, chunk_size: int = 500) -> list[str]:
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size):
        chunk = ' '.join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
    return chunks


async def fetch_filing_text(url: str, client: httpx.AsyncClient) -> str:
    try:
        response = await client.get(url, timeout=30.0, follow_redirects=True)
        if response.status_code == 200:
            text = response.text
            # Strip HTML tags
            text = re.sub(r'<[^>]+>', ' ', text)
            text = re.sub(r'\s+', ' ', text)
            return text[:50000]  # Limit to 50K chars
    except Exception:
        pass
    return ""


async def ingest_ticker(ticker: str, chroma_client: chromadb.Client) -> dict:
    collection_name = f"ticker_{ticker.upper()}"

    # Delete existing collection if it exists
    try:
        chroma_client.delete_collection(collection_name)
    except Exception:
        pass

    collection = chroma_client.create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}
    )

    model = get_embedding_model()
    documents_indexed = 0

    async with httpx.AsyncClient(headers={"User-Agent": "EarningsLens research@example.com"}) as client:
        # Search for filings using EDGAR full-text search
        search_url = f"https://efts.sec.gov/LATEST/search-index?q=%22{ticker}%22&forms=10-K,10-Q&dateRange=custom&startdt=2021-01-01&enddt=2024-12-31"

        try:
            resp = await client.get(search_url, timeout=30.0)
            if resp.status_code != 200:
                # Fallback: use EDGAR company search API
                cik_url = f"https://www.sec.gov/cgi-bin/browse-edgar?company={ticker}&CIK=&type=10-K&dateb=&owner=include&count=5&search_text=&action=getcompany&output=atom"
                resp = await client.get(cik_url, timeout=30.0)
        except Exception:
            # If network fails, create mock data for demo
            mock_texts = [
                f"{ticker} reported strong revenue growth of 15% year-over-year in Q4 2023, driven by increased demand across all business segments.",
                f"The CEO stated during the Q3 2023 earnings call: 'We are confident in our ability to achieve double-digit growth throughout the year.'",
                f"{ticker} maintained operating margins at approximately 22%, consistent with guidance provided at the beginning of the fiscal year.",
                f"Cash flow from operations increased to $2.1 billion, providing ample liquidity for strategic investments and shareholder returns.",
                f"The CFO noted: 'Supply chain disruptions have been fully resolved and we expect no further impact on our cost structure going forward.'",
            ]

            embeddings = model.encode(mock_texts).tolist()

            collection.add(
                documents=mock_texts,
                embeddings=embeddings,
                ids=[f"mock_{i}" for i in range(len(mock_texts))],
                metadatas=[{"source": f"Mock-{ticker}-Filing", "ticker": ticker} for _ in mock_texts]
            )

            return {"status": "ok", "documents_indexed": len(mock_texts), "note": "Using mock data (network unavailable)"}

        # Try to parse filing results
        filing_texts = []

        try:
            data = resp.json()
            hits = data.get("hits", {}).get("hits", [])

            for hit in hits[:5]:  # Limit to 5 filings
                source = hit.get("_source", {})
                file_date = source.get("file_date", "")
                entity_name = source.get("entity_name", ticker)
                accession_no = hit.get("_id", "").replace("-", "")

                if accession_no:
                    # Try to get filing index
                    filing_url = f"https://www.sec.gov/Archives/edgar/data/{accession_no[:10]}/{accession_no}.txt"
                    text = await fetch_filing_text(filing_url, client)
                    if text:
                        filing_texts.append((text, f"{entity_name} {file_date}"))
        except Exception:
            pass

        if not filing_texts:
            # Try alternative EDGAR approach
            try:
                company_search = f"https://efts.sec.gov/LATEST/search-index?q=%22{ticker}%22&forms=10-K"
                resp2 = await client.get(company_search, timeout=20.0)
                if resp2.status_code == 200:
                    data = resp2.json()
                    hits = data.get("hits", {}).get("hits", [])
                    for hit in hits[:3]:
                        src = hit.get("_source", {})
                        period = src.get("period_of_report", "")
                        entity = src.get("entity_name", ticker)
                        # Add basic metadata as context
                        filing_texts.append((
                            f"{entity} 10-K filing for period {period}. Ticker: {ticker}.",
                            f"{entity} 10-K {period}"
                        ))
            except Exception:
                pass

        if not filing_texts:
            # Final fallback: use mock data
            mock_texts = [
                f"{ticker} reported strong revenue growth of 15% year-over-year, driven by increased demand.",
                f"CEO stated: 'We are confident in our ability to achieve double-digit growth throughout the year.'",
                f"{ticker} maintained operating margins at approximately 22%, consistent with initial guidance.",
                f"Cash flow from operations increased, providing liquidity for strategic investments.",
                f"CFO noted: 'Supply chain disruptions have been fully resolved with no further impact expected.'",
                f"{ticker} expects revenue of $5-6 billion for the upcoming fiscal year, representing 12-18% growth.",
                f"Operating expenses were well-controlled at 78% of revenue, demonstrating operational efficiency.",
                f"The company completed two strategic acquisitions totaling $1.2 billion during the fiscal year.",
            ]

            embeddings = model.encode(mock_texts).tolist()
            collection.add(
                documents=mock_texts,
                embeddings=embeddings,
                ids=[f"mock_{i}" for i in range(len(mock_texts))],
                metadatas=[{"source": f"{ticker}-Mock-Filing", "ticker": ticker} for _ in mock_texts]
            )
            return {"status": "ok", "documents_indexed": len(mock_texts), "note": "Using mock data"}

        # Process actual filing texts
        for text, source_label in filing_texts:
            chunks = chunk_text(text, chunk_size=400)
            if not chunks:
                continue

            embeddings = model.encode(chunks).tolist()

            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                doc_id = f"{ticker}_{source_label}_{documents_indexed + i}".replace(" ", "_")[:64]
                try:
                    collection.add(
                        documents=[chunk],
                        embeddings=[embedding],
                        ids=[doc_id],
                        metadatas=[{"source": source_label, "ticker": ticker}]
                    )
                except Exception:
                    pass

            documents_indexed += len(chunks)

    return {"status": "ok", "documents_indexed": documents_indexed}
