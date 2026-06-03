"""Heuristics to detect pdfplumber garbage on scanned/image PDFs."""

from __future__ import annotations

import re

from app.config import settings

_VOWELS = set("aeiouAEIOU")


def _vowel_ratio(word: str) -> float:
    letters = [c for c in word if c.isalpha()]
    if not letters:
        return 0.0
    return sum(1 for c in letters if c in _VOWELS) / len(letters)


def needs_ocr(text: str, page_count: int) -> bool:
    """Return True when pdfplumber output is likely unusable and Document AI should run."""
    stripped = text.strip()
    if page_count <= 0:
        return True

    alpha_chars = sum(1 for c in stripped if c.isalpha())
    min_alpha = settings.ocr_min_chars_per_page * page_count
    if alpha_chars < min_alpha:
        return True

    non_space = [c for c in stripped if not c.isspace()]
    if non_space:
        junk = sum(
            1
            for c in non_space
            if ord(c) > 127
            or (not c.isalnum() and c not in ".,;:'\"()-/&")
        )
        if junk / len(non_space) >= settings.ocr_junk_ratio_threshold:
            return True

    tokens = re.findall(r"[A-Za-z]{4,}", stripped)
    if len(tokens) >= 10:
        gibberish = sum(1 for t in tokens if _vowel_ratio(t) < 0.15)
        if gibberish / len(tokens) >= 0.4:
            return True

    # pdfplumber scan garbage: "d.e.r.d.r.l.,,di3" — punctuation-heavy tokens
    words = re.findall(r"\S+", stripped)
    if len(words) >= 8:
        punct_heavy = sum(
            1
            for w in words
            if len(w) >= 2 and sum(1 for c in w if not c.isalnum()) / len(w) > 0.35
        )
        if punct_heavy / len(words) >= 0.35:
            return True

    return False
