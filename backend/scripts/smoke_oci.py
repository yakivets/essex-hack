"""Smoke test the real OCI Generative AI connection (chat + embeddings + pipeline).

Run AFTER filling backend/.env (FAKE_OCI=0) and setting up ~/.oci/config:
    .\.venv\Scripts\python.exe -m scripts.smoke_oci

It does the minimum to prove connectivity, then a full analysis of a sample:
  1) one chat() call            -> proves the chat model + auth + endpoint
  2) one embeddings.embed call  -> proves the embed model
  3) run_analysis(sample)       -> proves the end-to-end structured pipeline

Any failure prints a focused hint (auth / endpoint / model-shape) and exits 1.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings  # noqa: E402


def _check_config() -> None:
    missing = [
        name
        for name, val in {
            "OCI_REGION": settings.oci_region,
            "OCI_GENAI_ENDPOINT": settings.oci_genai_endpoint,
            "OCI_COMPARTMENT_ID": settings.oci_compartment_id,
            "OCI_GENAI_CHAT_MODEL": settings.oci_genai_chat_model,
            "OCI_GENAI_EMBED_MODEL": settings.oci_genai_embed_model,
        }.items()
        if not val or "REPLACE_ME" in val
    ]
    if settings.fake_oci:
        print("FAKE_OCI=1 -> set it to 0 in backend/.env to test the real connection.")
        sys.exit(1)
    if missing:
        print("Missing/placeholder values in backend/.env: " + ", ".join(missing))
        sys.exit(1)


def main() -> None:
    _check_config()
    print(f"Region={settings.oci_region}  chat={settings.oci_genai_chat_model}  "
          f"embed={settings.oci_genai_embed_model}")

    # 1) chat
    print("\n[1/3] chat() ...", flush=True)
    from app.oci import genai

    try:
        reply = genai.chat("Reply with exactly the word: pong", max_tokens=20)
        print("   ok ->", reply.strip()[:80])
    except Exception as exc:
        _fail("chat", exc)

    # 2) embeddings
    print("[2/3] embeddings.embed() ...", flush=True)
    from app.pipeline import embeddings

    try:
        vecs = embeddings.embed(["hello", "auto-renewal clause"])
        print(f"   ok -> {len(vecs)} vectors, dim={len(vecs[0])}")
    except Exception as exc:
        _fail("embeddings", exc)

    # 3) full pipeline on a sample contract
    print("[3/3] run_analysis(sample) ...", flush=True)
    from app.pipeline.orchestrator import run_analysis

    sample = (Path(__file__).resolve().parent.parent
              / "app" / "data" / "samples" / "saas-subscription.txt").read_text(encoding="utf-8")
    try:
        result = run_analysis(sample)
        v = result["verdict"]
        print(f"   ok -> risk {v['risk_score']}/100 ({v['risk_level']}), "
              f"{len(result['clauses'])} clauses, {len(result['red_flags'])} red flags")
        graded = sum(1 for c in result["clauses"] if c.get("benchmark"))
        print(f"        benchmarks set on {graded} clauses (vector-grounded)")
    except Exception as exc:
        _fail("run_analysis", exc)

    print("\nALL OK — real OCI GenAI path is working.")


def _fail(stage: str, exc: Exception) -> None:
    msg = str(exc)
    print(f"   FAILED at {stage}: {type(exc).__name__}: {msg}")
    low = msg.lower()
    if "could not find config" in low or "profile" in low or "key" in low:
        print("   hint: run `oci setup config` and upload the public key to your OCI user.")
    elif "not authorized" in low or "404" in low or "notfound" in low:
        print("   hint: check OCI_COMPARTMENT_ID, the model id, and that GenAI is enabled in this region.")
    elif "endpoint" in low or "could not resolve" in low or "connection" in low:
        print("   hint: check OCI_GENAI_ENDPOINT / OCI_REGION (inference.generativeai.<region>...).")
    elif "model" in low and "shape" in low:
        print("   hint: chat-request shape differs by model family — compare with playground 'View code'.")
    sys.exit(1)


if __name__ == "__main__":
    main()
