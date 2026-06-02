"""Grounded Q&A over an analysed contract (GenAI-only slice).

We pass the clauses (id + quote) as context and ask the model to answer and cite
clause ids. The next slice swaps this for vector retrieval over doc_clauses (23ai).
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from app.models.schemas import ChatCitation, ChatResponse
from app.oci import genai


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
    by_id = {c["id"]: c for c in clauses}

    listing = "\n".join(f"{c['id']}: {c['quote']}" for c in clauses)
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
