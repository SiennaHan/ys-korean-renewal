#!/usr/bin/env python3
"""캡처마다 상태 설명 .md 를 쓴다. 값은 manifest.json + observations.json 에서 온다."""
import json, pathlib

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "activity"
man = {e["id"]: e for e in json.loads((HERE / "manifest.json").read_text("utf-8"))["항목"]}
obs = json.loads((HERE / "observations.json").read_text("utf-8"))

# 파생 캡처(오답 2초 뒤)는 원본 항목의 메타를 물려받는다
DERIVED = {"_after": "2초가 지나 표시가 거둬진 뒤"}
REPRO = {
    "_after": "같은 스토리를 가상 시간 6000ms 로 떠서 WRONG_VISIBLE_MS(2초)를 넘긴다",
    "wrong": "같은 스토리를 가상 시간 1200ms 로 뜬다 — 2초가 지나면 표시가 사라진다",
}

n = 0
for cap, (cls, note, review) in sorted(obs.items()):
    base = cap
    extra = ""
    for suf, desc in DERIVED.items():
        if cap.endswith(suf):
            base, extra = cap[: -len(suf)], desc
    e = man.get(base) or man.get(cap)
    if not e:
        print(f"  ★ {cap} 명세에 없음"); continue
    story = e["story"]
    감사 = "감사용(state-audit.stories.tsx)" if cap not in {
        k for k in man} or story in {
        "듣기 오답","읽기 오답","읽기 긴선택지","자모듣기 정답","자모듣기 오답",
        "자모조합 일부만고름","자모조합3단 받침전","따라쓰기 그린판","따라쓰기 틀린판",
        "녹음 준비중","녹음 마무리중","녹음 보내는중",
        "미션대화 녹음중","미션대화 보내는중","미션대화 녹음완료"} else "기존(activity.stories.tsx)"
    repro = REPRO["_after"] if extra else (
        REPRO["wrong"] if "wrong" in cap else
        f"Storybook 「{story}」 를 harness.html 로 360폭에 앉혀 캡처")
    변형 = []
    for suffix, label in (("__320__ko", "320폭"), ("__360__en", "영어")):
        if (OUT / f"{cap}{suffix}.png").exists():
            변형.append(f"{label}: `{cap}{suffix}.png`")
    md = f"""# {cap}

- 활동: {e['활동']}
- 상태: {e['상태']}{(' — ' + extra) if extra else ''}
- 경로: {e['경로']}
- 화면 폭: 360 (높이 693)
- 언어: ko
- 재현: {repro}
- 정본 존재: {e['정본']}
- 구현 경로: {e['구현']}
- Storybook: {감사} · 「{story}」
- 관찰: {note}
- 디자인 검토 필요: {review}
- 분류: {cls}
"""
    if 변형:
        md += "- 추가 캡처: " + " · ".join(변형) + "\n"
    (OUT / f"{cap}.md").write_text(md, encoding="utf-8")
    n += 1
print(f"  ✓ .md {n}개")
