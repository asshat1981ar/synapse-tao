\
    #!/usr/bin/env bash
    # =========================================================================
    # auto_fix_tao.sh
    # -------------------------------------------------------------------------
    # A self‑healing helper for the Synapse‑Blackbox TAO loop.
    #
    # It runs `scripts/tao-loop.sh`, captures errors, applies known patches
    # automatically, and retries (up to 3 attempts).
    #
    # Supported automatic fixes:
    #   • Patch prompt templates to use $VAR placeholders
    #   • Harden scripts/bb_call.sh (response_format=json_object + arg guard)
    #   • Add strip‑fences & JSON validation to scripts/tao-loop.sh
    #
    # Usage:
    #   chmod +x auto_fix_tao.sh
    #   ./auto_fix_tao.sh
    # =========================================================================
    set -euo pipefail

    # ---------- helpers -------------------------------------------------------
    log="_tao_run.log"

    say() { printf "\e[34m%s\e[0m\n" "$*"; }  # blue info
    warn() { printf "\e[33m%s\e[0m\n" "$*"; } # yellow warn
    err() { printf "\e[31m%s\e[0m\n" "$*"; }  # red error

    need_repo_structure() {
      for d in prompts scripts .blackbox; do
        [[ -d $d ]] || { err "Missing $d/. Run from repo root."; exit 1; }
      done
    }

    patch_prompt_vars() {
      say "⚙️  Patching prompt templates to \$VAR syntax …"
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
    }

    patch_bb_call() {
      say "⚙️  Patching scripts/bb_call.sh …"
      cat > scripts/bb_call.sh <<'EOF'
    #!/usr/bin/env bash
    # bb_call.sh — Blackbox API wrapper with safeguards
    set -euo pipefail
    : "${BLACKBOX_API_KEY?Need BLACKBOX_API_KEY}"

    if [[ $# -ne 2 ]]; then
      echo "Usage: $(basename "$0") SYSTEM_PROMPT_FILE USER_PROMPT_FILE" >&2
      exit 2
    fi

    sys_file="$1"
    user_file="$2"

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
      "$ENDPOINT")

    body=$(echo "$resp" | head -n -1)
    code=$(echo "$resp" | tail -n1)

    if [[ "$code" != "200" ]]; then
      echo "❌  Blackbox API error $code:" >&2
      echo "$body" | jq . >&2
      exit 1
    fi

    echo "$body"
    EOF
      chmod +x scripts/bb_call.sh
    }

    patch_tao_loop() {
      say "⚙️  Patching scripts/tao-loop.sh …"
      cat > scripts/tao-loop.sh <<'EOF'
    #!/usr/bin/env bash
    # Synapse TAO loop — Blackbox edition with JSON sanitisation
    set -euo pipefail
    cd "$(dirname "$0")/.."

    bb_call() { scripts/bb_call.sh "$@"; }

    strip_fences() {
      sed '/^```/d'
    }

    # THINK ------------------------------------------------------------------
    export BACKLOG_JSON="$(jq -c . backlog.json)"
    export CAPACITY="20"
    envsubst < prompts/plan_sprint.prompt > .tmp_plan.prompt

    think_raw=$(bb_call .blackbox/po_system.md .tmp_plan.prompt)
    think_json=$(echo "$think_raw" | jq -r '.choices[0].message.content' | strip_fences)

    echo "$think_json" | jq . > sprint_plan.json

    # ACT --------------------------------------------------------------------
    jq -c '.tasks[]' sprint_plan.json | while read task; do
      export TASK_JSON="$task"
      envsubst < prompts/dev_task.prompt > .tmp_dev.prompt
      bb_call .blackbox/dev_system.md .tmp_dev.prompt | jq -r '.choices[0].message.content' | strip_fences > /dev/null
    done

    # OBSERVE ---------------------------------------------------------------
    export STAGING_URL="http://localhost:8000"
    export CRITERIA_JSON="$(jq -c '.tasks' sprint_plan.json)"
    envsubst < prompts/qa_review.prompt > .tmp_qa.prompt
    qa_raw=$(bb_call .blackbox/qa_system.md .tmp_qa.prompt)
    qa_report=$(echo "$qa_raw" | jq -r '.choices[0].message.content' | strip_fences)
    echo "$qa_report" | jq . > qa_report.json

    # FEEDBACK --------------------------------------------------------------
    merged=$(echo "$qa_report" | env BACKLOG_JSON="$(jq -c . backlog.json)" envsubst < prompts/feedback.prompt | bb_call .blackbox/system.md - | jq -r '.choices[0].message.content' | strip_fences)
    echo "$merged" | jq . > backlog.json

    echo "✅  TAO loop finished OK."
    EOF
      chmod +x scripts/tao-loop.sh
    }

    # ---------- main loop ----------------------------------------------------
    need_repo_structure

    attempt=1
    max_attempts=3
    while (( attempt <= max_attempts )); do
      say "▶️  Running TAO loop (attempt $attempt/$max_attempts)…"
      if bash scripts/tao-loop.sh 2>&1 | tee "$log"; then
        say "🎉  Success on attempt $attempt"
        exit 0
      fi

      warn "Loop failed — analysing log…"
      if grep -q "BLACKBOX_API_KEY" "$log" ; then
        err "Environment variable BLACKBOX_API_KEY is missing. Export it and re‑run."
        exit 1
      fi

      if grep -q "Cannot iterate over null" "$log"; then
        patch_prompt_vars
        patch_bb_call
        patch_tao_loop
      elif grep -q "Invalid numeric literal" "$log"; then
        patch_tao_loop
      elif grep -q "unbound variable" "$log"; then
        patch_bb_call
      else
        warn "Unknown error pattern; applying all patches just in case."
        patch_prompt_vars
        patch_bb_call
        patch_tao_loop
      fi

      ((attempt++))
    done

    err "❌  TAO loop failed after $max_attempts attempts. See $log for details."
    exit 1
