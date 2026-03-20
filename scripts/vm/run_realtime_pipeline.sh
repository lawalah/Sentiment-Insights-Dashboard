#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/sentiment_project}"
PYTHON_BIN="${PYTHON_BIN:-/usr/bin/python3}"

cd "$PROJECT_DIR"

mkdir -p logs dashboard/public/realtime

exec "$PYTHON_BIN" realtime_pipeline.py \
  --csv mae_results.csv \
  --output dashboard/public/realtime/data_latest.json \
  --health-file dashboard/public/realtime/pipeline_health.json \
  --interval 60 \
  --max-new 20 \
  --max-scrolls 8 \
  --max-age-hours 24 \
  --browser-mode attach \
  --debugger-address 127.0.0.1:9222
