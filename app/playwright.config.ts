import { defineConfig, devices } from "@playwright/test";

/**
 * DEV-10 — 세로 흐름 E2E. 가입 → 무료 학습 → 벽(잠긴 과) → 계정 전환을 실제
 * 브라우저로, 복습 큐는 API 로 걷는다.
 *
 * **`webServer` 를 안 쓴다 — 일부러다.** 이 저장소는 세션이 거의 항상 둘 이상
 * 동시에 돈다(CLAUDE.md "다른 세션이 같은 저장소에서 동시에 일한다"). Playwright
 * 가 자동으로 `pnpm dev` 를 띄우면 이미 떠 있는 다른 세션의 서버와 포트가
 * 부딪히거나, 그 서버를 이 테스트가 죽였다 살렸다 하게 된다. 대신 앱(:3000)과
 * API(:8799)가 **이미 떠 있다고 가정**한다 — 돌리기 전에 사람이(또는 다른
 * 스크립트가) 띄워 둔다. `E2E_BASE_URL`·`E2E_API_URL` 로 다른 주소를 줄 수 있다.
 */
export default defineConfig({
	testDir: "./e2e",
	timeout: 60_000,
	expect: { timeout: 10_000 },
	fullyParallel: false,
	retries: 0,
	reporter: [["list"]],
	use: {
		baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
