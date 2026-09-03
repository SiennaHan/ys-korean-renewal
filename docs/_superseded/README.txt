이 폴더는 "정본이 아닌 문서" 를 모은다. 개발하면서 읽을 필요가 없는 것들이다.
두 종류가 섞여 있으니 항목마다 어느 쪽인지 적는다.

  [대체됨]  더 새 판이 있다. 그 새 판을 봐라.
  [근거]    대체된 게 아니다. 다른 문서의 주장을 받치는 산출물이라
            결론은 이미 그 문서에 있다. 근거를 직접 확인할 때만 열면 된다.

아래 첫 묶음의 목업은 activity_mockups_uiux.html 로 대체됐고 원문은 Git 이력으로만 보존한다.

shell_mockup_v1.html
  내가 처음 만든 셸 목업. 활동 7종 + 결과 + 예외 3종.
  구 앱 화면을 안 열고 추측해서 만든 부분이 여럿 틀렸다.

activity_mockups_gaps.html
  확정 목업에 빠져 있던 11화면을 채운 것. 그 내용이 확정 파일에 흡수됐다.

두 파일의 규격은 ../shell_spec_v1.html 과 ../screens_SOT.html 에 흡수됐다.
삭제한 원문 목록과 대체 정본은 ARCHIVE_MANIFEST.md에 있다.

── 게임 목업 넷 (2026-08-18 대체)
game_mockups_v1 · card_sort_mockup_v1 · seoul_puzzle_mockup_v1 · spring_picnic_mockup_v1

손으로 옮기거나 스크립트로 변환한 것들이다. 앱을 실제로 띄워 보니
빠진 것이 많았다 — 봄소풍과 서울 퍼즐의 CSS 일러스트(벚나무·한강 지도)가
통째로 없었고, 카드 마스터 결과 화면의 통계 배치도 달랐다.

대체: 앱을 로컬에서 띄워 실제 화면을 본다. 옛 인계 메모의 핵심 판단은
ARCHIVE_MANIFEST.md에 남겼고 원문은 Git 이력에서 복원할 수 있다.
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

옮기지 않은 옛 판이 넷 있다 — 다른 문서가 아직 가리키고 있어서다.
  vocashot_mockup_v1 · gamelist_mockup_v1 ·
  activity_mockups_uiux_editorial · activity_mockups_uiux_extended_compare
shell_mockup_uiux 는 세 곳에서 참조하므로 남겨 두었다.
vocashot_play_v1 은 처음에 "도는 시제품이니 남긴다" 고 적었는데 틀렸다.
아래 08-21 항목을 봐라 — vocashot_play_uiux 도 도는 시제품이고 그쪽이 새 판이다.

── handoff_v1 (2026-08-21)

handoff_v2 가 대체했다고 v2 자신이 적어 두었는데도 여기로 못 오고 있었다.
네 곳이 v1 §03 의 "구현이 목업과 다르면 목업이 기준" 을 인용하고 있어서다.
그 규칙을 handoff_v2 §03 이 직접 말하도록 옮기고, 인용 셋(BLOCKERS.md ·
renewal_plan_v1 · mockup_read_v1)을 고친 뒤에 옮겼다.

교훈 — 문서를 이름으로 인용하면 그 문서를 옮길 수 없게 된다.
인용되는 내용은 정본에 두고, 옛 판은 근거가 아니라 이력으로만 남긴다.

── 루트 정리 (2026-08-21)

저장소 루트에 흩어져 있던 문서 여덟을 docs/ 로 모았다.
  G1_activity_lineup_v2 · G1_item_schema_proposal_v1 · G2_shell_and_state_spec_v1
  app_asis_mockup_v1 · core_loop_mockup_v1 · jamo_authoring_spec_v1
  renewal_masterplan_v1 · renewal_plan_v0.2
이제 루트에는 README.md 와 BLOCKERS.md 만 있다 — 개발자가 저장소를 열었을 때
읽을 것이 둘로 보이게 하려는 것이다. 본문 언급은 파일명만 쓰고 있어서
옮겨도 깨지지 않았고, ../ 접두를 쓴 넷만 고쳤다.

── 활동 UI/UX 시안 둘 (2026-08-21)  [대체됨]

activity_mockups_uiux_editorial      시안 1 · 에디토리얼
activity_mockups_uiux_extended_compare  확장 활동 시안 비교

build_spec_uiux 가 "비교 이력으로만 보관하며 구현 기준으로 사용하지 않는다" 고
직접 적어 두었다. 확정은 시안 2(Functional Clarity) 이고 시각 정본은
activity_mockups_uiux.html 이다.

── 검증 산출물 둘 (2026-08-21)  [근거]

vocashot_mockup_v1   VocaShot 시작·결과. vocashot_solo_spec_v1 §8b 의
                     "화면 2 × 폭 3 × 갈래 5 = 15조합에서 넘침 0" 을 받친다.
gamelist_mockup_v1   게임 목록 구조. games_asis_v1 §1d 의
                     "진행 3갈래 × 폭 3 = 9조합에서 넘침 0" 을 받친다.

둘 다 대체된 것이 아니다 — 넘침을 실제로 그려서 확인한 결과물이고 그 결론은
이미 부모 문서에 적혀 있다. 레이아웃을 다시 의심할 때만 열면 된다.

── vocashot_play_v1 (2026-08-21)  [대체됨]

vocashot_play_uiux 로 대체. 둘을 실제로 대조했다 — 86.8% 가 같고,
_uiux 에만 있는 것은 레이저·타격 효과(defense-emitter · laser-beam ·
impact-burst · playHitEffect)이며 v1 에만 있는 것은 없다. 즉 순수 추가분이다.
문항 수는 둘 다 1149 개로 같다.

처음에는 "도는 시제품이라 옛 판이 아니다" 고 판단했는데, _uiux 도 똑같이 도는
시제품이라는 것을 절 제목이 완전히 같은 것을 보고 알았다. 짐작하지 말고 대조할 일이다.

── 기획서 둘을 합쳤다 (2026-08-21)  [대체됨]

renewal_masterplan_v1  (08-13) 전체 지도 · 게이트 G1~G4 · 트랙 · 리스크
renewal_plan_v1        (08-19) 목업 실측 · 문서 어긋남 · Phase 1 작업 0~8 상태

둘 다 ../renewal_masterplan_v2.html 로 합쳐졌다. 절 12개를 프로그램으로 옮겼고
글자 수를 대조해 손실이 없음을 확인했다(19,973자 → 19,973자).
새 문서의 절 배치 — v1 의 §1~5·7 이 §1·3~7·13, plan_v1 의 §4·1·2·3·5 가 §8~12,
그리고 §2 에 덮개 지도가 새로 들어갔다.

합친 이유 두 가지.
  ① 지도(무엇을 어떤 순서로)와 상태(어디까지 왔나)가 갈라져 있으면 어느 쪽이
     지금인지 알 수 없다. 실제로 v1 은 "개발 미착수" 라고 적힌 채였고
     plan_v1 은 Phase 1 이 절반 진행된 상태를 적고 있었다.
  ② 덮개 지도가 handoff_v2 에 있었는데, 인계 문서는 시점 기록이라
     인계가 끝나면 지도도 같이 낡는다. 상시 자산은 기획서에 둔다.

합치면서 게이트 현황을 갱신했다 — G1·G2 는 닫혔고 G3 는 절반 닫혔다
(경계·방식 확정, 가격·PG·라이선스 미정).

CSS 는 plan_v1 의 .card / td.n / .pill.ok / .pill.stop 을 masterplan 스타일시트로
이식하면서 --ok/--stop 을 --good/--bad 로 사상했다. 브라우저에서 실제로 값이
먹는지 확인했다.

── renewal_plan_v0.2 (2026-08-21)  [흡수됨]

제품 초안(8월 13일). 선결 결정 D1~D7 을 담고 있었는데, 여덟 중 일곱이 이미 다른
문서에서 "확정" 으로 다시 쓰여 있었다 — 같은 결정이 두 곳에 살면서 갈라지는
출처였다. 실제로 D7(무료/유료)은 옛 안이 여기, 확정안이 access_and_pricing_v1 에
따로 있었다.

  D1  포지셔닝·계정      → access_and_pricing_v1
  D1-b 교재 소스 전환     → 끝난 일(교재 교체 완료 · 권→급 코드 반영)
  D2  상태 모델         → G2_shell_and_state_spec_v1 §1
  D3  콘텐츠 단일 원본    → G1_item_schema_proposal_v1 · app/src/shared/data/README.md
  D4  다국어 원칙        → G2_shell_and_state_spec_v1 §4
  D5  디자인 시스템       → Shell_component_spec_uiux · build_spec_uiux
  D6  음성·AI          → 미정. 게이트 G4 에 남았다
  D7  프리미엄 경계       → access_and_pricing_v1 (옛 안은 폐기)

다섯 문서가 D1~D7 이라는 이름으로 인용하므로, 그 이름의 뜻은
../renewal_masterplan_v2.html §5 의 표가 쥔다. 그 표는 결말과 "지금 정의처" 만
적고 내용을 다시 쓰지 않는다 — 다시 쓰면 또 갈라진다.

교훈 — "권고" 문서를 남겨 두면 뒤에서 "확정" 이 나와도 옛 권고가 계속 인용된다.
확정이 나오는 순간 권고 문서는 내려야 한다.

── G1 두 문서를 합쳤다 (2026-08-21)  [흡수됨]

G1_activity_lineup_v2        활동 라인업 — 학습 8종 유지 · 받아쓰기 폐기 · VocaShot 개인 전환
G1_item_schema_proposal_v1   문항 스키마 — 공통 컬럼 · grammar_tag · review_status

→ ../G1_content_gate_v1.html 로 합쳤다. 같은 게이트가 낸 두 산출물이라 따로 두면
한쪽만 낡는다(실제로 받아쓰기 폐기가 라인업 문서에만 있어서 BLOCKERS 가 몰랐다).

합쳐도 되는 근거를 재고 했다 — 둘을 §번호로 인용하는 곳이 하나도 없었다
(여덟 곳 전부 파일명만 부른다). :root 공유 변수 15개는 값이 하나도 다르지 않고,
CSS 규칙 차이 7개는 글자 크기·여백 같은 미세 차이라 A 쪽 값으로 통일했다.

절 배치 — §1~5 활동 라인업(옛 A §1~5) · §6~11 문항 스키마(옛 B §1~5·7) ·
§12~14 기록(A §6 · B §6 · A §7). 절 15개를 프로그램으로 옮기고 글자 수를
대조했다(38,139 → 38,109 · 차이는 h2 제목 교체분).

── as-is 실측 둘을 합쳤다 (2026-08-21)  [흡수됨]

home_asis_v1    홈 · 교재학습
games_asis_v1   게임 · 표현클립 · MY

→ ../asis_v1.html. 같은 질문("리뉴얼 전이 어땠나")에 답하면서 탭만 나눠 갖고
있었다. 합친 뒤는 탭 바 순서대로 걷는다 — 홈(§2) · 교재학습(§3) · 게임(§4) ·
표현클립(§5) · MY(§6).

CSS 는 선택자 34개를 공유하는데 값이 하나도 다르지 않았다(같은 틀에서 나왔다).

절 번호 인용 여덟 곳을 함께 고쳤다 —
  games_asis §1 → asis_v1 §4     (게임)
            §1b → §4b            (VocaShot 개인 플레이)
            §1c → §4c            (서버에서 콘텐츠)
            §1d → §4d            (게임 목록 화면)
            §2  → §5             (표현 클립)
            §4  → §8             (판단할 것)
  home_asis §3  → §3             (교재학습 — 번호 그대로)
고친 곳: games_polish_v1 · my_learning_summary_v1 · vocashot_solo_spec_v1 ·
renewal_masterplan_v2 · INDEX.md · nav_mockup_uiux(첫 줄 주석).

app_asis_mockup_v1 은 여기 넣지 않았다 — 같은 주제(리뉴얼 전)지만 h2 가 없는
인터랙티브 목업이라 합치는 기술이 다르다. 목업 묶음과 함께 다룬다.

────────────────────────────────────────────────────────────
2026-08-21 · 확정 목업 셋 → screens_uiux.html

activity_mockups_uiux.html   → ../screens_uiux.html 의 활동 절 (#act)
nav_mockup_uiux.html         → ../screens_uiux.html 의 홈·목록 절 (#nav)
vocashot_play_uiux.html      → ../screens_uiux.html 의 VocaShot 절 (#voca)

합칠 수 있다고 판단한 근거를 먼저 쟀다 — 셋이 같은 하네스를 쓰고(main.workbench >
nav.controls > .device-wrap > #screen + aside.notes), :root 공유 변수 31~39개가
값이 하나도 다르지 않고, 한쪽만 정의한 클래스가 다른 쪽 마크업에 새는 곳이
여섯 방향 모두 0개였다. @keyframes 이름 충돌도 0.

원본 스크립트는 한 글자도 고치지 않았다. 절마다 지역 document 를 씌워
질의와 사건을 그 절 안으로 가뒀다 — 원본이 document.querySelectorAll('.option')
처럼 문서 전체를 뒤지기 때문이다. 실제로 이걸 넣기 전에는 한 절에서 폭을 320 으로
누르면 세 절의 폭이 함께 움직였다.

고친 것은 하네스 id 넷뿐이다(device·screen·caption·spec → -act/-nav/-voca).
화면 안쪽 id 는 건드리지 않았고, 그래서 아래 대조가 성립한다.

검증: 조작 버튼을 하나씩 눌러 #screen 의 innerHTML 을 원본과 합친 것에서 각각
떠서 길이·해시·캡션·spec 해시를 비교했다. 37개 상태(활동 25 · 홈·목록 9 ·
VocaShot 3) 전부 같다. 한눈에 보기 모드(45KB)와 VocaShot 실제 플레이(운석·선택지
4개·하트 5)도 따로 확인했다.

주의 — 대조는 탭이 앞에 있어야 맞는다. bindScrollCues 가 requestAnimationFrame
안에서 돌고 배경 탭에서는 rAF 가 늦어서, 스트립의 data-more-* 속성이 빠진 채로
찍힌다. 배경 탭에서 재면 있지도 않은 차이가 보인다.
vocashot_bank.js(문항 1149개)는 그대로 docs/ 에 있다. screens_uiux 가 부른다.

── 같은 날 하나 더 · game_screens_uiux.html → ../screens_uiux.html 의 게임 절 (#game)

앞서 이 문서를 "합칠 수 없다" 고 적었다. 근거가 틀렸다 — @keyframes 88개 ·
:root 13개라고 셌는데, 그건 파일 전체를 센 것이고 그 대부분은
<script id="appcss" type="text/plain"> 안의 202KB 짜리 글자다. 앱 CSS 를
글자로 들고 있다가 iframe 에 넣기 때문이다. 문서에 실제로 붙는 것은
<style> 하나 · :root 하나 · @keyframes 0개였다.

게다가 하네스가 다른 셋과 같았고 :root 공유 변수 39개가 값이 하나도 다르지 않았다.
화면이 iframe 안에 있어서 앱 CSS 가 벤치를 침범할 수 없으니, 벤치 규칙 47개만
#mk-game 으로 감싸면 됐다. 화면 쪽은 한 줄도 손대지 않았다.

감싸기에서 두 번 걸렸고 둘 다 검사로 잡았다.
 · .workbench 를 "#mk-game .workbench" 로 감싸면 절 자신에겐 안 걸린다 →
   절 자신에 걸어야 하는 것(:root · body · .workbench)을 따로 갈랐다.
 · /* 주석 */ 이 @media 바로 앞에 있으면 헤더로 함께 잡혀 "@ 로 시작하나" 가
   빗나가고 @media 안쪽이 감싸이지 않는다 → 주석을 먼저 뗀다. 그리고
   "규칙 수 == 감싼 수" 를 세는 단정을 넣어 다시 새면 빌드가 멈추게 했다.

검증: iframe 안 body.innerHTML 의 길이·해시 + 캡션 + 제목을 원본과 대조했다.
20개 상태 전부 같다(게임 목록 · 어휘 카드 4 · 조사 스나이퍼 4 · 봄소풍 4 ·
서울 퍼즐 4 · 폭 3). 벤치는 계산된 스타일 45개 속성을 원본과 대조해 전부 같다 —
지문은 마크업만 보므로 CSS 를 감싼 것은 지문이 못 잡는다.
앞선 셋(활동 25 · 홈·목록 9 · VocaShot 3)도 다시 돌려 그대로다. 합쳐서 57개 상태.

════════════════════════════════════════════════════════════
2026-08-21 · 합치기 넷 + 폐기 셋 (정본 26 → 12)

합친 것 — 어느 절로 갔는지가 중요하다.

  games_polish_v1.html        → ../games_spec_v1.html §1~§10 (번호 그대로)
  vocashot_solo_spec_v1.html  → ../games_spec_v1.html §11~§20
    같은 게임을 두 문서에서 찾아야 했다. 네 게임 손볼 것 + VocaShot 설계.

  Phase1_dev_spec_v1.html     → ../dev_spec_v1.html §1~§9 (번호 그대로)
  api_schema_v1.html          → ../dev_spec_v1.html §10~§16
    경로만 있고 필드가 없거나 반대인 채로 읽히곤 했다.

  G2_shell_and_state_spec_v1.html → ../shell_spec_v1.html §0~§10 (번호 그대로)
  Shell_component_spec_uiux.html  → ../shell_spec_v1.html §11~§20  (+11)
  build_spec_uiux.html            → ../shell_spec_v1.html §21~§34  (+20)
    "넷인데 층이다" 를 파일 셋으로 표현하고 있었다. 이제 한 문서의 세 층이다.
    남의 문서가 "구현 사양 §8" 처럼 부르던 것도 §28 로 옮겼다.

  renewal_masterplan_v2.html  → ../masterplan_v3.html §1~§13 (번호 그대로)
  handoff_v2.html             → ../masterplan_v3.html §14~§20
    문서 지도가 인계 쪽에 있었다 — 인계가 끝나면 지도도 같이 낡는 자리였다.

폐기한 것 — 대신 볼 곳이 있어서 뺐다.

  mockup_read_v1.html      목업을 처음 읽은 0단계 실측. 그때 잡은 규격은 구현과
                           pnpm parity:activity 가 지킨다. 머리에 §N→§(N+20) 환산표.
  app_asis_mockup_v1.html  리뉴얼 전 앱 19화면 목업. 글로 정리한 것은 ../asis_v1.html.
  core_loop_mockup_v1.html 학습 한 바퀴 첫 안. "오답은 기록이 아니라 예약" 원칙은
                           ../dev_spec_v1 §2.3 과 ../shell_spec_v1 §1 이 쥐고 있다.

합치면서 배운 것 (도구를 네 번 고쳤다)

  1. 본문은 파일 이름이 아니라 사람 말로 남의 문서를 부른다 — "개발 명세 §3" ·
     "G2 §5-1" · "구현 사양 §8". 파일 이름만 보다가 아홉 개를 잘못 옮겼고 되돌렸다.
  2. "(§4·§7)" 처럼 § 가 이어지면 뒤쪽이 판정을 못 받는다. 앞의 사슬을 걷어내고
     그 앞을 다시 봐야 한다.
  3. 귀속은 "가장 가까운 것이 이긴다" 여야 한다(check_docs 와 같은 규칙).
     "handoff_v1 은 … §03 을 인용해서 … 그 규칙을 이 문서 §03 이" 에서 뒤쪽은 자기 절이다.
  4. 별칭에 "목업"·"기획서" 같은 흔한 낱말을 넣으면 자기 절을 남의 것으로 본다.

  그리고: check_docs 는 "파일이름 §N" 만 검사한다. 사람 말로 부르는 인용과
  자기 절 인용은 검사기가 못 본다 — 그건 눈으로 찍어 확인했다.

── 옛 세대 셸 목업 (2026-08-29 에 옮김)  [근거]

legacy_shell_mockup  셸의 상태별 화면(2026-08-17). 옛 이름은 shell_mockup_uiux.
                     **활동 셸의 시각 정본이 아니다** — 그 자리는 screens_SOT 의
                     활동 절이고 pnpm parity:activity 가 지킨다.
                     2026-08-26 실측 — 이 문서만 가진 클래스 49개 중 앱이 쓰는
                     것은 0개다(hard 하나가 걸렸는데 게임 난이도 버튼이라 우연).
                     masterplan_v3 이 한때 이것을 "활동 셸의 목업" 으로 적었다가
                     같은 날 스스로 정정했다.
                     남겨 두는 이유는 그때 그려 본 다른 셸 안이라는 기록이다.
