"""Pydantic models for the PactPilot API.

These MIRROR the frontend's src/lib/types.ts exactly — that file is the real,
working contract. Field names and shapes here must stay identical to it.
See docs/03-api-contract.md (kept in sync with this file).
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel

RiskLevel = Literal["high", "medium", "low"]


class Sample(BaseModel):
    id: str
    name: str
    description: str


class Benchmark(BaseModel):
    percentile: int
    typical: str


class Clause(BaseModel):
    id: str
    category: str
    risk_level: RiskLevel
    quote: str
    plain_english: str
    why_risky: Optional[str] = None
    suggested_fix: Optional[str] = None
    benchmark: Optional[Benchmark] = None


class RedFlag(BaseModel):
    id: str
    clause_id: str
    title: str
    severity: RiskLevel
    explanation: str
    why_risky: str


class KeyFacts(BaseModel):
    parties: Optional[str] = None
    term: Optional[str] = None
    value: Optional[str] = None
    auto_renewal: Optional[str] = None
    notice: Optional[str] = None
    governing_law: Optional[str] = None


class Fairness(BaseModel):
    score: float  # -1..1
    label: str


class Verdict(BaseModel):
    risk_score: int  # 0..100
    risk_level: RiskLevel
    summary_line: str
    summary_bullets: list[str]
    fairness: Fairness


class Obligations(BaseModel):
    yours: list[str]
    theirs: list[str]


class Money(BaseModel):
    total_value: Optional[str] = None
    payment_schedule: Optional[str] = None
    penalties: Optional[list[str]] = None
    liability_cap: Optional[str] = None


class KeyDate(BaseModel):
    label: str
    date: str
    type: str


class Exit(BaseModel):
    difficulty: Literal["easy", "moderate", "hard"]
    summary: str
    termination_terms: list[str]


class MissingClause(BaseModel):
    name: str
    why_matters: str


class Scenario(BaseModel):
    question: str
    answer: str


class AnalysisDocument(BaseModel):
    html: str


class AnalysisResult(BaseModel):
    id: str
    verdict: Verdict
    benchmark_summary: Optional[str] = None
    key_facts: KeyFacts
    red_flags: list[RedFlag]
    clauses: list[Clause]
    document: AnalysisDocument
    obligations: Optional[Obligations] = None
    money: Optional[Money] = None
    dates: Optional[list[KeyDate]] = None
    exit: Optional[Exit] = None
    missing_clauses: Optional[list[MissingClause]] = None
    scenarios: Optional[list[Scenario]] = None


class AnalysisSummary(BaseModel):
    """Lightweight row for the dashboard history list."""

    id: str
    filename: str
    contract_type: str
    risk_score: int
    risk_level: RiskLevel
    created_at: Optional[str] = None


class SaveAnalysisRequest(BaseModel):
    analysis_id: str


class ChatRequest(BaseModel):
    analysis_id: str
    message: str
    clause_id: Optional[str] = None


class ChatCitation(BaseModel):
    clause_id: str
    quote: str


class ChatResponse(BaseModel):
    answer: str
    citations: list[ChatCitation]
