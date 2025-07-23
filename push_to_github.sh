#!/bin/bash

REPO_NAME="synapseconnect-tao"
REPO_DIR="SynapseConnect_TAO_MetaLoop_Extended"

echo "🔧 Cloning working directory..."
unzip -o SynapseConnect_TAO_MetaLoop_Extended.zip -d .

cd "$REPO_DIR"

echo "🧱 Initializing Git repo..."
git init
git add .
git commit -m "init: self-iterating TAO loop with meta-feedback and coverage reports"

echo "🌐 Creating GitHub repo..."
gh repo create "$REPO_NAME" --public --source=. --remote=origin --confirm

echo "🚀 Pushing to GitHub..."
git push -u origin main

echo "✅ Done. View repo at: https://github.com/$(gh api user --jq .login)/$REPO_NAME"
