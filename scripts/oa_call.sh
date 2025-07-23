#!/usr/bin/env bash
# oa_call.sh — OpenAI ChatCompletion wrapper
set -euo pipefail
: "${OPENAI_API_KEY?Need OPENAI_API_KEY}"

if [[ $# -ne 2 ]]; then
  echo "Usage: $(basename "$0") SYSTEM_PROMPT_FILE USER_PROMPT_FILE" >&2
  exit 2
fi

sys_file="$1"
user_file="$2"

MODEL="${OPENAI_MODEL:-gpt-4o-mini}"
ENDPOINT="https://api.openai.com/v1/chat/completions"

sys_prompt=$(cat "$sys_file")
usr_prompt=$(cat "$user_file")

read -r -d '' payload <<JSON
{
  "model": "${MODEL}",
  "messages": [
    {"role": "system", "content": $(cat "$sys_file" | jq -Rs .)},
    {"role": "user",  "content": $(cat "$user_file" | jq -Rs .)}
  ],
  "temperature": 0.3,
  "response_format": {"type":"json_object"}
}
JSON

resp=$(curl -sS -w '\n%{http_code}' \
  -H "Authorization: Bearer ${OPENAI_API_KEY}" \
  -H "Content-Type: application/json" \
  --data "$payload" \
  "$ENDPOINT")

body=$(echo "$resp" | head -n -1)
code=$(echo "$resp" | tail -n1)

if [[ "$code" != "200" ]]; then
  echo "❌  OpenAI API error $code:" >&2
  echo "$body" | jq . >&2
  exit 1
fi

echo "$body"
