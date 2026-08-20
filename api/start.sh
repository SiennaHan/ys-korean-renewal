# nohup python server.py > output.log &
gunicorn -w 4 -k uvicorn.workers.UvicornWorker \
  -b 0.0.0.0:8000 server:app \
	--daemon \
	--timeout 30 \
  --access-logfile logs/access.log \
  --error-logfile logs/error.log \
	--capture-output \
	--log-level debug

echo ""
echo =================
echo Server is started
echo =================
echo ""