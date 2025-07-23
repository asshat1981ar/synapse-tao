#!/usr/bin/env bash
# ----------------------------------------------------------------------
# Synapse AI • Gemini‑CLI TAO loop scaffold
# ----------------------------------------------------------------------
set -euo pipefail

echo "📦  Creating project structure …"
mkdir -p \
  .gemini \
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
cat > .gemini/po_system.md <<'EOF'
<!-- Product Owner system prompt -->
You are the **Product Owner AI** for Synapse. Craft concise, value‑driven
sprint plans using the incoming backlog and capacity limits.
EOF

cat > .gemini/dev_system.md <<'EOF'
<!-- Developer system prompt -->
You are the **Developer AI**. Produce clean, tested, well‑commented code.
Respect input JSON {task:{…}} and output strictly in diff or full‑file form.
EOF

cat > .gemini/qa_system.md <<'EOF'
<!-- QA system prompt -->
You are the **QA & Feedback AI**. Run automated tests, verify acceptance
criteria, tally a QA score (0‑1), list bugs, suggest improvements.
Return a JSON report exactly matching the required schema.
EOF

# Optional global fallback
cat > .gemini/system.md <<'EOF'
<!-- Fallback rules for all agents -->
Always prefer machine‑readable JSON when returning structured data.
EOF

# ----------------------------------------------------------------------
# 3) Gemini prompt templates
# ----------------------------------------------------------------------
cat > prompts/plan_sprint.prompt <<'EOF'
{{ backtick := "```" }}
{{ backtick }}json
{{ .Backlog | toJSON }}
{{ backtick }}
Plan the next sprint for capacity={{ .Capacity }} story‑points.
Return JSON {sprint:int, tasks:[{id:int,title:string,points:int}]}.
EOF

cat > prompts/dev_task.prompt <<'EOF'
Generate code for the following task in {{ .Repo }}:

{{ backtick }}json
{{ .Task | toJSON }}
{{ backtick }}

Return a *unified diff* ready to `patch -p1`. Include unit tests.
EOF

cat > prompts/qa_review.prompt <<'EOF'
Perform QA on staging URL: {{ .StagingURL }}

Acceptance criteria:

{{ backtick }}json
{{ .Criteria | toJSON }}
{{ backtick }}

Return JSON:
{ score:float, pass:bool, bugs:[{title,detail}], suggestions:[string] }
EOF

cat > prompts/feedback.prompt <<'EOF'
Ingest QA report and update backlog accordingly.
Input QA JSON is piped on STDIN.
Output the *merged* backlog.json in full.
EOF

# ----------------------------------------------------------------------
# 4) Orchestration scripts
# ----------------------------------------------------------------------
cat > scripts/tao-loop.sh <<'EOF'
#!/usr/bin/env bash
# Main loop: THINK ➜ ACT ➜ OBSERVE ➜ FEEDBACK
set -euo pipefail

# -- THINK ----------------------------------------------------------------
GEMINI_SYSTEM_MD=.gemini/po_system.md \
  gemini -p @prompts/plan_sprint.prompt \
  --json-file backlog.json > sprint_plan.json

# -- ACT ------------------------------------------------------------------
jq -c '.tasks[]' sprint_plan.json | while read task; do
  GEMINI_SYSTEM_MD=.gemini/dev_system.md \
    gemini agent --yolo -p @prompts/dev_task.prompt --json "$task"
done

# -- OBSERVE --------------------------------------------------------------
GEMINI_SYSTEM_MD=.gemini/qa_system.md \
  gemini -p @prompts/qa_review.prompt --json-file sprint_plan.json \
  > qa_report.json

# -- FEEDBACK -------------------------------------------------------------
gemini -p @prompts/feedback.prompt --json-file qa_report.json \
  > backlog.json
EOF
chmod +x scripts/tao-loop.sh

cat > scripts/build_deploy.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
echo "🚀  Building Docker image …"
docker build -t synapse-app:dev .
echo "🚀  Deploying to local staging …"
docker run -d --rm -p 8000:8000 --name synapse-stage synapse-app:dev
EOF
chmod +x scripts/build_deploy.sh

cat > scripts/update_backlog.py <<'EOF'
#!/usr/bin/env python3
"""
Merge QA feedback into backlog.json (placeholder for advanced logic).
"""
import json, sys, pathlib
qa = json.load(sys.stdin)
backlog = json.loads(pathlib.Path("backlog.json").read_text())

# Example: elevate bugs to top priority
for bug in qa.get("bugs", []):
    backlog["stories"].insert(0, {"title": bug["title"], "points": 1})

pathlib.Path("backlog.json").write_text(json.dumps(backlog, indent=2))
EOF
chmod +x scripts/update_backlog.py

# ----------------------------------------------------------------------
# 5) GitHub Actions workflow
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
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Install Gemini CLI
        run: pip install gemini-cli
      - name: Execute TAO loop
        env:
          # export GEMINI_API_KEY in repo → Settings → Secrets
          MCP_SERVERS: ${{ github.workspace }}/.mcp.json
        run: bash scripts/tao-loop.sh
EOF

# ----------------------------------------------------------------------
echo "✅  Scaffold complete!"
echo
echo "Next steps:"
echo "  1) export GEMINI_API_KEY=<your_key>"
echo "  2) bash scripts/tao-loop.sh   # run locally"
echo "  3) git init && git add . && git commit -m 'Initial Synapse scaffold'"
echo "  4) Push to GitHub and watch the Action kick off."
