"""Smoke test OCI Document AI TEXT_EXTRACTION (optional live call).

Run with FAKE_OCI=0 and Document AI enabled in your tenancy:
    python -m scripts.smoke_document_ai

Pass a scanned PDF path to test real OCR:
    python -m scripts.smoke_document_ai C:\\path\\to\\lease.pdf
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402
from app.pipeline.text_quality import needs_ocr  # noqa: E402


def _check_config() -> None:
    if settings.fake_oci:
        print("FAKE_OCI=1 -> set FAKE_OCI=0 to test Document AI.")
        sys.exit(1)
    if not settings.ocr_enabled:
        print("OCR_ENABLED=false -> set OCR_ENABLED=true in backend/.env")
        sys.exit(1)
    if not settings.oci_compartment_id:
        print("Missing OCI_COMPARTMENT_ID in backend/.env")
        sys.exit(1)


def main() -> None:
    _check_config()

    print("[1/2] text_quality heuristics ...", flush=True)
    assert needs_ocr("d.e.r.d.r.l.,,di3 " * 30, 3) is True
    good = "The tenant shall pay rent monthly under this tenancy agreement. " * 5
    assert needs_ocr(good, 1) is False
    print("   ok")

    pdf_path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if not pdf_path:
        print(
            "\n[2/2] skipped live Document AI (pass a scanned PDF path as argv[1] to test OCR)"
        )
        print("\nPARTIAL OK — heuristics pass; live OCR not exercised.")
        return

    if not pdf_path.exists():
        print(f"File not found: {pdf_path}")
        sys.exit(1)

    print(f"[2/2] document_ai on {pdf_path.name} ...", flush=True)
    from app.pipeline.ingest import _pdfplumber_extract
    from app.oci.document_ai import extract_text_from_pdf

    data = pdf_path.read_bytes()
    plumber_text, pages = _pdfplumber_extract(data)
    print(f"   pdfplumber: {len(plumber_text)} chars, {pages} pages, needs_ocr={needs_ocr(plumber_text, pages)}")

    from app.oci.document_ai import page_range_batches

    batches = page_range_batches(pages)
    labels = [f"{a}-{b}" for a, b in batches]
    print(
        f"   document_ai: {len(batches)} physical chunk(s) (<=5 pages each), ranges={labels}"
    )

    try:
        ocr_text = extract_text_from_pdf(data, pages)
        print(f"   document_ai: {len(ocr_text)} chars")
        print(f"   preview: {ocr_text[:200]!r}...")
    except Exception as exc:
        print(f"   FAILED: {type(exc).__name__}: {exc}")
        msg = str(exc).lower()
        if "413" in msg or "too many pages" in msg:
            print(
                "   hint: OCI inline allows max 5 pages per uploaded file — use latest "
                "document_ai.py (pypdf physical split per chunk, not page_range on full PDF)."
            )
        else:
            print("   hint: enable AI Document in uk-london-1 and IAM for analyze_document.")
        sys.exit(1)

    print("\nALL OK — Document AI OCR path works.")


if __name__ == "__main__":
    main()
