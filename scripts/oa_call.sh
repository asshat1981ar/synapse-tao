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

MODEL="${OPENAI_MODEL:-gpt-4o}"
ENDPOINT="https://api.openai.com/v1/chat/completions"

# Create a temporary file for the payload
PAYLOAD_FILE=$(mktemp)

# Construct the JSON payload using jq for robust escaping
jq -n \
  --arg sys_content "$(cat "$sys_file")" \
  --arg user_content "$(cat "$user_file")" \
  --arg model "${MODEL}" \
  '{
    "model": $model,
    "messages": [
      {"role": "system", "content": $sys_content},
      {"role": "user",  "content": $user_content}
    ],
    "temperature": 0.3,
    "response_format": {"type":"json_object"}
  }' > "$PAYLOAD_FILE"

resp=$(curl -sS -w '\n%{http_code}' \
  -H "Authorization: Bearer ${OPENAI_API_KEY}" \
  -H "Content-Type: application/json" \
  --data @"$PAYLOAD_FILE" \
  "$ENDPOINT")

# Clean up the temporary file
rm "$PAYLOAD_FILE"

body=$(echo "$resp" | head -n -1)
code=$(echo "$resp" | tail -n1)

if [[ "$code" != "200" ]]; then
  echo "❌  OpenAI API error $code:" >&2
  echo "$body" | jq . >&2
  exit 1
fi

echo "$body"