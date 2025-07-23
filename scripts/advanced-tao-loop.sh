#!/usr/bin/env bash
# Main loop: THINK ➜ ACT ➜ OBSERVE ➜ FEEDBACK
set -euo pipefail

LOG_FILE="logs/tao-loop.log"
exec &> >(tee -a "$LOG_FILE")

echo "Starting TAO loop..."

# -- THINK ----------------------------------------------------------------
echo "THINK: Planning sprint..."
cat backlog.json | GEMINI_SYSTEM_MD=.gemini/po_system.md \
  gemini --model gemini-flash -p @prompts/plan_sprint.prompt > sprint_plan.json

if [ $? -ne 0 ]; then
  echo "ERROR: Failed to plan sprint."
  exit 1
fi

echo "Sprint planned successfully."

# -- ACT ------------------------------------------------------------------
echo "ACT: Executing tasks..."
for task in $(jq -c '.tasks[]' sprint_plan.json); do
  echo "Executing task: $task"
  GEMINI_SYSTEM_MD=.gemini/dev_system.md \
    gemini agent --yolo --model gemini-flash -p @prompts/dev_task.prompt --json "$task"

  if [ $? -ne 0 ]; then
    echo "ERROR: Failed to execute task: $task"
    # Continue to the next task
  fi
done

echo "All tasks executed."

# -- BUILD & DEPLOY -------------------------------------------------------
echo "BUILD & DEPLOY: Building and deploying application..."
bash scripts/build_deploy.sh

if [ $? -ne 0 ]; then
  echo "ERROR: Failed to build and deploy application."
  exit 1
fi

echo "Application built and deployed successfully."

# -- OBSERVE --------------------------------------------------------------
echo "OBSERVE: Reviewing QA..."
cat sprint_plan.json | GEMINI_SYSTEM_MD=.gemini/qa_system.md \
  gemini --model gemini-flash -p @prompts/qa_review.prompt \
  > qa_report.json

if [ $? -ne 0 ]; then
  echo "ERROR: Failed to review QA."
  exit 1
fi

echo "QA reviewed successfully."

# -- FEEDBACK -------------------------------------------------------------
echo "FEEDBACK: Updating backlog..."
cat qa_report.json | gemini --model gemini-flash -p @prompts/feedback.prompt \
  > backlog.json

if [ $? -ne 0 ]; then
  echo "ERROR: Failed to update backlog."
  exit 1
fi

echo "Backlog updated successfully."
echo "TAO loop completed successfully."
