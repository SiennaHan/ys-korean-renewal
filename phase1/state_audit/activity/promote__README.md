# 브리핑·리포트 목업 v2.7 승격 (2026-08-26)

승격 전후를 남긴 자료다. `_app` 은 제품 컴포넌트, `_proto` 는 정본
프로토타입(`phase1/screens_uiux.html`)이 그린 것이다.

| 파일 | 무엇 |
|---|---|
| `promote__*_app__before` · `__after` | 앱 — 승격 전후로 안 바뀐다(원래 맞게 그리고 있었다) |
| `promote__*_proto__before` | **깨진 상태.** CSS 만 v2.7 로 올라가고 템플릿이 v2.6 이라 리포트 탭의 활성 표시(파란 밑줄)가 사라져 있었다 |
| `promote__*_proto__after` | 템플릿까지 맞춘 뒤. 탭 활성 표시가 돌아왔고 앱과 같다 |

**승격은 앱을 목업에 맞춘 것이 아니라 그 반대다.** 앱이 접근성·구조를 먼저 고쳤고
(탭을 진짜 `button role=tablist`·`aria-selected` 로, 인라인 style 을 클래스로,
상황 이미지 자리표를 `aria-hidden` 으로), 정본이 그것을 따라왔다.
`captured/` 는 v2.6 시점 기록이라 그대로 두고 `TWIN_ALLOW` 에 이유를 적었다.
