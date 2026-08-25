#!/usr/bin/env python3
"""manifest.json 의 항목을 전부 떠서 activity/ 에 남긴다."""
import json, pathlib, subprocess, sys, time

HERE = pathlib.Path(__file__).resolve().parent
man = json.loads((HERE / "manifest.json").read_text(encoding="utf-8"))
ids = json.loads((HERE / "story-ids.json").read_text(encoding="utf-8"))

only = sys.argv[1:] or None
t0 = time.time()
for e in man["항목"]:
    if only and e["id"] not in only:
        continue
    r = subprocess.run(
        [sys.executable, str(HERE / "capture.py"), e["id"], ids[e["story"]]],
        capture_output=True, text=True,
    )
    print(r.stdout.strip() or f"  ★ {e['id']} 실패\n{r.stderr[-300:]}", flush=True)
print(f"끝 — {time.time()-t0:.0f}초")
