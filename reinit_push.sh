#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# reinit_push.sh
# ---------------------------------------------------------------------------
# Re‑initialises the current directory as a fresh Git repository,
# commits all tracked files (excluding those in .gitignore),
# adds a remote called "origin", and force‑pushes to it.
#
# Usage:
#   ./reinit_push.sh <remote-git-url>
#
# Example:
#   ./reinit_push.sh https://github.com/USER/my-synapse-tao.git
#
# Safety:
#   • The script removes any existing .git directory first.
#   • It sets the branch to 'main'. Modify BRANCH variable if needed.
# ---------------------------------------------------------------------------
set -euo pipefail

REMOTE_URL="${1:-}"
BRANCH="main"

if [[ -z "$REMOTE_URL" ]]; then
  echo "Usage: $(basename "$0") <remote-git-url>"
  exit 1
fi

if [[ -d .git ]]; then
  echo "⚠️  Existing .git directory found; removing for clean init."
  rm -rf .git
fi

echo "🚀  Initialising new Git repository…"
git init

echo "📑  Staging all files (honouring .gitignore)…"
git add .

echo "📝  Creating initial commit…"
git commit -m "Clean initial commit"

echo "🔗  Adding remote origin: $REMOTE_URL"
git remote add origin "$REMOTE_URL"

echo "🌳  Setting default branch: $BRANCH"
git branch -M "$BRANCH"

echo "⤴️   Pushing to remote (force push)…"
git push -u origin "$BRANCH" --force

echo "✅  Repository re‑initialised and pushed."
