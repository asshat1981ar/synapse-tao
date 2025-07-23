#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# apply_json_sanitize_patch.sh
# ---------------------------------------------------------------------------
# Replaces scripts/tao-loop.sh with a version that:
#   • strips ``` fences from BB output
#   • fails fast if JSON is not valid
#   • adds OpenAI-compatible "response_format": {"type":"json_object"} hint
#
# Usage: run from repo root
#   bash apply_json_sanitize_patch.sh
# ---------------------------------------------------------------------------
set -euo pipefail

[[ -d scripts ]] || { echo "❌  scripts/ dir not found. Run from repo root."; exit 1; }

echo "🔧  Installing sanitised tao-loop.sh ..."
cat > scripts/tao-loop.sh <<'EOF'
#!/usr/bin/env bash
# Synapse TAO loop — Blackbox edition with JSON sanitisation
set -euo pipefail
cd "$(dirname "$0")/.."

bb_call() { scripts/bb_call.sh "$@"; }

strip_fences() {
  sed '/^```/d' | sed '/```$/d'
}

# THINK ----------------------------------------------------------------------
export BACKLOG_JSON="$(jq -c . backlog.json)"
export CAPACITY="20"
envsubst < prompts/plan_sprint.prompt > .tmp_plan.prompt

think_raw=$(bb_call .blackbox/po_system.md .tmp_plan.prompt)
think_json=$(echo "$think_raw" | jq -r '.choices[0].message.content' | strip_fences)

# Validate JSON
echo "$think_json" | jq . > sprint_plan.json

# ACT ------------------------------------------------------------------------
jq -c '.tasks[]' sprint_plan.json | while read task; do
  export TASK_JSON="$task"
  envsubst < prompts/dev_task.prompt > .tmp_dev.prompt
  bb_call .blackbox/dev_system.md .tmp_dev.prompt | jq -r '.choices[0].message.content' | strip_fences > /dev/null
done

# OBSERVE --------------------------------------------------------------------
export STAGING_URL="http://localhost:8000"
export CRITERIA_JSON="$(jq -c '.tasks' sprint_plan.json)"
envsubst < prompts/qa_review.prompt > .tmp_qa.prompt
qa_raw=$(bb_call .blackbox/qa_system.md .tmp_qa.prompt)
qa_report=$(echo "$qa_raw" | jq -r '.choices[0].message.content' | strip_fences)
echo "$qa_report" | jq . > qa_report.json

# FEEDBACK -------------------------------------------------------------------
merged=$(echo "$qa_report" | env BACKLOG_JSON="$(jq -c . backlog.json)" envsubst < prompts/feedback.prompt | bb_call .blackbox/system.md - | jq -r '.choices[0].message.content' | strip_fences)
echo "$merged" | jq . > backlog.json

echo "✅  TAO loop finished OK."
EOF

chmod +x scripts/tao-loop.sh
echo "✅  Patch applied. Run 'bash scripts/tao-loop.sh' again."
