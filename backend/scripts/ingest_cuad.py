"""One-off: build the `cuad_clauses` market-reference vector collection.

Embeds the seed reference corpus (app/data/cuad_reference.py) and inserts it into
the configured vector store. With Oracle ADB 23ai configured (ADB_DSN set) this
populates the native VECTOR table; otherwise it exercises the in-memory store.

Run from the backend dir:
    .\.venv\Scripts\python.exe -m scripts.ingest_cuad
    # or: python scripts/ingest_cuad.py

Idempotency: re-running inserts duplicates into Oracle. To rebuild, drop/truncate
the table first (or just run once). The in-memory store is per-process.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Allow running as a plain script (python scripts/ingest_cuad.py).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402
from app.data.cuad_reference import reference_records  # noqa: E402
from app.pipeline import embeddings  # noqa: E402
from app.pipeline.vectorstore import CUAD, get_store  # noqa: E402


def main() -> None:
    backend = "Oracle ADB 23ai" if settings.use_oracle else "in-memory (no ADB_DSN set)"
    mode = "fake" if settings.fake_oci else "OCI GenAI"
    print(f"Vector store: {backend} | embeddings: {mode} | dim={settings.embed_dim}")

    records = reference_records()
    print(f"Embedding {len(records)} reference clauses...")
    vectors = embeddings.embed([r["text"] for r in records])
    for r, v in zip(records, vectors):
        r["embedding"] = v

    store = get_store()
    store.add(CUAD, records)
    print(f"Inserted into '{CUAD}'. Total rows now: {store.count(CUAD)}")


if __name__ == "__main__":
    main()
