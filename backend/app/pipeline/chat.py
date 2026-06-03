"""Grounded Q&A over an analysed contract (vector-RAG slice).

We embed the question, retrieve the most relevant clauses from the doc_clauses
vector collection (Oracle 23ai, or the in-memory fallback), and ask the model to
answer citing clause ids. If retrieval is empty (e.g. the doc wasn't indexed) we
fall back to passing all clauses as context.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from app.models.schemas import ChatCitation, ChatResponse
from app.oci import genai
from app.pipeline import embeddings
from app.pipeline.vectorstore import DOC, get_store

# How many clauses to retrieve as grounding context.
_TOP_K = 5


def _retrieve_clause_ids(analysis_id: str, question: str) -> list[str]:
    """Vector-search the doc collection; return ranked clause ids (no prefix)."""
    try:
        vec = embeddings.embed_one(question)
        matches = get_store().similar(DOC, vec, k=_TOP_K, analysis_id=analysis_id)
    except Exception:
        return []
    ids: list[str] = []
    for m in matches:
        raw = str(m.get("id", ""))
        cid = raw.split(":", 1)[1] if ":" in raw else raw
        if cid:
            ids.append(cid)
    return ids


class _ChatLLM(BaseModel):
    answer: str
    citation_clause_ids: list[str]


_PROMPT = """You are answering a small-business owner's question about THIS contract, \
using only the clauses provided. Be concise, plain-English, and practical.

{focus}Question: {question}

Clauses (id: text):
{clauses}

Return JSON: {{ "answer": "...", "citation_clause_ids": ["c2", ...] }}. Cite the clause \
id(s) your answer relies on (1-3). If the contract doesn't address it, say so plainly."""


def answer_question(result: dict[str, Any], message: str, clause_id: str | None) -> ChatResponse:
    clauses = result["clauses"]
    if not clauses:
        return ChatResponse(
            answer="I couldn't find any analysed clauses in this contract to answer from.",
            citations=[],
        )
    by_id = {c["id"]: c for c in clauses}

    # Retrieve the most relevant clauses; always include the focused clause.
    retrieved = _retrieve_clause_ids(result["id"], message)
    if clause_id and clause_id in by_id:
        retrieved = [clause_id] + [cid for cid in retrieved if cid != clause_id]
    context = [by_id[cid] for cid in retrieved if cid in by_id] or clauses

    listing = "\n".join(f"{c['id']}: {c['quote']}" for c in context)
    focus = ""
    if clause_id and clause_id in by_id:
        focus = f"The user is asking specifically about clause {clause_id}. "

    prompt = _PROMPT.format(focus=focus, question=message, clauses=listing)
    out = genai.llm_json(prompt, _ChatLLM, max_tokens=800)

    cited = [cid for cid in out.citation_clause_ids if cid in by_id] or (
        [clause_id] if clause_id and clause_id in by_id else [clauses[0]["id"]]
    )
    citations = [ChatCitation(clause_id=cid, quote=by_id[cid]["quote"]) for cid in cited]
    return ChatResponse(answer=out.answer.strip(), citations=citations)
