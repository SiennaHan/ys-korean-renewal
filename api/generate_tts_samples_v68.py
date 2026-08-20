"""
tts-regen 샘플(단어·듣기지문·발화라인)의 음성을 백엔드로 생성해 캐시(S3 + ko_tts_cache)를
워밍하는 스크립트.

프로덕션 런타임과 '동일한 요청 형태'로 호출해야 캐시 해시 키가 일치한다:
  - 단어(n1_word_list)          → POST /tts/word         {text, voice}
  - 듣기지문(n3_listen_script)  → POST /tts/listen/audio {lines:[{text,speaker,voice}...]}
  - 발화라인(n3_listen_script_line) → 해당 라인이 속한 script 의 라인들로 /tts/listen/audio
    (voice 는 화자 slot 으로 결정되므로 반드시 script 컨텍스트로 보내야 prod 와 키가 같다)

인증은 게스트 토큰(/user/sign/guest, 자격증명 불필요)으로 충분하다(/tts/* 는 role 없이 JWT 만 요구).

사용법 (backend/koreanapi 에서):
    # 로컬 검증 (시트별 1건만)
    python generate_tts_samples.py --base-url http://localhost:8000 --limit-per-sheet 1
    # 프로덕션 반영 (전체 88 샘플 중 3개 카테고리)
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

# 이 스크립트가 다루는 카테고리(사용자 요청: 단어·듣기지문·발화라인)
TARGET_SHEETS = ("n1_word_list", "n3_listen_script", "n3_listen_script_line")


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def script_lines(all_lines, script_id):
    """production getScriptLines 와 동일: script_id 라인들을 seq 순으로 {text,speaker,voice}."""
    rows = sorted(
        (l for l in all_lines if l["script_id"] == script_id),
        key=lambda x: x["seq"],
    )
    return [
        {"text": r["text"], "speaker": r["speaker"], "voice": r["voice"]} for r in rows
    ]


def guest_token(base_url):
    r = requests.post(f"{base_url}/user/sign/guest", json={"guestId": None}, timeout=30)
    r.raise_for_status()
    data = r.json()
    if not data.get("result") or not data.get("data", {}).get("token"):
        raise RuntimeError(f"게스트 토큰 발급 실패: {data}")
    return data["data"]["token"]


def build_request(sample, all_lines, line_by_id):
    """(endpoint, payload, unit_count) 반환. unit_count = 생성되는 오디오 클립 수."""
    sheet = sample["sheet"]
    if sheet == "n1_word_list":
        return "/tts/word", {"text": sample["text"], "voice": sample["voice"]}, 1
    if sheet == "n3_listen_script":
        lines = script_lines(all_lines, sample["id"])
        return "/tts/listen/audio", {"lines": lines}, len(lines)
    if sheet == "n3_listen_script_line":
        line = line_by_id.get(sample["id"])
        if line is None:
            raise RuntimeError(f"라인 id {sample['id']} 를 라인 데이터에서 못 찾음")
        lines = script_lines(all_lines, line["script_id"])
        return "/tts/listen/audio", {"lines": lines}, len(lines)
    raise RuntimeError(f"지원하지 않는 sheet: {sheet}")


def post(base_url, token, endpoint, payload):
    r = requests.post(
        f"{base_url}{endpoint}",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
        timeout=120,
    )
    r.raise_for_status()
    data = r.json()
    if not data.get("result"):
        raise RuntimeError(f"응답 result=False: {data}")
    return data["data"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", required=True, help="예: https://koreanapi-live.pulleyai.co.kr")
    ap.add_argument("--limit-per-sheet", type=int, default=0, help="시트별 최대 건수(검증용, 0=전체)")
    ap.add_argument("--dry-run", action="store_true", help="전송 없이 요청만 출력")
    ap.add_argument("--sleep", type=float, default=0.15, help="요청 간 대기(초)")
    # 프로덕션 서버에는 frontend 레포가 없어 기본 모노레포 경로가 깨진다.
    # 그럴 땐 두 JSON 파일을 서버로 복사해 아래 인자로 직접 지정한다.
    ap.add_argument("--samples-file", default=SAMPLES_JSON, help="tts-regen-samples.json 경로")
    ap.add_argument("--lines-file", default=LINE_JSON, help="n3_listen_script_line.json 경로")
    args = ap.parse_args()

    for path in (args.samples_file, args.lines_file):
        if not os.path.exists(path):
            sys.exit(
                f"데이터 파일 없음: {path}\n"
                "→ 로컬 개발 머신(모노레포)에서 실행하거나, JSON 2개를 복사 후 "
                "--samples-file/--lines-file 로 경로를 지정하세요."
            )

    samples = [s for s in load_json(args.samples_file) if s["sheet"] in TARGET_SHEETS]
    all_lines = load_json(args.lines_file)
    line_by_id = {l["id"]: l for l in all_lines}

    # 시트별 limit 적용
    if args.limit_per_sheet > 0:
        counts, kept = {}, []
        for s in samples:
            counts[s["sheet"]] = counts.get(s["sheet"], 0) + 1
            if counts[s["sheet"]] <= args.limit_per_sheet:
                kept.append(s)
        samples = kept

    by_sheet = {}
    for s in samples:
        by_sheet.setdefault(s["sheet"], 0)
        by_sheet[s["sheet"]] += 1
    print(f"대상 {len(samples)}건: " + ", ".join(f"{k}={v}" for k, v in by_sheet.items()))
    print(f"base-url: {args.base_url}  dry-run: {args.dry_run}\n")

    token = None if args.dry_run else guest_token(args.base_url)

    ok = clips = cached_clips = 0
    failures = []
    for i, s in enumerate(samples, 1):
        endpoint, payload, units = build_request(s, all_lines, line_by_id)
        label = f"[{i}/{len(samples)}] {s['sheet']} id={s['id']} → {endpoint} ({units} clip)"
        if args.dry_run:
            print(label + f"  payload={json.dumps(payload, ensure_ascii=False)[:120]}")
            continue
        try:
            data = post(args.base_url, token, endpoint, payload)
            if endpoint == "/tts/word":
                clips += 1
                cached_clips += 1 if data.get("cached") else 0
            else:
                clips += len(data.get("urls", []))
            ok += 1
            print(label + "  OK")
        except Exception as e:  # noqa: BLE001 - 개별 실패는 모아서 리포트
            failures.append((s, str(e)))
            print(label + f"  실패: {e}")
        time.sleep(args.sleep)

    if args.dry_run:
        return
    print(f"\n완료: 성공 {ok}/{len(samples)} 항목, 생성 클립 {clips} (단어 캐시적중 {cached_clips})")
    if failures:
        print(f"실패 {len(failures)}건:")
        for s, err in failures:
            print(f"  {s['sheet']} id={s['id']}: {err}")
        sys.exit(1)


if __name__ == "__main__":
    main()
