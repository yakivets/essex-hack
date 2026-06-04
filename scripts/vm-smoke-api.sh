#!/bin/bash
set -euo pipefail
BASE="${1:-http://127.0.0.1:8000}"

echo "=== health ==="
curl -sf "$BASE/health"
echo

echo "=== login ==="
LOGIN=$(curl -sf -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@pactpilot.ai","password":"demo1234"}')
TOKEN=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['token'])" "$LOGIN")
echo "token ok (${#TOKEN} chars)"

echo "=== analyze sample (may take ~60s) ==="
RESULT=$(curl -sf -X POST "$BASE/api/analyze" -F "sample_id=mutual-nda")
AID=$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); print(d['id'])" "$RESULT")
RISK=$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); print(d['verdict']['risk_score'])" "$RESULT")
echo "analysis id=$AID risk=$RISK"

echo "=== save to dashboard ==="
curl -sf -X POST "$BASE/api/analyses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"analysis_id\":\"$AID\"}" | python3 -c "import json,sys; print('saved', json.load(sys.stdin).get('id'))"

echo "=== list analyses ==="
curl -sf "$BASE/api/analyses" -H "Authorization: Bearer $TOKEN" | python3 -c "import json,sys; print('count', len(json.load(sys.stdin)))"

echo "ALL API SMOKE OK"
