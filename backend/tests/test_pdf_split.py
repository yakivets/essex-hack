"""Tests for physical PDF splitting before OCI Document AI calls."""

import io

from pypdf import PdfReader, PdfWriter

from app.oci.document_ai import _extract_pdf_pages, page_range_batches


def _make_pdf(num_pages: int) -> bytes:
    writer = PdfWriter()
    for i in range(num_pages):
        writer.add_blank_page(width=200, height=200)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def test_page_range_batches_24_pages():
    batches = page_range_batches(24)
    assert batches == [(1, 5), (6, 10), (11, 15), (16, 20)]


def test_extract_pdf_pages_count():
    pdf = _make_pdf(6)
    chunk = _extract_pdf_pages(pdf, 2, 4)
    assert len(PdfReader(io.BytesIO(chunk)).pages) == 3


def test_extract_pdf_pages_single_page():
    pdf = _make_pdf(3)
    chunk = _extract_pdf_pages(pdf, 1, 1)
    assert len(PdfReader(io.BytesIO(chunk)).pages) == 1
