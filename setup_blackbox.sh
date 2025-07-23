#!/usr/bin/env bash
# ----------------------------------------------------------------------
# Synapse AI • BLACKBOX.AI TAO loop scaffold
# ----------------------------------------------------------------------
# ✨ This script bootstraps a self‑optimising AGILE‑SCRUM TAO loop that
#    talks to BLACKBOX.AI's OpenAI‑compatible Chat API.
#
# Prerequisites:
#   • curl & jq
#   • git (if you want the GitHub Action)
#   • export BLACKBOX_API_KEY=<your key>               # done manually
#   • Optional: export BB_MODEL="blackbox/bbx-v1"    # override default
#
# Usage:
#   chmod +x setup_blackbox.sh
#   ./setup_blackbox.sh
#
# The script creates:
#   .blackbox/        → role‑scoped system prompts
#   prompts/          → user prompt templates
#   scripts/          → TAO loop driver + helpers
#   .github/workflows/→ CI cron workflow
#   backlog.json      → single source of truth
# ----------------------------------------------------------------------

set -euo pipefail

echo "📦  Creating project structure …"
mkdir -p \
  .blackbox \
  prompts \
  scripts \
  .github/workflows

# ----------------------------------------------------------------------
# 1) Core data file
# ----------------------------------------------------------------------
cat > backlog.json <<'EOF'
{
  "sprint": 0,
  "stories": []
}
EOF

# ----------------------------------------------------------------------
# 2) Role‑scoped system prompts
# ----------------------------------------------------------------------
cat > .blackbox/po_system.md <<'EOF'
You are the **Product Owner AI** for Synapse. Craft concise, value‑driven
sprint plans using the incoming backlog and capacity limits.
EOF

cat > .blackbox/dev_system.md <<'EOF'
You are the **Developer AI**. Produce clean, tested, well‑commented code.
Respect input JSON {task:{…}} and output strictly in diff or full‑file form.
EOF

cat > .blackbox/qa_system.md <<'EOF'
You are the **QA & Feedback AI**. Run automated tests, verify acceptance
criteria, tally a QA score (0‑1), list bugs, suggest improvements.
Return a JSON report exactly matching the required schema.
EOF

# Optional global fallback
cat > .blackbox/system.md <<'EOF'
Always prefer machine‑readable JSON when returning structured data.
EOF

# ----------------------------------------------------------------------
# 3) Prompt templates (Go‑tmpl style placeholders for envsubst)
# ----------------------------------------------------------------------
cat > prompts/plan_sprint.prompt <<'EOF'
```json
{{BACKLOG_JSON}}
```
Plan the next sprint for capacity={{CAPACITY}} story‑points.
Return JSON: {"sprint":int, "tasks":[{"id":int,"title":string,"points":int}]}.
EOF

cat > prompts/dev_task.prompt <<'EOF'
Generate code for the following task in {{REPO}}:

```json
{{TASK_JSON}}
```
Return a *unified diff* ready to `patch -p1`. Include unit tests.
EOF

cat > prompts/qa_review.prompt <<'EOF'
Perform QA on staging URL: {{STAGING_URL}}

Acceptance criteria:

```json
{{CRITERIA_JSON}}
```
Return JSON:
{"score":float, "pass":bool, "bugs":[{"title","detail"}], "suggestions":[string]}
EOF

cat > prompts/feedback.prompt <<'EOF'
Ingest QA report (stdin) and update backlog accordingly.
Return the *merged* backlog.json in full.
EOF

# ----------------------------------------------------------------------
# 4) Helper: shell function to call BLACKBOX Chat API
# ----------------------------------------------------------------------
cat > scripts/bb_call.sh <<'EOF'
#!/usr/bin/env bash
#
# bb_call.sh   — lightweight wrapper around BLACKBOX.AI chat endpoint
# Usage: bb_call.sh SYSTEM_PROMPT USER_PROMPT
#
set -euo pipefail

: "${BLACKBOX_API_KEY?Need to export BLACKBOX_API_KEY}"
BBOX_MODEL="${BB_MODEL:-blackbox/bbx-v1}"
ENDPOINT="${BB_ENDPOINT:-https://api.blackbox.ai/v1/chat/completions}"

system_prompt=$(cat "$1")
user_prompt=$(cat "$2")

response=$(curl -sS "$ENDPOINT" \
  -H "Authorization: Bearer ${BLACKBOX_API_KEY}" \
  -H "Content-Type: application/json" \
  --data @- <<JSON
{
  "model": "${BBOX_MODEL}",
  "messages": [
    {"role": "system", "content": "${system_prompt}"},
    {"role": "user",   "content": "${user_prompt}"}
  ],
  "temperature": 0.3
}
JSON
)

echo "$response"
EOF
chmod +x scripts/bb_call.sh

# ----------------------------------------------------------------------
# 5) Orchestration scripts
# ----------------------------------------------------------------------
cat > scripts/tao-loop.sh <<'EOF'
#!/usr/bin/env bash
# Main loop: THINK ➜ ACT ➜ OBSERVE ➜ FEEDBACK  via BLACKBOX.AI
set -euo pipefail
cd "$(dirname "$0")/.."

function ask_bb() {
  local system_file="$1" prompt_file="$2"
  scripts/bb_call.sh "$system_file" "$prompt_file"
}

# -- THINK ----------------------------------------------------------------
# Build user prompt by substituting variables
export BACKLOG_JSON="$(cat backlog.json | jq -c .)"
export CAPACITY="20"
envsubst < prompts/plan_sprint.prompt > .tmp_plan.prompt
think_json=$(ask_bb .blackbox/po_system.md .tmp_plan.prompt | jq -r '.choices[0].message.content')
echo "$think_json" | tee sprint_plan.json

# -- ACT ------------------------------------------------------------------
jq -c '.tasks[]' sprint_plan.json | while read task; do
  export TASK_JSON="$task"
  envsubst < prompts/dev_task.prompt > .tmp_dev.prompt
  ask_bb .blackbox/dev_system.md .tmp_dev.prompt | jq -r '.choices[0].message.content' > /dev/null
done

# -- OBSERVE --------------------------------------------------------------
export STAGING_URL="http://localhost:8000"   # placeholder
export CRITERIA_JSON="$(jq -c '.tasks' sprint_plan.json)"
envsubst < prompts/qa_review.prompt > .tmp_qa.prompt
qa_report=$(ask_bb .blackbox/qa_system.md .tmp_qa.prompt | jq -r '.choices[0].message.content')
echo "$qa_report" | jq . > qa_report.json

# -- FEEDBACK -------------------------------------------------------------
echo "$qa_report" | env BACKLOG_JSON="$(cat backlog.json | jq -c .)" envsubst < prompts/feedback.prompt > .tmp_fb.prompt
merged=$(scripts/bb_call.sh .blackbox/system.md .tmp_fb.prompt | jq -r '.choices[0].message.content')

echo "$merged" | jq . > backlog.json
EOF
chmod +x scripts/tao-loop.sh

# ----------------------------------------------------------------------
# 6) GitHub Actions workflow
# ----------------------------------------------------------------------
cat > .github/workflows/tao-loop.yml <<'EOF'
name: TAO Loop CI
on:
  schedule:
    - cron: "0 */6 * * *"
  workflow_dispatch:

jobs:
  run-loop:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: sudo apt-get update && sudo apt-get install -y jq curl
      - name: Execute TAO loop
        env:
          BLACKBOX_API_KEY: ${{ secrets.BLACKBOX_API_KEY }}
        run: bash scripts/tao-loop.sh
EOF

# ----------------------------------------------------------------------
echo "✅  Blackbox scaffold complete!"
echo
echo "Next steps:"
echo "  1) export BLACKBOX_API_KEY=<your_key>"
echo "  2) bash scripts/tao-loop.sh   # run locally"
echo "  3) git init && git add . && git commit -m 'Initial Synapse scaffold (Blackbox)' "
echo "  4) Push to GitHub and watch the Action kick off."
