"""Extract plain text from an uploaded contract (PDF / DOCX / plain text).

Heavy parsers are imported lazily so the canned path needs none of them.
Scanned PDFs: pdfplumber first, then OCI Document AI when text quality is poor.
"""

from __future__ import annotations

import io
import logging

from app.config import settings

logger = logging.getLogger(__name__)


def extract_text(data: bytes, filename: str | None) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return _from_pdf(data)
    if name.endswith(".docx"):
        return _from_docx(data)
    return data.decode("utf-8", errors="replace")


def _pdfplumber_extract(data: bytes) -> tuple[str, int]:
    import pdfplumber

    parts: list[str] = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        page_count = len(pdf.pages)
        for page in pdf.pages:
            parts.append(page.extract_text() or "")
    return "\n".join(parts).strip(), page_count


def _from_pdf(data: bytes) -> str:
    text, page_count = _pdfplumber_extract(data)

    if settings.fake_oci or not settings.ocr_enabled:
        logger.info("ingest: pdfplumber only (%d pages, fake_oci=%s)", page_count, settings.fake_oci)
        return text

    from app.pipeline.text_quality import needs_ocr

    if not settings.ocr_force and not needs_ocr(text, page_count):
        logger.info("ingest: pdfplumber ok (%d pages)", page_count)
        return text

    from app.oci.document_ai import extract_text_from_pdf

    logger.info("ingest: document_ai OCR fallback (%d pages)", page_count)
    ocr_text = extract_text_from_pdf(data, page_count)
    logger.info("ingest: document_ai extracted %d chars", len(ocr_text))
    return ocr_text


def _from_docx(data: bytes) -> str:
    import docx

    document = docx.Document(io.BytesIO(data))
    return "\n".join(p.text for p in document.paragraphs).strip()
