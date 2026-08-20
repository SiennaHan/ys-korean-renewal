이 폴더의 목업은 activity_mockups_uiux.html 로 대체되었다.

shell_mockup_v1.html
  내가 처음 만든 셸 목업. 활동 7종 + 결과 + 예외 3종.
  구 앱 화면을 안 열고 추측해서 만든 부분이 여럿 틀렸다.

activity_mockups_gaps.html
  확정 목업에 빠져 있던 11화면을 채운 것. 그 내용이 확정 파일에 흡수됐다.

둘 다 참고용으로만 남긴다. 규격의 근거는 ../build_spec_uiux.html 을 본다
(build_spec_v1 도 여기로 옮겼다 — 아래 08-20 항목).

── 게임 목업 넷 (2026-08-18 대체)
game_mockups_v1 · card_sort_mockup_v1 · seoul_puzzle_mockup_v1 · spring_picnic_mockup_v1

손으로 옮기거나 스크립트로 변환한 것들이다. 앱을 실제로 띄워 보니
빠진 것이 많았다 — 봄소풍과 서울 퍼즐의 CSS 일러스트(벚나무·한강 지도)가
통째로 없었고, 카드 마스터 결과 화면의 통계 배치도 달랐다.

대체: 앱을 로컬에서 띄워 실제 화면을 본다. 방법은 game_handoff_note.txt 에.
남긴 것: gamelist_mockup_v1.html(단순 정적 화면이고 진행 표시 제안을 담고 있다)

vocashot_mockup_uiux.html  (08-18 15:58)
  VocaShot 시작·결과만 담은 옛 판. 정본은 vocashot_play_uiux.html (16:22) 로,
  startView · playMarkup · resultView 를 다 들고 있어 전 흐름을 덮는다.
  둘이 같은 셀렉터 31개에서 값이 달랐다 — .g-go 가 여기서는 height 56/radius 14,
  정본에서는 padding 14/radius 16. 앱에는 정본 값만 들어갔다.

── 문서·목업 옛 판 일곱 (2026-08-20 대체)

이 저장소는 _v1 → _uiux 로 판을 올린다. 이름만 보고는 알 수 없어서 여기 적어 둔다.

Shell_component_spec_v1.html  ·  build_spec_v1.html
  각각 ../Shell_component_spec_uiux.html · ../build_spec_uiux.html 로 대체.
  절 구조가 10개·14개 그대로 같다 — 같은 문서를 확정 UI/UX 로 다시 쓴 것이다.

nav_mockup_v1.html      → ../nav_mockup_uiux.html
game_screens_v1.html    → ../game_screens_uiux.html
home_mockup_v1.html     → ../nav_mockup_uiux.html 이 홈을 흡수했다

activity_mockups_uiux_modular.html  ·  activity_mockups_uiux_unified.html
  ../activity_mockups_uiux.html 로 가는 길에 만든 시안 둘.

옮기지 않은 옛 판이 다섯 있다 — 다른 문서가 아직 가리키고 있어서다.
  vocashot_play_v1 · vocashot_mockup_v1 · gamelist_mockup_v1 ·
  activity_mockups_uiux_editorial · activity_mockups_uiux_extended_compare
shell_mockup_uiux 는 세 곳에서 참조하므로 남겨 두었다.
