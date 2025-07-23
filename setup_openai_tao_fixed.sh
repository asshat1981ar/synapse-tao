#!/usr/bin/env bash
# ----------------------------------------------------------------------
# setup_openai_tao.sh  (fixed EOF delimiters)
# ----------------------------------------------------------------------
# Scaffolds a Synapse AGILE‑SCRUM TAO loop wired to the OpenAI Chat API.
#
# Prerequisites:
#   • bash, curl, jq, envsubst
#   • export OPENAI_API_KEY=<your key>
#
# Usage:
#   chmod +x setup_openai_tao.sh
#   ./setup_openai_tao.sh
# ----------------------------------------------------------------------
set -euo pipefail

echo "📦  Creating project structure …"
mkdir -p \
  .openai \
  prompts \
  scripts \
  .github/workflows

# ----------------------------------------------------------------------
# Core backlog file
# ----------------------------------------------------------------------
cat > backlog.json <<'EOF'
{
  "sprint": 0,
  "stories": []
}
EOF

# ----------------------------------------------------------------------
# Role‑scoped system prompts
# ----------------------------------------------------------------------
cat > .openai/po_system.md <<'EOF'
You are the **Product Owner AI** for Synapse. Craft concise, value‑driven
sprint plans using the incoming backlog and capacity limits.
EOF

cat > .openai/dev_system.md <<'EOF'
You are the **Developer AI**. Produce clean, tested, well‑commented code.
Respect input JSON {task:{…}} and output strictly in diff or full‑file form.
EOF

cat > .openai/qa_system.md <<'EOF'
You are the **QA & Feedback AI**. Run automated tests, verify acceptance
criteria, tally a QA score (0‑1), list bugs, suggest improvements.
Return a JSON report exactly matching the required schema.
EOF

# ----------------------------------------------------------------------
# Prompt templates ($VAR placeholders for envsubst)
# ----------------------------------------------------------------------
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

cat > prompts/feedback.prompt <<'EOF'
Ingest QA report (stdin) and update backlog accordingly.
Return the *merged* backlog.json in full.
EOF

# ----------------------------------------------------------------------
# OpenAI API call wrapper
# ----------------------------------------------------------------------
cat > scripts/oa_call.sh <<'EOF'
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
    {"role": "system", "content": ${sys_prompt@Q}},
    {"role": "user",  "content": ${usr_prompt@Q}}
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
EOF
chmod +x scripts/oa_call.sh

# ----------------------------------------------------------------------
# TAO loop driver
# ----------------------------------------------------------------------
cat > scripts/tao-loop.sh <<'EOF'
#!/usr/bin/env bash
# TAO loop using OpenAI Chat API
set -euo pipefail
cd "$(dirname "$0")/.."

oa_call() { scripts/oa_call.sh "$@"; }

strip_md_fences() { sed '/^```/d'; }

# THINK -----------------------------------------------------------------
export BACKLOG_JSON="$(jq -c . backlog.json)"
export CAPACITY="20"
envsubst < prompts/plan_sprint.prompt > .tmp_plan.prompt

think_raw=$(oa_call .openai/po_system.md .tmp_plan.prompt)
think_json=$(echo "$think_raw" | jq -r '.choices[0].message.content' | strip_md_fences)
echo "$think_json" | jq . > sprint_plan.json

# ACT -------------------------------------------------------------------
jq -c '.tasks[]' sprint_plan.json | while read task; do
  export TASK_JSON="$task"
  envsubst < prompts/dev_task.prompt > .tmp_dev.prompt
  oa_call .openai/dev_system.md .tmp_dev.prompt | jq -r '.choices[0].message.content' | strip_md_fences > /dev/null
done

# OBSERVE ---------------------------------------------------------------
export STAGING_URL="http://localhost:8000"
export CRITERIA_JSON="$(jq -c '.tasks' sprint_plan.json)"
envsubst < prompts/qa_review.prompt > .tmp_qa.prompt
qa_raw=$(oa_call .openai/qa_system.md .tmp_qa.prompt)
qa_report=$(echo "$qa_raw" | jq -r '.choices[0].message.content' | strip_md_fences)
echo "$qa_report" | jq . > qa_report.json

# FEEDBACK --------------------------------------------------------------
merged=$(echo "$qa_report" | env BACKLOG_JSON="$(jq -c . backlog.json)" envsubst < prompts/feedback.prompt | oa_call .openai/dev_system.md - | jq -r '.choices[0].message.content' | strip_md_fences)
echo "$merged" | jq . > backlog.json

echo "✅  TAO loop finished OK."
EOF
chmod +x scripts/tao-loop.sh

# ----------------------------------------------------------------------
# GitHub Actions workflow
# ----------------------------------------------------------------------
cat > .github/workflows/tao-openai.yml <<'EOF'
name: TAO Loop (OpenAI)
on:
  schedule:
    - cron: "0 */6 * * *"
  workflow_dispatch:

jobs:
  run-loop:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install jq + curl
        run: sudo apt-get update && sudo apt-get install -y jq curl
      - name: Run TAO loop
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: bash scripts/tao-loop.sh
EOF

# ----------------------------------------------------------------------
echo "✅  OpenAI scaffold complete."
echo
echo "Next steps:"
echo "  1) export OPENAI_API_KEY=<your_key>"
echo "  2) bash scripts/tao-loop.sh   # run locally"
echo "  3) git init && git add . && git commit -m 'Initial OpenAI TAO scaffold'"
echo "  4) Push to GitHub and set OPENAI_API_KEY secret to enable CI."
