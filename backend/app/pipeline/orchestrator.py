"""The real analysis (GenAI-only slice).

One structured LLM call turns the contract text into an AnalysisResult-minus-id/
document; we then assign an id and synthesise document.html from the clauses so
the UI's highlight/sync still works. Oracle 23ai benchmark + RAG chat are added
in the next slice (this slice LLM-estimates the benchmark percentile).
"""

from __future__ import annotations

import html
import uuid
from typing import Any, Optional

from pydantic import BaseModel

from app.config import settings
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


class LLMAnalysis(BaseModel):
    """Everything the model produces. `id` + `document.html` are added in code."""

    verdict: Verdict
    benchmark_summary: Optional[str] = None
    key_facts: KeyFacts
    red_flags: list[RedFlag]
    clauses: list[Clause]
    obligations: Optional[Obligations] = None
    money: Optional[Money] = None
    dates: Optional[list[KeyDate]] = None
    exit: Optional[Exit] = None
    missing_clauses: Optional[list[MissingClause]] = None
    scenarios: Optional[list[Scenario]] = None


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


def run_analysis(contract_text: str) -> dict[str, Any]:
    prompt = _PROMPT.format(contract=contract_text.strip(), max_clauses=settings.max_clauses)
    analysis = genai.llm_json(prompt, LLMAnalysis)

    result = analysis.model_dump()
    result["id"] = str(uuid.uuid4())
    result["document"] = {"html": _build_html(result["clauses"])}
    return result
