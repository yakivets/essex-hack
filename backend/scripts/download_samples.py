"""Saves 3 diverse sample contracts from CUAD into backend/data/samples/"""
from pathlib import Path
from datasets import load_dataset

OUT = Path(__file__).resolve().parents[1] / "data" / "samples"
OUT.mkdir(parents=True, exist_ok=True)

ds = load_dataset("theatticusproject/cuad", split="train", verification_mode="no_checks")

saved = 0
for i, item in enumerate(ds):
    if saved >= 3:
        break
    try:
        pdf = item["pdf"]
        # Extract text from all pages
        text = "\n".join(
            page.extract_text() or ""
            for page in pdf.pages
        )
        text = text.strip()
        if len(text) < 500:
            continue  # skip if too little text extracted

        path = OUT / f"sample_{saved + 1}_contract.txt"
        path.write_text(text, encoding="utf-8")
        print(f"Saved: {path.name}  ({len(text):,} chars)")
        saved += 1
    except Exception as e:
        print(f"Skipping item {i}: {e}")
        continue

print(f"Done. Saved {saved} sample contracts.")