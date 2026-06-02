"""
ingest_cuad.py — One-off script to build the cuad_clauses vector collection.
Downloads CUAD_v1.json from the official Google Drive source.

Usage:
    $env:FAKE_OCI="1"; python backend/scripts/ingest_cuad.py
"""

import os
import json
import re
import sys
from pathlib import Path
from collections import Counter

import gdown
from tqdm import tqdm

FAKE_OCI = os.getenv("FAKE_OCI", "0") == "1"
ROOT = Path(__file__).resolve().parents[2]

# Official CUAD Google Drive file ID
CUAD_GDRIVE_ID = "1of_oFDGzpA4bfxJ5sLlnkDDSqWbgjSjA"
CUAD_JSON_PATH = ROOT / "backend" / "data" / "CUAD_v1.json"

RISK_CLAUSE_TYPES = {
    "Termination For Convenience":          {"category": "termination",     "harshness": "high"},
    "Renewal Term":                         {"category": "termination",     "harshness": "medium"},
    "Liability Cap":                        {"category": "liability",       "harshness": "high"},
    "Limitation Of Liability":              {"category": "liability",       "harshness": "high"},
    "Liquidated Damages":                   {"category": "penalty",         "harshness": "high"},
    "Price Restrictions":                   {"category": "payment",         "harshness": "medium"},
    "Minimum Commitment":                   {"category": "payment",         "harshness": "medium"},
    "Audit Rights":                         {"category": "obligations",     "harshness": "low"},
    "Non-Compete":                          {"category": "obligations",     "harshness": "high"},
    "Non-Disparagement":                    {"category": "obligations",     "harshness": "medium"},
    "Exclusivity":                          {"category": "obligations",     "harshness": "high"},
    "Indemnification":                      {"category": "liability",       "harshness": "high"},
    "IP Ownership Assignment":              {"category": "ip",              "harshness": "high"},
    "License Grant":                        {"category": "ip",              "harshness": "low"},
    "Irrevocable Or Perpetual License":     {"category": "ip",              "harshness": "high"},
    "Governing Law":                        {"category": "jurisdiction",    "harshness": "low"},
    "Dispute Resolution":                   {"category": "jurisdiction",    "harshness": "medium"},
    "Anti-Assignment":                      {"category": "obligations",     "harshness": "medium"},
    "Change Of Control":                    {"category": "obligations",     "harshness": "medium"},
    "Insurance":                            {"category": "obligations",     "harshness": "low"},
    "Warranty Duration":                    {"category": "warranty",        "harshness": "low"},
    "Cap On Liability":                     {"category": "liability",       "harshness": "high"},
    "Confidentiality/No-Disclosure":        {"category": "confidentiality", "harshness": "medium"},
    "Most Favored Nation":                  {"category": "payment",         "harshness": "medium"},
    "Unlimited/All-You-Can-Eat-License":    {"category": "ip",              "harshness": "medium"},
}


def download_cuad_json():
    if CUAD_JSON_PATH.exists():
        print("CUAD_v1.json already exists, skipping download.")
        return
    print("Downloading CUAD_v1.json from Google Drive...")
    CUAD_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    url = f"https://drive.google.com/uc?id={CUAD_GDRIVE_ID}"
    gdown.download(url, str(CUAD_JSON_PATH), quiet=False)
    print("Download complete.")


def clean_text(text: str) -> str:
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[\x00-\x08\x0b-\x1f\x7f]', '', text)
    return text.strip()


def load_cuad_clauses() -> list:
    download_cuad_json()

    print("Parsing CUAD_v1.json...")
    with open(CUAD_JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    records = []
    seen = set()

    for contract in tqdm(data["data"], desc="Extracting clauses"):
        contract_title = contract.get("title", "unknown")
        for paragraph in contract.get("paragraphs", []):
            for qa in paragraph.get("qas", []):
                question = qa.get("question", "")
                label = question.strip().rstrip("?").split("related to")[-1].strip(" \"'.")

                meta = None
                matched_key = None
                for key, val in RISK_CLAUSE_TYPES.items():
                    if key.lower() in label.lower() or label.lower() in key.lower():
                        meta = val
                        matched_key = key
                        break

                if meta is None:
                    continue

                for answer in qa.get("answers", []):
                    text = clean_text(answer.get("text", ""))
                    if len(text) < 30:
                        continue
                    dedup_key = (matched_key, text[:120])
                    if dedup_key in seen:
                        continue
                    seen.add(dedup_key)

                    records.append({
                        "id":             f"cuad_{len(records):05d}",
                        "text":           text,
                        "category":       meta["category"],
                        "harshness":      meta["harshness"],
                        "clause_type":    matched_key,
                        "contract_title": contract_title,
                    })

    print(f"Extracted {len(records)} labelled clause records.")
    return records


def save_jsonl(records: list, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")
    print(f"Saved {len(records)} records → {path}")


def embed_and_upsert(records: list) -> None:
    if FAKE_OCI:
        print("[FAKE_OCI] Skipping real embedding/upsert. Records saved to JSONL only.")
        return

    try:
        sys.path.insert(0, str(ROOT / "backend"))
        from app.pipeline.embeddings import get_embeddings
        from app.pipeline.vectorstore import get_vectorstore
    except ImportError as e:
        print(f"Could not import app modules: {e}")
        print("Run with $env:FAKE_OCI='1' to skip OCI and just save the JSONL.")
        sys.exit(1)


def main():
    records = load_cuad_clauses()

    out_path = ROOT / "backend" / "data" / "cuad_clauses.jsonl"
    save_jsonl(records, out_path)

    embed_and_upsert(records)

    print("\nClause breakdown by category:")
    cats = Counter(r["category"] for r in records)
    for cat, count in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {cat:<20} {count:>4}")


if __name__ == "__main__":
    main()