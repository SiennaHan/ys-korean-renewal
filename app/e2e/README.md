# E2E — 세로 흐름 (DEV-10)

`vertical-flow.spec.ts` 는 가입 → 무료 학습 → 벽(잠긴 과) → 계정 전환을 실제
브라우저로, 복습 큐는 API 로 걷는다. 자세한 이유는 그 파일의 머리 주석을 봐라.

## 돌리기

**앱(`:3000`)과 API(`:8799`)가 먼저 떠 있어야 한다.** `playwright.config.ts`
가 `webServer` 를 안 쓰는 이유(다른 세션과의 포트 충돌)도 같이 적혀 있다.

```bash
# 이 저장소는 세션이 거의 항상 둘 이상 돈다 — 이미 떠 있으면 새로 안 띄운다
cd app && pnpm dev &
cd api && .venv/bin/python -m uvicorn server:app --host 127.0.0.1 --port 8799 &

cd app && pnpm e2e
```

다른 주소를 쓰려면 `E2E_BASE_URL`(앱)·`E2E_API_URL`(API) 환경변수로 덮는다.

## 아직 CI 에 없다

이 스위트는 로컬에서 돈다. CI 에 넣으려면 러너 안에서 앱+API+DB 를 띄우는
단계가 먼저 필요하다 — `build-content.py --check` 가 원장 없이 CI 에서
못 도는 것과 비슷한 사정으로, 별도 인프라 작업이다(`developer_tasks.md`
DEV-10).
