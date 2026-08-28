"""전 범위 — 기관 학생(학교 계약)이 여는 것.

**`free_scope.py` 에 넣지 않았다.** 그 파일은 "무료 경계는 여기 한 곳" 이
이름이자 계약이라, 다른 뜻의 값이 섞이면 그 문장이 거짓이 된다.

**기관 학생은 모든 급을 받는다** — 2026-08-28 기획 확정. 그 전에는
`access_and_pricing_v1.html` §07 의 3번이 "계약한 급만" 이었는데(2026-08-26),
기획자가 뒤집었다. 이유: "어차피 보통 학교는 모든 급을 계약해."

그래서 `ko_school.class_levels`(String(200))는 여전히 아무도 안 읽는다.
계약 급을 실제로 갈라야 할 날이 오면 그 칸의 뜻을 정하는 것부터 하면 된다.

값의 정본은 서버가 아니라 앱의 데이터 파일이다 — 서버에 급·과 표가 없다
(`free_scope.py` 의 같은 사정). 그래서 여기 적어 두고, 늘어나면 같이 고친다.
"""

# 급 여덟. 정본은 `app/src/shared/data/book.ts` 의 id 1~8 (2026-08-28 확인).
ALL_BOOKS = [1, 2, 3, 4, 5, 6, 7, 8]

# 자모 과 셋. 정본은 `app/src/shared/data/chapter.ts` 의 `type == "jamo"` —
# 1급 1·2·3과다 (2026-08-28 확인).
#
# **`books` 가 이것을 대신하지 못한다.** `accepter/entitlement_guard.py` 는
# `menuType == "jamo"` 면 `books` 를 아예 안 보고 `jamo_chapters` 만 본 뒤
# 바로 402 를 낸다. 여기를 `[1]` 로 두면 기관 학생에게 한글 2·3과가 막힌다.
ALL_JAMO_CHAPTERS = [1, 2, 3]

# 게임 다섯. 정본은 `app/src/components/main/game/list-view.tsx` 의 key.
# 무료는 앞의 둘뿐이고 뒤의 셋은 `RequireGame` 이 막는다 —
# 기관 학생은 유료 구독자와 같은 것을 본다(2026-08-28 확정).
ALL_GAMES = ["vocashot", "spring-picnic", "seoul-puzzle", "card-sort", "particle-sniper"]

# 표현클립은 무료도 전부라 가를 것이 없다.
ALL_CLIPS = True
