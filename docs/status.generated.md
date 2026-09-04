# 지금 상태 — 코드에서 뽑은 것

<!-- 이 파일은 `docs/gen_status.py` 가 만든다. 손으로 고치지 마라 —
     CI 가 다시 뽑아 보고 다르면 실패시킨다. 고칠 것은 생성기다. -->

**사람이 쓰는 문서는 이 표의 사실을 옮겨 적지 말고 여기를 가리켜라.**
낡는 문장은 거의 다 「현재 상태」였다 — 그 말을 문서가 안 하게 하려고 만들었다.
판단(「거의 됐다」·「남은 건 결제다」)은 여기 없다. 실행 우선순위는
`developer_tasks.md`, 제품 결정 근거는 `masterplan_v3.html`이 쥔다.

## CI

워크플로: **있다** (`.github/workflows/gates.yml`)

- **docs** — 문서
  - 문서 구조 검사
  - 문서 구조 검사 대조군
  - 정책·공통 상태 계약
  - 콘텐츠 공개 게이트 대조군
  - 생성 상태가 코드와 같은지
  - 훅이 실제로 도는지
- **app** — 앱
  - pnpm 준비
  - 의존성 설치
  - typecheck
  - 목업 대조
  - build
  - check:css (건너뛰지 않았는지까지 본다)
  - biome (src) — 늘어나지만 않으면 통과

## 정책 계약

정본: `docs/project_status.json` — 사람이 쓰는 설명도 이 값을 가리키며 같은 정책을 다시 선언하지 않는다.

| 정책 | 값 | 제품에서 뜻하는 것 |
|---|---|---|
| 무료 콘텐츠 전달 | `server_prefetch_after_first_online_launch` | 첫 설치 오프라인: **불가** · 프리페치 뒤 오프라인: **가능** · 범위 정본: `GET /entitlement chapters` · 번들 예외: `jamo` |
| 원장 → 학생 JSON 공개 게이트 | `exclude_deleted_warn_and_include_unknown` | 제외: `deleted` · 모르는 `review_status`: **경고 후 포함** · 범위: `workbook_to_generated_json` |

## 공통 개발 상태표

상태는 **완료 / 부분완료 / 미구현 / 검증 안 됨** 네 개뿐이다. 상세한 경위는 근거 문서를 보고, 현재 판정은 이 표를 본다.

| ID | 영역 | 상태 | 검증 |
|---|---|---|---|
| `student_app_ci` | 학생 앱 CI | **완료** | `generated:ci_job:app` |
| `admin_typecheck` | 어드민 타입 검사 | **완료** | `cd admin && pnpm typecheck` |
| `admin_release_css` | 어드민 배포 CSS | **부분완료** | `cd admin && pnpm build; inspect dist CSS utilities` |
| `admin_ci` | 어드민 CI | **미구현** | `generated:ci_job:admin` |
| `vertical_e2e_local` | 가입·무료 학습·계정 벽 세로 흐름 E2E | **부분완료** | `cd app && pnpm e2e` |
| `vertical_e2e_ci` | 세로 흐름 E2E의 CI 연결 | **미구현** | `generated:ci_step:pnpm e2e` |
| `api_tests` | API 단위·통합 테스트 | **미구현** | `inspect first-party API test suite` |
| `content_protection` | 교재 콘텐츠 보호와 오프라인 캐시 | **부분완료** | `cd app && pnpm parity:activity; API entitlement tests remain` |
| `mission_content_current_ledger` | 미션대화 최신 원장 승격 | **부분완료** | `python3 app/scripts/build-content.py --check` |
| `personal_payment` | 개인 결제·구독·환불·웹훅 | **미구현** | `inspect payment model, routes, and webhook` |
| `password_reset_mail` | 비밀번호 재설정 메일 | **미구현** | `inspect reset route and mail sender` |
| `operational_observability` | 오류 수집·운영 관측 | **미구현** | `inspect error collection and analytics integration` |

## 카드 보드 — `developer_tasks.md` 에서 뽑았다

**순서는 여기 없다.** 무엇을 먼저 할지는 판단이라 `masterplan_v3.html` §3 이 쥔다.

### 아직 안 된 것 — 미구현 6장

- `DEV-04` 월 구독 결제와 실제 권한 부여 · P0 ← **막은 결정** PD-01 결제 상품 · PD-02 결제 사업자
- `DEV-06` STT 표본 보관·삭제 운영 · P0 (결정 끝 · 실행만 남음)
- `DEV-08` MY 누적 학습 요약 · P1
- `DEV-09` 법률 링크와 동의 증거 · P0 ← **막은 결정** PD-07 법률·사업자 정보
- `DEV-11` 계정 데이터 열람·내보내기와 가입 연령 · P0 (범위 줄었다 · 문서만)
- `DEV-14` 어드민의 조용한 데이터 어긋남과 없는 게이트 · P0 (착수 가능 · 일부 PD 대기)

### 일부만 된 것 — 부분완료 5장

- `DEV-03` 비밀번호 재설정과 메일 발송 · P0 (화면만 · 메일 발송 없음)
- `DEV-10` 출시 안전장치와 운영 관측 · P0 (E2E 뼈대 · 관측 남음)
- `DEV-12` 외부 AI 호출의 타임아웃과 실패 화면 · P0 (openai.py 2026-09-01)
- `DEV-15` 사내 피드백 허브 연동 · P0 (코드 완료 · 배포만 남음)
- `DEV-16` 미션 대화의 발화 피드백과 발음 축 · P0 (고친 문장·발음 배선 남음)

### 끝난 것 — 완료 5장

- `DEV-01` QR을 홈으로 보내기 · P0 (2026-09-01)
- `DEV-02` 표현클립 신고를 안전하게 저장하기 · P0 (2026-09-01)
- `DEV-05` 유료 교재 콘텐츠를 서버 인증 뒤로 · P0 (자모는 일부러 제외)
- `DEV-07` 콘텐츠 공개 게이트와 산출물 감사를 빌드에서 강제 · P0 (2026-09-03)
- `DEV-13` 미션 대화를 검수된 원장으로 돌리기 · P1 (2026-09-01)

### 기다리는 기획 결정 — 4건

- `PD-01` 결제 상품 → DEV-04
- `PD-02` 결제 사업자 → DEV-04
- `PD-04` 음성 보관 → DEV-06
- `PD-07` 법률·사업자 정보 → DEV-09

## 게이트

- `pnpm build`
- `pnpm check`
- `pnpm check:css`
- `pnpm parity:activity`
- `pnpm typecheck`
- `python3 app/scripts/build-content.py --check` — **CI 에서 못 돈다**(원장이 저장소에 없다)
- `python3 docs/check_docs.py` · `python3 docs/check_docs_probe.py`

## 서버 — 있는 것과 없는 것

| | |
|---|---|
| `ko_entitlement` 표 | 없다 |
| `ko_purchase` 표 | 없다 |
| 메일 발송 수단 (SMTP·SES·SendGrid) | 없다 |
| 비밀번호 재설정 라우트 | 없다 |
| `/health` 를 가진 파일 | tutorus_accepter.py |
| `include_router` | 30 |

## 문서

관찰 기준(`<!-- 관찰: … @ 커밋 -->`)을 선언한 문서 11개 · 선언 13개 —

- `BLOCKERS.md` (3개)
- `DESIGN.md`
- `docs/access_and_pricing_v1.html`
- `docs/clip_spec_v1.html`
- `docs/developer_tasks.md`
- `docs/doc_review_v1.md`
- `docs/legal_draft_v1.html`
- `docs/masterplan_v3.html`
- `docs/shell_spec_v1.html`
- `docs/textbook_tab_spec_v1.html`
- `docs/user_flow_v1.html`

선언하지 않은 문서는 **코드가 바뀌어도 「다시 읽어라」를 못 받는다.**

**「시점 기록」으로 못을 박은 자리** — 현재 판정에 쓰지 않는다.
읽어야 할 양을 줄이는 표시다(삭제가 아니다 — `doc_review_v1.md` §6-b).

- `BLOCKERS.md` — 2026-09-03 · 현재 판정 아님
- `BLOCKERS.md` — 2026-08-26 · 현재 판정 아님
- `BLOCKERS.md` — 2026-08-24~25 · 아래 「살아 있는 것」 둘만 예외

## 센 것 — 문서에 옮겨 적지 말고 여기를 가리켜라

| 무엇 | 수 | 어디서 세나 |
|---|---|---|
| 목업 대조 화면 | **55** | `activity-parity.tsx` 의 `SCREENS` — 활동 24 · 내비 5 · VocaShot 5 · 게임 17 · 표현클립 4 |
| 목업 캡처 | **55** | `app/src/screens_ref/*.html` |
| 활동 컴포넌트 | **24** | 위 `SCREENS` 의 활동 항목 |
| 이식한 화면 | **26** | `masterplan_v3.html` §15 표 합계 |
| `ko_*` 표 | **47** | `api/persistence/model.py` |
| 교재 콘텐츠 표 | **14** | `api/seed_textbook_content.py` 의 `TABLES` |
| 과 활동 종 | **7** | `app/src/shared/data/module.ts` |
| 자모 문항 | **529** | `n8_jamo.json` |
| 자모 활동 | **6** | `module.ts` 의 자모 묶음 |
| 급별 과 · 전체 과 | **15 · 120** | `chapter.ts` — **과 구조의 정본** |
| 페이월 상태 | **5** | `paywall` 컴포넌트 |
| CI 검사 스텝 | **11** | `.github/workflows/gates.yml` |
| `review_status` 값 종류 | **17** | 생성된 `n*.json` |
| i18n 로케일 | **5** | `app/src/i18n/locales/` |
| VocaShot 문항 은행 | **1143** | `vocashot-bank.ts` |
| `n1_word_quiz` 행 | **1138** | 생성된 `n1_word_quiz.json` |
| primitive 색 토큰 | **53** | `docs/tokens.css` |
| semantic 색 토큰 | **37** | 같은 파일 |
| 타이포 눈금 | **23** | 같은 파일 |
| 정본 HTML | **19** | `docs/*.html` |
| 폐기본 HTML | **31** | `docs/_superseded/*.html` |
| 추적된 듣기 음원 | **mp3 1,133개 · 68.9 MB** | `git ls-files app/public/audio` — **공개 금지** |
| 추적된 교재 지면 | **jpg 939장 · 34.2 MB** | `git ls-files app/public/textbook` — **공개 금지** |
| 추적된 문장·어휘·지문 | **36개 · 15.3 MB** | `git ls-files app/src/shared/data` — **공개 금지** |
