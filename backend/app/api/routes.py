"""API routes. Shapes match frontend/src/lib/types.ts.

FAKE_OCI=1 -> canned response (no cloud).
FAKE_OCI=0 -> real OCI Generative AI pipeline (ingest -> LLM analysis).
The OCI pipeline is imported lazily so the canned path needs no `oci` SDK.
"""

from __future__ import annotations

import json
import traceback
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.auth import current_user, optional_user
from app.config import settings
from app.data.fixtures import SAMPLES, build_canned_result
from app.db import get_db
from app.models.db_models import Analysis, User
from app.models.schemas import (
    AnalysisResult,
    AnalysisSummary,
    ChatCitation,
    ChatRequest,
    ChatResponse,
    Sample,
    SaveAnalysisRequest,
)
from app.services.cache import cache

router = APIRouter(prefix="/api")

SAMPLES_DIR = Path(__file__).resolve().parent.parent / "data" / "samples"

# Keyword -> human label, scanned against the rendered document + key facts to give
# the dashboard a friendly "contract type" without another LLM call.
_TYPE_KEYWORDS: list[tuple[tuple[str, ...], str]] = [
    (("non-disclosure", "nda", "confidential"), "NDA"),
    (("software development", "development agreement"), "Development Agreement"),
    (("saas", "subscription", "software as a service"), "SaaS Agreement"),
    (("master services", "services agreement", "statement of work"), "Services Agreement"),
    (("employment", "employee"), "Employment Agreement"),
    (("lease", "tenant", "landlord"), "Lease"),
    (("license", "licence"), "License Agreement"),
    (("purchase", "sale of goods", "supply"), "Purchase Agreement"),
]


def _guess_contract_type(result: dict[str, Any]) -> str:
    """Best-effort label from the document text / clause categories."""
    haystack = (result.get("document") or {}).get("html", "")
    haystack += " ".join(c.get("category", "") for c in result.get("clauses", []))
    low = haystack.lower()
    for keywords, label in _TYPE_KEYWORDS:
        if any(k in low for k in keywords):
            return label
    return "Contract"


def _sample_text(sample_id: str) -> str:
    path = SAMPLES_DIR / f"{sample_id}.txt"
    if not path.exists():
        # Unknown/legacy id -> degrade to the first available sample instead of 500.
        available = sorted(SAMPLES_DIR.glob("*.txt"))
        if not available:
            raise HTTPException(status_code=400, detail=f"Unknown sample '{sample_id}'.")
        path = available[0]
    return path.read_text(encoding="utf-8")


@router.get("/samples", response_model=list[Sample])
async def get_samples() -> list[dict]:
    return SAMPLES


def _source_filename(file: UploadFile | None, text: str | None, sample_id: str | None) -> str:
    """A human label for where this analysis came from (shown in the dashboard)."""
    if file is not None and file.filename:
        return file.filename
    if sample_id:
        sample = next((s for s in SAMPLES if s["id"] == sample_id), None)
        return sample["name"] if sample else sample_id
    if text:
        return "Pasted contract"
    return "Contract"


@router.post("/analyze", response_model=AnalysisResult)
async def analyze(
    file: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
    sample_id: str | None = Form(default=None),
) -> dict:
    """Auth-agnostic: works for anonymous and logged-in callers alike. Saving an
    analysis to an account is a separate, explicit POST /api/analyses call."""
    file_bytes = await file.read() if file is not None else None
    if file_bytes is None and not text and not sample_id:
        raise HTTPException(status_code=422, detail="Provide a file, text, or sample_id.")

    filename = _source_filename(file, text, sample_id)

    if settings.fake_oci:
        import uuid

        result = build_canned_result(str(uuid.uuid4()))
        cache.put(
            result["id"],
            result,
            meta={"filename": filename, "contract_type": _guess_contract_type(result)},
        )
        return result

    # Real pipeline (lazy imports so canned mode needs no extra deps)
    from app.pipeline.ingest import extract_text
    from app.pipeline.orchestrator import run_analysis

    if file_bytes is not None:
        contract_text = extract_text(file_bytes, file.filename if file else None)
    elif text:
        contract_text = text
    else:
        contract_text = _sample_text(sample_id or "")

    if not contract_text.strip():
        raise HTTPException(status_code=400, detail="Could not read any text from the contract.")

    try:
        # run_analysis is blocking (sync OCI HTTP); off-load it so it doesn't
        # stall the event loop and block other requests during the ~45s call.
        result = await run_in_threadpool(run_analysis, contract_text)
    except Exception as exc:  # surface a clean error to the UI; log the cause
        traceback.print_exc()
        raise HTTPException(status_code=502, detail=f"Analysis failed: {exc}") from exc

    cache.put(
        result["id"],
        result,
        meta={"filename": filename, "contract_type": _guess_contract_type(result)},
    )
    return result


@router.get("/analyses", response_model=list[AnalysisSummary])
def list_analyses(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    """The current user's saved analyses, newest first (summaries only)."""
    rows = db.scalars(
        select(Analysis)
        .where(Analysis.user_id == user.id)
        .order_by(Analysis.created_at.desc())
    ).all()
    return [a.summary() for a in rows]


@router.post("/analyses", response_model=AnalysisSummary, status_code=201)
def save_analysis(
    body: SaveAnalysisRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Persist a cached analysis to the current user. Idempotent: re-saving the
    same id returns the existing row (covers anon-analyze -> login -> save)."""
    existing = db.get(Analysis, body.analysis_id)
    if existing is not None:
        if existing.user_id != user.id:
            raise HTTPException(status_code=403, detail="This analysis belongs to another account.")
        return existing.summary()

    result = cache.get(body.analysis_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Analysis not found or expired; re-run it.")

    meta = cache.get_meta(body.analysis_id)
    verdict = result.get("verdict") or {}
    row = Analysis(
        id=body.analysis_id,
        user_id=user.id,
        filename=meta.get("filename") or "Contract",
        contract_type=meta.get("contract_type") or _guess_contract_type(result),
        risk_score=int(verdict.get("risk_score") or 0),
        risk_level=verdict.get("risk_level") or "low",
        result_json=json.dumps(result),
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        # Concurrent save of the same id won the race — return the existing row.
        db.rollback()
        existing = db.get(Analysis, body.analysis_id)
        if existing is not None and existing.user_id == user.id:
            return existing.summary()
        raise HTTPException(status_code=409, detail="Could not save analysis.")
    db.refresh(row)
    return row.summary()


@router.get("/analysis/{analysis_id}", response_model=AnalysisResult)
def get_analysis(
    analysis_id: str,
    user: Optional[User] = Depends(optional_user),
    db: Session = Depends(get_db),
) -> dict:
    """Return a result from the in-memory cache, falling back to the DB for saved
    analyses (owner-checked) once the cache has expired."""
    result = cache.get(analysis_id)
    if result is not None:
        return result

    row = db.get(Analysis, analysis_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Analysis not found or expired.")
    if user is None or row.user_id != user.id:
        # Don't leak existence of someone else's analysis.
        raise HTTPException(status_code=404, detail="Analysis not found or expired.")
    return json.loads(row.result_json)


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    result = cache.get(req.analysis_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Analysis not found or expired.")

    if not settings.fake_oci:
        from app.pipeline.chat import answer_question

        try:
            # answer_question is blocking (sync OCI HTTP); off-load it too.
            return await run_in_threadpool(
                answer_question, result, req.message, req.clause_id
            )
        except Exception as exc:
            traceback.print_exc()
            raise HTTPException(status_code=502, detail=f"Chat failed: {exc}") from exc

    # Canned chat (Stage A)
    clauses = result["clauses"]
    clause = next((c for c in clauses if c["id"] == req.clause_id), None) if req.clause_id else None
    if clause is not None:
        answer = (
            f"On the {clause['category'].lower()} clause: {clause['plain_english']} "
            f"{clause.get('why_risky') or ''}"
        ).strip()
        citations = [ChatCitation(clause_id=clause["id"], quote=clause["quote"])]
    else:
        verdict = result["verdict"]
        c2 = next((c for c in clauses if c["id"] == "c2"), clauses[0])
        answer = (
            f"Here's what stands out: {verdict['summary_line']} {verdict['summary_bullets'][0]}."
        )
        citations = [ChatCitation(clause_id=c2["id"], quote=c2["quote"])]
    return ChatResponse(answer=answer, citations=citations)
