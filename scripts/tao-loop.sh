#!/usr/bin/env bash
# TAO loop using OpenAI Chat API
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  source .env
fi

oa_call() { scripts/oa_call.sh "$@"; }

strip_md_fences() { sed '/^```/d'; }

# THINK -----------------------------------------------------------------
export BACKLOG_JSON="$(jq -c . backlog.json)"
export CAPACITY="20"
envsubst < prompts/plan_sprint.prompt > .tmp_plan.prompt

think_raw=$(oa_call .openai/po_system.md .tmp_plan.prompt)
think_json=$(echo "$think_raw" | jq -r '.choices[0].message.content' | strip_md_fences)
if [ -z "$think_json" ]; then
  echo "❌  Error: OpenAI did not return a sprint plan." >&2
  echo "$think_raw" >&2
  exit 1
fi
echo "$think_json" | jq . > sprint_plan.json

# ACT -------------------------------------------------------------------
jq -c '.tasks[]' sprint_plan.json | while read task; do
  export TASK_JSON="$task"
  envsubst < prompts/dev_task.prompt > .tmp_dev.prompt
  dev_raw=$(oa_call .openai/dev_system.md .tmp_dev.prompt)
  dev_diff=$(echo "$dev_raw" | jq -r '.choices[0].message.content' | strip_md_fences)

  if [[ -n "$dev_diff" ]]; then
    echo "$dev_diff" > .tmp_dev_diff.patch
    git reset --hard # Ensure a clean working directory
    if git apply .tmp_dev_diff.patch; then
      echo "✅ Applied patch for task: $(echo "$task" | jq -r '.title')"
      git add .
      git commit -m "feat: $(echo "$task" | jq -r '.title')"
    else
      echo "❌ Failed to apply patch for task: $(echo "$task" | jq -r '.title')" >&2
      echo "$dev_diff" > "failed_patch_$(echo "$task" | jq -r '.id').patch"
      echo "Patch saved to failed_patch_$(echo "$task" | jq -r '.id').patch for manual review." >&2
      exit 1 # Exit immediately on patch application failure
    fi
    rm .tmp_dev_diff.patch
  else
    echo "⚠️ No diff generated for task: $(echo "$task" | jq -r '.title')" >&2
  fi
done

# OBSERVE ---------------------------------------------------------------
export STAGING_URL="${STAGING_URL:-http://localhost:8000}"
export CRITERIA_JSON="$(jq -c '.tasks' sprint_plan.json)"
envsubst < prompts/qa_review.prompt > .tmp_qa.prompt
qa_raw=$(oa_call .openai/qa_system.md .tmp_qa.prompt)
qa_report=$(echo "$qa_raw" | jq -r '.choices[0].message.content' | strip_md_fences)
if [ -z "$qa_report" ]; then
  echo "❌  Error: OpenAI did not return a QA report." >&2
  echo "$qa_raw" >&2
  exit 1
fi
echo "$qa_report" | jq . > qa_report.json

# FEEDBACK --------------------------------------------------------------
merged=$(echo "$qa_report" | env BACKLOG_JSON="$(jq -c . backlog.json)" envsubst < prompts/feedback.prompt | oa_call .openai/dev_system.md - | jq -r '.choices[0].message.content' | strip_md_fences)
if [ -z "$merged" ]; then
  echo "❌  Error: OpenAI did not return merged backlog." >&2
  exit 1
fi
echo "$merged" | jq . > backlog.json

echo "✅  TAO loop finished OK."
