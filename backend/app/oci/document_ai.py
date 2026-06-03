"""OCI Document AI text extraction for scanned PDFs.

Uses AIServiceDocumentClient + TEXT_EXTRACTION on inline base64 PDF bytes.
Auth from ~/.oci/config (same as GenAI).

OCI synchronous inline analyze allows at most 5 pages **per uploaded file**.
We physically split multi-page PDFs into <=5-page chunks (page_range alone is not enough).
See: https://docs.oracle.com/en-us/iaas/Content/document-understanding/using/limits.htm
"""

from __future__ import annotations

import base64
import io
import logging

from app.config import settings

logger = logging.getLogger(__name__)


def _client():
    import oci

    config = oci.config.from_file()
    endpoint = settings.oci_document_ai_endpoint.strip()
    if not endpoint and settings.oci_region:
        endpoint = (
            f"https://document.aiservice.{settings.oci_region}.oci.oraclecloud.com"
        )
    if not endpoint:
        raise RuntimeError(
            "OCI_DOCUMENT_AI_ENDPOINT or OCI_REGION required for Document AI OCR"
        )
    return oci.ai_document.AIServiceDocumentClient(
        config=config,
        service_endpoint=endpoint,
        timeout=(10, settings.oci_read_timeout),
    )


def _pages_to_process(page_count: int) -> int:
    if page_count <= 0:
        return 1
    return min(page_count, settings.ocr_max_pages)


def page_range_batches(page_count: int) -> list[tuple[int, int]]:
    """Inclusive 1-based page spans, each at most ocr_max_pages_per_request (OCI: 5)."""
    total = _pages_to_process(page_count)
    batch_size = max(1, settings.ocr_max_pages_per_request)
    batches: list[tuple[int, int]] = []
    start = 1
    while start <= total:
        end = min(start + batch_size - 1, total)
        batches.append((start, end))
        start = end + 1
    return batches


def _extract_pdf_pages(pdf_bytes: bytes, start: int, end: int) -> bytes:
    """Extract inclusive 1-based page range into a new PDF (<=5 pages for OCI inline)."""
    from pypdf import PdfReader, PdfWriter

    if start > end or start < 1:
        raise ValueError(f"Invalid page range {start}-{end}")

    reader = PdfReader(io.BytesIO(pdf_bytes))
    n = len(reader.pages)
    if end > n:
        raise ValueError(f"Page range {start}-{end} exceeds document ({n} pages)")

    writer = PdfWriter()
    for i in range(start - 1, end):
        writer.add_page(reader.pages[i])

    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def _page_text(page) -> str:
    lines = getattr(page, "lines", None) or []
    if lines:
        parts = []
        for line in lines:
            t = getattr(line, "text", None)
            if t:
                parts.append(t.strip())
        if parts:
            return "\n".join(parts)
    words = getattr(page, "words", None) or []
    if words:
        return " ".join(
            getattr(w, "text", "") for w in words if getattr(w, "text", "")
        )
    return ""


def _analyze_chunk(chunk_bytes: bytes) -> str:
    from oci.ai_document import models as m

    encoded = base64.b64encode(chunk_bytes).decode("utf-8")
    inline = m.InlineDocumentDetails(source="INLINE", data=encoded)
    feature = m.DocumentTextExtractionFeature(feature_type="TEXT_EXTRACTION")
    details = m.AnalyzeDocumentDetails(
        compartment_id=settings.oci_compartment_id,
        document=inline,
        features=[feature],
        document_type="OTHERS",
        language="ENG",
    )
    client = _client()
    try:
        response = client.analyze_document(analyze_document_details=details)
    except Exception as exc:
        status = getattr(exc, "status", None)
        if status == 413 or "413" in str(exc):
            from pypdf import PdfReader

            pages_in_chunk = len(PdfReader(io.BytesIO(chunk_bytes)).pages)
            size_kb = len(chunk_bytes) / 1024
            raise RuntimeError(
                "Inline Document AI requires <=5 pages per file; "
                f"chunk has {pages_in_chunk} pages, {size_kb:.1f} KB. "
                "Check physical PDF splitting."
            ) from exc
        raise

    pages = getattr(response.data, "pages", None) or []
    pages_sorted = sorted(
        pages, key=lambda p: getattr(p, "page_number", 0) or 0
    )
    chunks = [_page_text(p) for p in pages_sorted]
    return "\n\n".join(c for c in chunks if c).strip()


def extract_text_from_pdf(pdf_bytes: bytes, page_count: int) -> str:
    """Run OCI Document AI TEXT_EXTRACTION; return plain text for the pipeline."""
    batches = page_range_batches(page_count)
    total_src = page_count if page_count > 0 else 1
    if total_src > settings.ocr_max_pages:
        logger.warning(
            "document_ai: OCR limited to first %d of %d pages",
            settings.ocr_max_pages,
            total_src,
        )
    logger.info(
        "document_ai: %d API call(s), page batches %s",
        len(batches),
        [f"{a}-{b}" for a, b in batches],
    )

    parts: list[str] = []
    for idx, (start, end) in enumerate(batches, start=1):
        chunk_bytes = _extract_pdf_pages(pdf_bytes, start, end)
        chunk_pages = end - start + 1
        size_kb = len(chunk_bytes) / 1024
        logger.info(
            "document_ai: batch %d/%d pages %d-%d (%d pages, %.1f KB)",
            idx,
            len(batches),
            start,
            end,
            chunk_pages,
            size_kb,
        )
        chunk = _analyze_chunk(chunk_bytes)
        if chunk:
            parts.append(chunk)

    text = "\n\n".join(parts).strip()
    if not text:
        raise RuntimeError(
            "Document AI returned no text — check IAM, region, or try pasting contract text."
        )
    return text
