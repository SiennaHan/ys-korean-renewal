# 지금 상태 — 코드에서 뽑은 것

<!-- 이 파일은 `docs/gen_status.py` 가 만든다. 손으로 고치지 마라 —
     CI 가 다시 뽑아 보고 다르면 실패시킨다. 고칠 것은 생성기다. -->

**사람이 쓰는 문서는 이 표의 사실을 옮겨 적지 말고 여기를 가리켜라.**
낡는 문장은 거의 다 「현재 상태」였다 — 그 말을 문서가 안 하게 하려고 만들었다.
판단(「거의 됐다」·「남은 건 결제다」)은 여기 없다. 그것은 `BLOCKERS.md` 와
`masterplan_v3.html` 이 쥔다.

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

관찰 기준(`<!-- 관찰: … @ 커밋 -->`)을 선언한 문서 11개 · 선언 14개 —

- `BLOCKERS.md` (4개)
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
