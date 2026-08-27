#!/usr/bin/env python3
"""표현클립 데이터 검사 — clip_spec_v1 §04 의 7·8번

이 자료는 **원장에 시트가 없다.** 그래서 `build-content.py` 가 못 지키고,
생성 스크립트도 없어 손으로 넣는다. 엑셀을 거쳐 오므로 조용히 깨진다 —
실제로 한 편이 그렇게 깨져 있었다.

  index 27 의 youtube_id 가 `#NAME?` 이었다.
  실제 ID 가 `-LFpAYRYkJI` 로 하이픈으로 시작해 **엑셀이 수식으로 읽었다.**

깨진 것이 조용한 이유가 둘이다. ① 화면은 그 ID 로 썸네일과 플레이어를 부르므로
검은 화면만 남는다. ② 신고 표의 `target_id` 가 `varchar(10)` 이라, 11자인 정상 ID 는
저장이 500 인데 6자인 `#NAME?` 은 들어간다 — 즉 **깨진 편만 신고되어 사라진다.**

그래서 게이트에 건다. `pnpm parity:activity` 의 마지막 단계다 — 이 저장소에서
데이터 모양을 보는 검사들이 그 명령에 모여 있다(`fixture-data-check.py` 와 나란히).
"""
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
CLIP = HERE.parent / "src" / "shared" / "data" / "clip.ts"

ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
# 화면이 읽지 않는 필드. 넣으면 받는 크기가 두 배가 된다 — §04 의 7번
UNUSED = ("script_org",)
NEEDED = ("index", "youtube_id", "link", "title", "category", "length", "script")


def load():
    text = CLIP.read_text(encoding="utf-8")
    body = text.split("=", 1)[1].strip().rstrip(";")
    return json.loads(body)


def main() -> int:
    clips = load()
    bad: list[str] = []

    seen_id: dict[str, int] = {}
    seen_index: dict[int, int] = {}
    for c in clips:
        idx = c.get("index")

        for f in NEEDED:
            if f not in c:
                bad.append(f"index {idx} — 필드 {f} 가 없다")

        yid = c.get("youtube_id", "")
        if not ID.match(yid):
            # link 에 원본이 남아 있으면 그것을 알려 준다 — 고치는 값이 바로 나온다
            m = re.search(r"[?&]v=([A-Za-z0-9_-]{11})", c.get("link") or "")
            hint = f" · link 에는 {m.group(1)!r} 가 있다" if m else " · link 에도 없다"
            bad.append(f"index {idx} — youtube_id 가 11자 규격이 아니다: {yid!r}{hint}")
        elif yid in seen_id:
            bad.append(f"index {idx} — youtube_id 가 index {seen_id[yid]} 와 같다: {yid}")
        else:
            seen_id[yid] = idx

        if idx in seen_index:
            bad.append(f"index {idx} — index 가 두 번 나온다")
        else:
            seen_index[idx] = idx

        # link 의 id 와 youtube_id 가 갈리면 어느 쪽이 참인지 알 수 없다
        m = re.search(r"[?&]v=([A-Za-z0-9_-]{11})", c.get("link") or "")
        if m and ID.match(yid) and m.group(1) != yid:
            bad.append(
                f"index {idx} — link 의 id({m.group(1)}) 와 youtube_id({yid}) 가 다르다"
            )

        for f in UNUSED:
            if f in c:
                bad.append(
                    f"index {idx} — {f} 가 다시 들어왔다. 화면이 읽지 않는 필드다 "
                    "(clip_spec_v1 §04 의 7번)"
                )

    size = CLIP.stat().st_size / 1024 / 1024
    print(f"표현클립 {len(clips)}편 · {CLIP.name} {size:.2f} MB")
    if bad:
        print(f"\n걸린 것 {len(bad)}개\n")
        for b in bad:
            print(f"  [클립 데이터] {b}")
        return 1
    print("통과 — id 규격 · 중복 · 필드 이상 없다")
    return 0


if __name__ == "__main__":
    sys.exit(main())
