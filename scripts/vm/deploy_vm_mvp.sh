#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/sentiment_project}"
SERVICE_DIR="${SERVICE_DIR:-/etc/systemd/system}"

if [[ ! -d "$PROJECT_DIR" ]]; then
  echo "❌ Project dir not found: $PROJECT_DIR"
  exit 1
fi

echo "📦 Installing Python dependencies..."
pip3 install --quiet --break-system-packages selenium transformers torch pandas 2>/dev/null || \
pip3 install --quiet selenium transformers torch pandas

echo "📦 Installing Node.js dependencies..."
cd "$PROJECT_DIR/dashboard"
npm install --production
npm run build
cd "$PROJECT_DIR"

echo "📂 Creating log and data directories..."
mkdir -p "$PROJECT_DIR/logs" "$PROJECT_DIR/dashboard/public/realtime"

echo "🔧 Installing systemd services..."
chmod +x "$PROJECT_DIR/scripts/vm/run_realtime_pipeline.sh"
chmod +x "$PROJECT_DIR/scripts/vm/run_dashboard_api.sh"

sudo install -m 644 "$PROJECT_DIR/scripts/vm/sentiment-pipeline.service" "$SERVICE_DIR/sentiment-pipeline.service"
sudo install -m 644 "$PROJECT_DIR/scripts/vm/sentiment-dashboard.service" "$SERVICE_DIR/sentiment-dashboard.service"

sudo systemctl daemon-reload
sudo systemctl enable sentiment-pipeline.service sentiment-dashboard.service
sudo systemctl restart sentiment-pipeline.service sentiment-dashboard.service

echo ""
echo "✅ Deployment complete. Check status:"
echo "  systemctl status sentiment-pipeline.service --no-pager"
echo "  systemctl status sentiment-dashboard.service --no-pager"
echo "  tail -f $PROJECT_DIR/logs/realtime_pipeline.out.log"
