#!/bin/bash

PORT="${PORT:-8765}"
PID_FILE="/tmp/word-test-app.pid"

show_dialog() {
  osascript -e "display dialog \"$1\" buttons {\"确定\"} default button \"确定\"" >/dev/null 2>&1 || true
}

if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE")"
  if kill "$PID" >/dev/null 2>&1; then
    rm -f "$PID_FILE"
    show_dialog "单词测试服务已停止。"
    exit 0
  fi
fi

PIDS="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null)"
if [ -n "$PIDS" ]; then
  kill $PIDS >/dev/null 2>&1
  rm -f "$PID_FILE"
  show_dialog "单词测试服务已停止。"
  exit 0
fi

show_dialog "当前没有检测到正在运行的单词测试服务。"
