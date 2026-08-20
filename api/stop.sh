#!/bin/bash
psList=$(ps -ef | grep 'gunicorn' | grep -v 'grep')

echo "process list:"
echo "$psList"
echo ""

# 모든 PID 추출
pids=$(echo "$psList" | awk '{print $2}')

if [ -n "$pids" ]; then
  echo "server pids:"
  echo "$pids"
  echo ""

  # 모든 PID를 하나씩 종료
  for pid in $pids; do
    kill -9 $pid
    echo "Killed PID: $pid"
  done

  echo "========================"
  echo "All gunicorn processes killed."
  echo "========================"
else
  echo "====================="
  echo "No gunicorn process running."
  echo "====================="
fi

echo ""
