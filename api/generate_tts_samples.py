"""
v70 음성 재생성 — tts-regen-samples.json 의 문제 지문들을 백엔드 API 로 생성해
프로덕션 캐시(S3 + ko_tts_cache)를 갱신하는 스크립트.

런타임 API 를 호출하므로 로컬에서 --base-url 만 프로덕션으로 주면 된다.
전제: 아래 두 런타임 변경이 배포되어 있어야 한다.
  - 긴 라인 자동 청크 생성·조립 (xternal/gemini.py: TTS_CHUNK_MAX_CHARS)
  - /tts/listen/audio 의 force 필드 (불량 캐시 덮어쓰기 재생성)

프로덕션 런타임과 '동일한 요청 형태'로 호출해야 캐시 해시 키가 일치한다:
  - 지문(script) 의 라인들을 seq 순으로 {text, speaker, voice} 배열로 만들어
    POST /tts/listen/audio {lines, force:true} — voice 는 화자 slot 으로 결정되므로
    반드시 지문 전체 컨텍스트로 보내야 런타임과 키가 같다.

인증은 게스트 토큰(/user/sign/guest)으로 충분하다(/tts/* 는 role 없이 JWT 만 요구).

사용법 (backend/koreanapi 에서):
    # 로컬 검증
    python generate_tts_samples.py --base-url http://localhost:8000 --scripts 352
    # 프로덕션 반영 (전체, 캐시 덮어쓰기)
    python generate_tts_samples.py --base-url https://koreanapi-live.pulleyai.co.kr
    # 미전송 확인
    python generate_tts_samples.py --base-url ... --dry-run
"""

import argparse
import json
import os
import sys
import time

import requests

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SAMPLES_JSON = os.path.join(
    ROOT, "frontend", "korean", "src", "routes", "test", "tts-regen-samples.json"
)
LINE_JSON = os.path.join(
    ROOT, "frontend", "korean", "src", "shared", "data", "n3_listen_script_line.json"
)


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def script_lines(by_script, script_id):
    """production getScriptLines 와 동일: script_id 라인들을 seq 순으로 {text,speaker,voice}."""
    rows = sorted(by_script[script_id], key=lambda x: x["seq"])
    return [
        {"text": r["text"], "speaker": r["speaker"], "voice": r["voice"]} for r in rows
    ]


def target_scripts(samples, line_by_id):
    """샘플 → 대상 지문 id 집합. 라인/청크 항목은 소속 지문으로 귀속시킨다.

    (id 가 라인 데이터에 없으면 청크 항목의 합성 id(라인id*100+i)로 간주 — 서버가
    이제 긴 라인을 자동 분할하므로 청크는 지문 단위 생성에 흡수된다)
    """
    scripts = set()
    for s in samples:
        if s["sheet"] == "n3_listen_script":
            scripts.add(s["id"])
        elif s["sheet"] == "n3_listen_script_line":
            line_id = s["id"] if s["id"] in line_by_id else s["id"] // 100
            if line_id not in line_by_id:
                sys.exit(f"샘플 id {s['id']}: 라인 데이터에서 못 찾음")
            scripts.add(line_by_id[line_id]["script_id"])
    return scripts


def guest_token(base_url):
    r = requests.post(f"{base_url}/user/sign/guest", json={"guestId": None}, timeout=30)
    r.raise_for_status()
    data = r.json()
    if not data.get("result") or not data.get("data", {}).get("token"):
        raise RuntimeError(f"게스트 토큰 발급 실패: {data}")
    return data["data"]["token"]


def post_listen(base_url, token, lines, force):
    r = requests.post(
        f"{base_url}/tts/listen/audio",
        json={"lines": lines, "force": force},
        headers={"Authorization": f"Bearer {token}"},
        # 긴 나레이션은 서버가 청크(최대 9개)를 순차 생성하므로 넉넉히
        timeout=600,
    )
    r.raise_for_status()
    data = r.json()
    if not data.get("result"):
        raise RuntimeError(f"응답 result=False: {data}")
    return data["data"]


def main():
    ap = argparse.ArgumentParser(description="v70 음성 재생성 (런타임 API 호출)")
    ap.add_argument("--base-url", required=True, help="예: https://koreanapi-live.pulleyai.co.kr")
    ap.add_argument("--scripts", default=None, help="지문 id 필터, 예: 352,354")
    ap.add_argument("--dry-run", action="store_true", help="전송 없이 대상만 출력")
    ap.add_argument("--no-force", action="store_true", help="캐시 덮어쓰기 없이 미스만 생성")
    ap.add_argument("--sleep", type=float, default=0.5, help="지문 간 대기(초)")
    ap.add_argument("--samples-file", default=SAMPLES_JSON, help="tts-regen-samples.json 경로")
    ap.add_argument("--lines-file", default=LINE_JSON, help="n3_listen_script_line.json 경로")
    args = ap.parse_args()

    samples = load_json(args.samples_file)
    all_lines = load_json(args.lines_file)
    line_by_id = {l["id"]: l for l in all_lines}
    by_script = {}
    for ln in all_lines:
        by_script.setdefault(ln["script_id"], []).append(ln)

    scripts = sorted(target_scripts(samples, line_by_id))
    if args.scripts:
        wanted = {int(x) for x in args.scripts.split(",")}
        scripts = [s for s in scripts if s in wanted]

    force = not args.no_force
    total_lines = sum(len(by_script[s]) for s in scripts)
    print(f"대상 지문 {len(scripts)}개 / 라인 {total_lines}개  force={force}")
    print(f"base-url: {args.base_url}  dry-run: {args.dry_run}\n")

    token = None if args.dry_run else guest_token(args.base_url)

    ok = clips = 0
    failures = []
    for i, sid in enumerate(scripts, 1):
        lines = script_lines(by_script, sid)
        label = f"[{i}/{len(scripts)}] script {sid} ({len(lines)}라인)"
        if args.dry_run:
            preview = lines[0]["text"][:40]
            print(f"{label}  {preview}…")
            continue
        try:
            started = time.monotonic()
            data = post_listen(args.base_url, token, lines, force)
            urls = data.get("urls", [])
            if len(urls) != len(lines) or not all(urls):
                raise RuntimeError(f"URL {len(urls)}개 반환 (라인 {len(lines)}개), 빈 값 포함 여부={not all(urls)}")
            clips += len(urls)
            ok += 1
            print(f"{label}  OK ({time.monotonic() - started:.1f}s)")
        except Exception as e:  # noqa: BLE001 - 개별 실패는 모아서 리포트
            failures.append((sid, str(e)))
            print(f"{label}  실패: {e}")
        time.sleep(args.sleep)

    if args.dry_run:
        return
    print(f"\n완료: 성공 {ok}/{len(scripts)} 지문, 생성 클립 {clips}")
    if failures:
        print(f"실패 {len(failures)}건 (같은 명령 재실행으로 재시도 가능):")
        for sid, err in failures:
            print(f"  script {sid}: {err}")
        sys.exit(1)


if __name__ == "__main__":
    main()
