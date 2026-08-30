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
  - check_docs.py
  - check_docs 가 제 몫을 하는지
- **app** — 앱
  - pnpm 준비
  - 의존성 설치
  - typecheck
  - 목업 대조
  - build
  - check:css (건너뛰지 않았는지까지 본다)
  - biome (src) — 늘어나지만 않으면 통과

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
| `include_router` | 29 |

## 문서

관찰 기준(`<!-- 관찰: … @ 커밋 -->`)을 선언한 문서 9개 —

- `access_and_pricing_v1.html`
- `clip_spec_v1.html`
- `developer_tasks.md`
- `doc_review_v1.md`
- `legal_draft_v1.html`
- `masterplan_v3.html`
- `shell_spec_v1.html`
- `textbook_tab_spec_v1.html`
- `user_flow_v1.html`

선언하지 않은 문서는 **코드가 바뀌어도 「다시 읽어라」를 못 받는다.**
