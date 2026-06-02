"""API routes. Shapes match frontend/src/lib/types.ts.

FAKE_OCI=1 -> canned response (no cloud).
FAKE_OCI=0 -> real OCI Generative AI pipeline (ingest -> LLM analysis).
The OCI pipeline is imported lazily so the canned path needs no `oci` SDK.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from app.config import settings
from app.data.fixtures import SAMPLES, build_canned_result
from app.models.schemas import (
    AnalysisResult,
    ChatCitation,
    ChatRequest,
    ChatResponse,
    Sample,
)
from app.services.cache import cache

router = APIRouter(prefix="/api")

SAMPLES_DIR = Path(__file__).resolve().parent.parent / "data" / "samples"


def _sample_text(sample_id: str) -> str:
    path = SAMPLES_DIR / f"{sample_id}.txt"
    if not path.exists():
        path = SAMPLES_DIR / "saas-msa.txt"  # fallback
    return path.read_text(encoding="utf-8")


@router.get("/samples", response_model=list[Sample])
async def get_samples() -> list[dict]:
    return SAMPLES


@router.post("/analyze", response_model=AnalysisResult)
async def analyze(
    file: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
    sample_id: str | None = Form(default=None),
) -> dict:
    file_bytes = await file.read() if file is not None else None
    if file_bytes is None and not text and not sample_id:
        raise HTTPException(status_code=422, detail="Provide a file, text, or sample_id.")

    if settings.fake_oci:
        import uuid

        result = build_canned_result(str(uuid.uuid4()))
        cache.put(result["id"], result)
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
    except Exception as exc:  # surface a clean error to the UI
        raise HTTPException(status_code=502, detail=f"Analysis failed: {exc}") from exc

    cache.put(result["id"], result)
    return result


@router.get("/analysis/{analysis_id}", response_model=AnalysisResult)
async def get_analysis(analysis_id: str) -> dict:
    result = cache.get(analysis_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Analysis not found or expired.")
    return result


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
