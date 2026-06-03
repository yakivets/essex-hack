"""Extract plain text from an uploaded contract (PDF / DOCX / plain text).

Heavy parsers are imported lazily so the canned path needs none of them.
"""

from __future__ import annotations


def extract_text(data: bytes, filename: str | None) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return _from_pdf(data)
    if name.endswith(".docx"):
        return _from_docx(data)
    # plain text / unknown -> best-effort decode
    return data.decode("utf-8", errors="replace")


def _from_pdf(data: bytes) -> str:
    import io

    import pdfplumber

    parts: list[str] = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            parts.append(page.extract_text() or "")
    return "\n".join(parts).strip()


def _from_docx(data: bytes) -> str:
    import io

    import docx  # python-docx

    document = docx.Document(io.BytesIO(data))
    return "\n".join(p.text for p in document.paragraphs).strip()
