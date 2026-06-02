"""The real analysis (GenAI-only slice).

One structured LLM call turns the contract text into an AnalysisResult-minus-id/
document; we then assign an id and synthesise document.html from the clauses so
the UI's highlight/sync still works. Oracle 23ai benchmark + RAG chat are added
in the next slice (this slice LLM-estimates the benchmark percentile).
"""

from __future__ import annotations

import html
import json
import uuid
from typing import Any, Type, TypeVar

from pydantic import BaseModel

from app.config import settings
from app.pipeline import benchmark, embeddings
from app.pipeline.vectorstore import DOC, get_store
from app.models.schemas import (
    Clause,
    Exit,
    KeyDate,
    KeyFacts,
    MissingClause,
    Money,
    Obligations,
    RedFlag,
    Scenario,
    Verdict,
)
from app.oci import genai

M = TypeVar("M", bound=BaseModel)


_PROMPT = """You are a senior commercial-contracts lawyer reviewing a contract for a \
small-business owner who is NOT a lawyer. Analyse the contract below and return a JSON \
object matching EXACTLY these fields (no extras):

- verdict: {{ risk_score (int 0-100, higher = riskier for the user), risk_level \
("high"|"medium"|"low"), summary_line (one plain-English sentence), summary_bullets \
(3-5 short strings), fairness: {{ score (float -1..1; -1 = favours the other party, \
+1 = favours the user), label (short string) }} }}
- key_facts: {{ parties, term, value, auto_renewal, notice, governing_law }} (strings; \
use null if not found)
- red_flags: array of {{ id ("f1","f2"...), clause_id (matches a clause id below), \
title, severity ("high"|"medium"|"low"), explanation, why_risky }} — only genuinely risky items
- clauses: array (max {max_clauses}) of {{ id ("c1","c2"...), category, risk_level \
("high"|"medium"|"low"), quote (VERBATIM text from the contract), plain_english, \
why_risky (or null), suggested_fix (or null), benchmark: {{ percentile (int 0-100, \
how much harsher than typical), typical (string) }} or null }}
- obligations: {{ yours: [strings], theirs: [strings] }}
- money: {{ total_value, payment_schedule, penalties: [strings], liability_cap }} (or null fields)
- dates: array of {{ label, date (ISO YYYY-MM-DD or a phrase), type }}
- exit: {{ difficulty ("easy"|"moderate"|"hard"), summary, termination_terms: [strings] }}
- missing_clauses: array of {{ name, why_matters }} — standard protections that are ABSENT
- scenarios: array of {{ question, answer }} — 2-3 "what happens if..." Q&As
- benchmark_summary: one sentence comparing this contract to typical market terms

Rules: risk levels and exit difficulty are lowercase. `quote` must be copied verbatim \
from the contract. Keep plain-English text jargon-free. If a section genuinely doesn't \
apply, use null or an empty array.

CONTRACT:
\"\"\"
{contract}
\"\"\"
"""


def _build_html(clauses: list[dict[str, Any]]) -> str:
    blocks: list[str] = ["<h3>Contract</h3>"]
    for c in clauses:
        heading = html.escape(c.get("category") or "")
        quote = html.escape(c.get("quote") or "")
        blocks.append(
            f'<h4>{heading}</h4><p><span data-clause="{c["id"]}">{quote}</span></p>'
        )
    return "\n".join(blocks)


def _index_doc_clauses(analysis_id: str, clauses: list[dict[str, Any]]) -> None:
    """Embed the analysed clauses into the doc collection for chat RAG."""
    if not clauses:
        return
    vectors = embeddings.embed([c.get("quote") or "" for c in clauses])
    records = [
        {
            "id": f"{analysis_id}:{c['id']}",
            "text": c.get("quote") or "",
            "category": c.get("category"),
            "analysis_id": analysis_id,
            "typical": None,
            "harshness": None,
            "embedding": v,
        }
        for c, v in zip(clauses, vectors)
    ]
    get_store().add(DOC, records)


def _model_or_none(model: Type[M], data: Any) -> M | None:
    """Validate a single optional panel; drop it (None) if the LLM drifted."""
    if not isinstance(data, dict):
        return None
    try:
        return model.model_validate(data)
    except Exception:
        return None


def _valid_items(model: Type[M], data: Any) -> list[M]:
    """Validate a list panel item-by-item, silently dropping malformed entries."""
    if not isinstance(data, list):
        return []
    out: list[M] = []
    for item in data:
        try:
            out.append(model.model_validate(item))
        except Exception:
            continue
    return out


def _parse_analysis_json(prompt: str) -> dict[str, Any]:
    """Get the model's JSON object, retrying once if it isn't parseable."""
    instruction = f"{prompt}\n\nRespond with ONLY valid JSON, no markdown fences, no commentary."
    last_err: Exception | None = None
    for _ in range(2):
        raw = genai.chat(instruction, max_tokens=3000)
        try:
            data = json.loads(genai._strip_fence(raw))
            if isinstance(data, dict):
                return data
            last_err = ValueError("top-level JSON was not an object")
        except json.JSONDecodeError as exc:
            last_err = exc
        instruction = (
            f"{prompt}\n\nYour previous reply was not a single valid JSON object. "
            f"Return ONLY one JSON object matching the requested fields."
        )
    raise RuntimeError(f"LLM did not return valid JSON after retry: {last_err}")


def _assemble(data: dict[str, Any]) -> dict[str, Any]:
    """Build an AnalysisResult dict: Layer-1 strict, depth panels best-effort.

    Layer-1 (verdict, key_facts, clauses, red_flags) is guaranteed by the contract,
    so it validates strictly. Depth panels are resilient: a malformed item or panel
    is dropped rather than failing the whole analysis (the UI tolerates null/[]).
    """
    result: dict[str, Any] = {
        "verdict": Verdict.model_validate(data["verdict"]).model_dump(),
        "key_facts": KeyFacts.model_validate(data.get("key_facts") or {}).model_dump(),
        "clauses": [c.model_dump() for c in _valid_items(Clause, data.get("clauses"))],
        "red_flags": [f.model_dump() for f in _valid_items(RedFlag, data.get("red_flags"))],
        "benchmark_summary": data.get("benchmark_summary")
        if isinstance(data.get("benchmark_summary"), str)
        else None,
    }

    obligations = _model_or_none(Obligations, data.get("obligations"))
    money = _model_or_none(Money, data.get("money"))
    exit_ = _model_or_none(Exit, data.get("exit"))
    result["obligations"] = obligations.model_dump() if obligations else None
    result["money"] = money.model_dump() if money else None
    result["exit"] = exit_.model_dump() if exit_ else None
    result["dates"] = [d.model_dump() for d in _valid_items(KeyDate, data.get("dates"))] or None
    result["missing_clauses"] = (
        [m.model_dump() for m in _valid_items(MissingClause, data.get("missing_clauses"))] or None
    )
    result["scenarios"] = (
        [s.model_dump() for s in _valid_items(Scenario, data.get("scenarios"))] or None
    )
    return result


def run_analysis(contract_text: str) -> dict[str, Any]:
    prompt = _PROMPT.format(contract=contract_text.strip(), max_clauses=settings.max_clauses)
    data = _parse_analysis_json(prompt)

    result = _assemble(data)
    result["id"] = str(uuid.uuid4())
    result["document"] = {"html": _build_html(result["clauses"])}

    # Grounded benchmarks (vector search vs the market corpus) + index for chat RAG.
    try:
        benchmark.apply_benchmarks(result["clauses"])
        _index_doc_clauses(result["id"], result["clauses"])
    except Exception:
        # Vector store is best-effort; never fail the whole analysis over it.
        pass

    return result
