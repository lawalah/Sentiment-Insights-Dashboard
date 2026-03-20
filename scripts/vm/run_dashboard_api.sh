#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/sentiment_project}"
PORT="${PORT:-3000}"

cd "$PROJECT_DIR/dashboard"

# Next.js requires a production build before `npm run start`
if [[ ! -d ".next" ]]; then
  echo "⏳ No .next build found — running npm run build first..."
  npm run build
fi

exec npm run start -- --hostname 0.0.0.0 --port "$PORT"
