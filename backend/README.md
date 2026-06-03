# PactPilot backend (FastAPI)

Stage A: returns a canned `AnalysisResult` whose shape matches the frontend's
`src/lib/types.ts` exactly, so the UI renders against a real server. No OCI yet.

## Run

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows  (use: source .venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
uvicorn app.main:app --reload   # http://localhost:8000
```

Open http://localhost:8000/docs for the interactive API.

## Endpoints
- `GET  /api/samples` — the 3 landing-page samples
- `POST /api/analyze` — multipart form: `file` (PDF/DOCX) **or** `text` **or** `sample_id`
- `GET  /api/analysis/{id}` — re-fetch a cached result (404 after TTL)
- `POST /api/chat` — JSON `{analysis_id, message, clause_id?}` → `{answer, citations}`
- `GET  /health`

## Connect the frontend
Set `frontend/.env` → `VITE_API_BASE_URL=http://localhost:8000`, then run the
frontend. Leave it empty to use the frontend's built-in mock data instead.

## What replaces what
Real pipeline (ingest → segment → classify → benchmark → risk → extract →
summary, all via OCI GenAI + Oracle 23ai) replaces the body of `analyze` and
`chat` slice by slice. The response shape never changes — see
`docs/05-backend-plan.md`.
