#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# apply_blackbox_patches.sh
# ---------------------------------------------------------------------------
# Applies Patch A (template variable fixes) and Patch B (hardened bb_call.sh)
# to an existing Synapse‑Blackbox scaffold.
#
# Run from the REPO ROOT:
#   bash apply_blackbox_patches.sh
# ---------------------------------------------------------------------------
set -euo pipefail

# Ensure we are in repo root (contains prompts/ and scripts/)
for dir in prompts scripts .blackbox; do
  [[ -d $dir ]] || { echo "❌  Run this script from the repo root (missing $dir/)"; exit 1; }
done

echo "📝  Updating prompt templates ..."
cat > prompts/plan_sprint.prompt <<'EOF'
```json
$BACKLOG_JSON
```
Plan the next sprint for capacity **$CAPACITY** story‑points.

Return **ONLY** valid JSON:
{
  "sprint": <int>,
  "tasks": [
    {"id": <int>, "title": <string>, "points": <int>}
  ]
}
EOF

cat > prompts/dev_task.prompt <<'EOF'
Generate code for this task in $REPO:

```json
$TASK_JSON
```

Return a *unified diff* (`diff --git`) and include unit tests.
EOF

cat > prompts/qa_review.prompt <<'EOF'
Run QA on staging URL **$STAGING_URL**

Acceptance criteria:

```json
$CRITERIA_JSON
```

Return **ONLY** valid JSON:
{
  "score": <float>,
  "pass": <bool>,
  "bugs": [{"title": "...", "detail": "..."}],
  "suggestions": ["..."]
}
EOF

echo "🔒  Replacing scripts/bb_call.sh ..."
cat > scripts/bb_call.sh <<'EOF'
#!/usr/bin/env bash
# bb_call.sh — hardened wrapper for Blackbox AI chat completions.
# Usage: bb_call.sh SYSTEM_PROMPT_FILE USER_PROMPT_FILE
set -euo pipefail
: "${BLACKBOX_API_KEY?Need BLACKBOX_API_KEY}"

BBOX_MODEL="${BB_MODEL:-blackbox/bbx-v1}"
ENDPOINT="${BB_ENDPOINT:-https://api.blackbox.ai/v1/chat/completions}"

sys_prompt=$(cat "$1")
usr_prompt=$(cat "$2")

resp=$(curl -sS -w '\n%{http_code}' \
  -H "Authorization: Bearer ${BLACKBOX_API_KEY}" \
  -H "Content-Type: application/json" \
  --data @- "$ENDPOINT" <<JSON
{
  "model": "${BBOX_MODEL}",
  "messages": [
    {"role": "system", "content": ${sys_prompt@Q}},
    {"role": "user",   "content": ${usr_prompt@Q}}
  ],
  "temperature": 0.3
}
JSON
)

body=$(echo "$resp" | head -n -1)
code=$(echo "$resp" | tail -n1)

if [[ "$code" != "200" ]]; then
  echo "❌  Blackbox API error $code:"
  echo "$body" | jq .
  exit 1
fi

echo "$body"
EOF
chmod +x scripts/bb_call.sh

echo "✅  Patches applied. Run 'bash scripts/tao-loop.sh' to test."
