#!/bin/zsh

cd "/Users/rachel/Documents/我 iPad 上的文件/软件与项目/项目文件/parentgate 消息" || exit 1

PID_FILE=".parentgate-dev.pid"

if [ -f "$PID_FILE" ]; then
  pid=$(cat "$PID_FILE")
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    echo "ParentGate dev server stopped (PID: $pid)"
  fi
  rm -f "$PID_FILE"
else
  echo "No running server found"
fi

exit 0
