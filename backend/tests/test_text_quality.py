"""Tests for scanned-PDF quality heuristics."""

from app.config import settings
from app.pipeline.text_quality import needs_ocr


def test_good_text_skips_ocr():
    text = (
        "This Agreement is entered into between Party A and Party B. "
        "The term shall commence on the Effective Date and continue for twelve months. "
        "Either party may terminate with thirty days written notice."
    ) * 3
    assert needs_ocr(text, page_count=2) is False


def test_garbage_triggers_ocr():
    junk = "d.e.r.d.r.l.,,di3 d.c.Dn.rytub{retuGeEh*vrruudkFidh " * 40
    assert needs_ocr(junk, page_count=3) is True


def test_empty_triggers_ocr():
    assert needs_ocr("", page_count=5) is True


def test_sparse_triggers_ocr():
    assert needs_ocr("abc", page_count=10) is True
