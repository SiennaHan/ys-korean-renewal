# 과거 산출물 보존 장부

과거 HTML과 인계 메모의 본문을 현재 작업 경로에 계속 보관하지 않기 위한 장부다.
현재 구현·기획의 근거로 사용하지 않으며, 원문이 필요하면 Git 이력에서 해당 파일을
복원한다. 현재 정본은 `../INDEX.md`가 가리키는 문서만이다.

## 삭제한 인계 메모

| 옛 파일 | 흡수된 정본 | 보존할 판단 근거 |
|---|---|---|
| `design_handoff_note.txt` | `../screens_SOT.html` · `../shell_spec_v1.html` · `../asis_v1.html` | 기존 화면은 라우트명으로 추측하지 말고 실제 컴포넌트와 화면을 확인한다. 앱바는 이탈 조작, 콘텐츠는 문항 보조 조작, 하단 도크는 진행을 만드는 주 조작으로 나눈다. 선택지형은 오답 정답을 공개하지 않는 재시도형이다. |
| `nav_handoff_note.txt` | `../screens_SOT.html` · `../textbook_tab_spec_v1.html` · `../asis_v1.html` | 활동 행의 상태 한 자리는 서로 배타적으로 교체하며 미학습은 비운다. 자모는 과→unit→활동 구조를 유지한다. 교재학습·자모 탭에는 앱바를 두지 않고 최상단 11px 규칙을 쓴다. |
| `game_handoff_note.txt` | `../screens_SOT.html` · `../games_spec_v1.html` · `../asis_v1.html` | 게임은 정적 추측 목업이 아니라 실제 렌더 화면을 기준으로 한다. 낙하·타이머·갈래색·CSS 일러스트·이름 치환처럼 게임 규칙인 연출은 시각 정리 과정에서 제거하지 않는다. |

## 삭제한 이관용 번역 초안

| 옛 파일 | 현재 실행 정본 | 메모 |
|---|---|---|
| `i18n_player_shell.ts` | `../../app/src/i18n/locales/{ko,en,ja,zh,vi}.ts` | 활동 셸 키를 로케일에 옮기기 전 작성한 초안. 현재 키와 문구는 런타임 로케일 파일이 쥔다. |
| `game_ui_i18n_v1.ts` | `../../app/src/i18n/locales/{ko,en,ja,zh,vi}.ts` | 게임 문구 하드코딩을 걷어내기 위한 초안. 현재 다섯 게임은 런타임 번역 키를 사용한다. |

## Git 이력으로만 보존하는 초기 목업

아래 파일은 현재 문서가 근거로 직접 인용하지 않고 더 새 목업이나 통합 정본이
전체 내용을 대체한다. 현재 checkout에서는 제거했으며 원문은 Git 이력에 남는다.

| 옛 파일 | 대체 정본 |
|---|---|
| `shell_mockup_v1.html` · `activity_mockups_gaps.html` | `../screens_SOT.html` · `../shell_spec_v1.html` |
| `Shell_component_spec_v1.html` · `build_spec_v1.html` | `../shell_spec_v1.html` |
| `activity_mockups_uiux_modular.html` · `activity_mockups_uiux_unified.html` | `../screens_SOT.html` |
| `game_mockups_v1.html` · `card_sort_mockup_v1.html` · `seoul_puzzle_mockup_v1.html` · `spring_picnic_mockup_v1.html` | `../screens_SOT.html` · `../games_spec_v1.html` |
| `game_screens_v1.html` | `game_screens_uiux.html`, 이후 `../screens_SOT.html` |
| `nav_mockup_v1.html` · `home_mockup_v1.html` | `nav_mockup_uiux.html`, 이후 `../screens_SOT.html` |
