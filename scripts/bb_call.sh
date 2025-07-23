#!/usr/bin/env bash
# bb_call.sh — Blackbox API wrapper with arg guard & JSON mode
set -euo pipefail
: "${BLACKBOX_API_KEY?Need BLACKBOX_API_KEY}"

# ---- Positional‑parameter check ------------------------------------------
if [[ "$#" -ne 2 ]]; then
  echo "Usage: $(basename "$0") SYSTEM_PROMPT_FILE USER_PROMPT_FILE" >&2
  exit 2
fi

sys_file="$1"
user_file="$2"

# --------------------------------------------------------------------------
BBOX_MODEL="${BB_MODEL:-blackbox/bbx-v1}"
ENDPOINT="${BB_ENDPOINT:-https://api.blackbox.ai/v1/chat/completions}"

sys_prompt=$(cat "$sys_file")
usr_prompt=$(cat "$user_file")

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
  echo "❌  Blackbox API error $code:" >&2
  echo "$body" | jq . >&2
  exit 1
fi

echo "$body"
