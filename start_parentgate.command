#!/bin/zsh

cd "/Users/rachel/Documents/我 iPad 上的文件/软件与项目/项目文件/parentgate 消息" || exit 1

PID_FILE=".parentgate-dev.pid"
LOG_FILE=".parentgate-dev.log"

if [ ! -d "node_modules" ]; then
  /usr/local/bin/npm install || exit 1
fi

if [ -f "$PID_FILE" ]; then
  existing_pid=$(cat "$PID_FILE")
  if kill -0 "$existing_pid" 2>/dev/null; then
    open "http://localhost:5173/"
    exit 0
  else
    rm -f "$PID_FILE"
  fi
fi

nohup /usr/local/bin/npx vite --open > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

sleep 2
exit 0
