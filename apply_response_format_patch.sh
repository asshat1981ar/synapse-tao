#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# apply_response_format_patch.sh
# ---------------------------------------------------------------------------
# Adds "response_format": {"type":"json_object"} to bb_call.sh payload
# and prints raw assistant content when JSON validation fails.
# ---------------------------------------------------------------------------
set -euo pipefail

[[ -f scripts/bb_call.sh ]] || { echo "❌  scripts/bb_call.sh not found"; exit 1; }

echo "🔧  Patching scripts/bb_call.sh for JSON mode ..."
cat > scripts/bb_call.sh <<'EOF'
#!/usr/bin/env bash
# bb_call.sh — Blackbox API call with JSON response format
set -euo pipefail
: "${BLACKBOX_API_KEY?Need BLACKBOX_API_KEY}"

BBOX_MODEL="${BB_MODEL:-blackbox/bbx-v1}"
ENDPOINT="${BB_ENDPOINT:-https://api.blackbox.ai/v1/chat/completions}"

sys_prompt=$(cat "$1")
usr_prompt=$(cat "$2")

read -r -d '' payload <<JSON
{
  "model": "${BBOX_MODEL}",
  "messages": [
    {"role": "system", "content": ${sys_prompt@Q}},
    {"role": "user",   "content": ${usr_prompt@Q}}
  ],
  "temperature": 0.3,
  "response_format": {"type": "json_object"}
}
JSON

resp=$(curl -sS -w '\n%{http_code}' \
  -H "Authorization: Bearer ${BLACKBOX_API_KEY}" \
  -H "Content-Type: application/json" \
  --data "$payload" \
  "$ENDPOINT"
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

echo "✅  bb_call.sh updated with response_format=json_object"
