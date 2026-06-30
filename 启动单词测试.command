#!/bin/bash

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR" || exit 1

PORT="${PORT:-8765}"
URL="http://localhost:${PORT}"
ENV_FILE="$APP_DIR/.env.local"
LOG_FILE="/tmp/word-test-app.log"
PID_FILE="/tmp/word-test-app.pid"

show_dialog() {
  osascript -e "display dialog \"$1\" buttons {\"确定\"} default button \"确定\"" >/dev/null 2>&1 || true
}

if ! command -v node >/dev/null 2>&1; then
  show_dialog "没有检测到 Node.js。请先安装 Node.js，然后再双击启动。"
  open "https://nodejs.org/"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  show_dialog "没有检测到 npm。请重新安装 Node.js 后再启动。"
  open "https://nodejs.org/"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<'EOF'
# 本文件只保存在本机，不要上传到 GitHub。
DEEPSEEK_API_KEY=""
DEEPSEEK_MODEL="deepseek-chat"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
EOF
  open -a TextEdit "$ENV_FILE"
  show_dialog "已创建 .env.local。请把 DEEPSEEK_API_KEY 填进去并保存。没填也可以启动，AI 失败时会自动使用网站模型题。"
fi

set -a
source "$ENV_FILE"
set +a

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  open "$URL"
  osascript -e "display notification \"单词测试已经在运行，已打开浏览器。\" with title \"单词测试\"" >/dev/null 2>&1 || true
  exit 0
fi

if [ ! -d "$APP_DIR/node_modules" ]; then
  npm install >> "$LOG_FILE" 2>&1
fi

export PORT
export HOST="0.0.0.0"
nohup npm start >> "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

sleep 2
open "$URL"
osascript -e "display notification \"已启动并打开浏览器。\" with title \"单词测试\"" >/dev/null 2>&1 || true
