#!/usr/bin/env bash
set -euo pipefail
echo "🚀  Building Docker image …"
docker build -t synapse-app:dev .
echo "🚀  Deploying to local staging …"
docker run -d --rm -p 8000:8000 --name synapse-stage synapse-app:dev
