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
