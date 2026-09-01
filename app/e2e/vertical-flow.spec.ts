import { expect, test } from "@playwright/test";

/**
 * DEV-10 세로 흐름 — 가입 → 무료 학습 → 벽 → 복습.
 *
 * 지금까지 있던 검사(`typecheck`·`parity:activity`·`check:css`)는 전부 코드
 * 조각 하나가 안 깨졌는지만 본다 — 픽스처를 넣어 정적으로 그리거나 타입만
 * 맞춰 본다. **이 파일은 다르다.** 진짜 브라우저로 진짜 API 서버(:8799)에
 * 대고, 사람이 하듯 화면을 눌러가며 계정 하나가 실제로 겪는 한 흐름 전체를
 * 걷는다. 배선(로그인 가드 · 잠금 판정 · 토큰 이전) 이 끊어지면 이 파일이
 * 먼저 안다.
 *
 * **복습(review-queue) 만 브라우저가 아니라 API 로 걷는다.** 문항이 복습
 * 큐에 실제로 뜨려면 `available_at` 이 다음 날 0시로 잡힌다(review_queue.py)
 * — 테스트가 하루를 기다릴 수는 없다. 대신 방금 만든 계정으로
 * `GET /review-queue` 를 직접 불러 그 API 가 새 계정에도 정상 응답하는지
 * (배선이 끊어지지 않았는지) 를 본다 — "지금 뭐가 있나" 가 아니라 "이 길이
 * 살아 있나" 를 확인하는 것이다.
 *
 * **결제·메일이 걸린 구간은 없다** — 둘 다 아직 코드가 없다(DEV-04·DEV-03).
 * 그래서 흐름은 "무료 학습 → 계정 벽 → 가입" 까지다. 결제가 붙으면 그 뒤
 * (가입 → 잠긴 과 → 결제 안내 → 웹훅 → 권한 갱신)를 여기에 더 걷는다.
 */

const API_BASE = process.env.E2E_API_URL ?? "http://127.0.0.1:8799";

/** 매 실행마다 새 계정이어야 한다 — 이메일 중복이면 가입이 emailTaken 으로 죽는다 */
const uniqueEmail = (tag: string) => `e2e-${tag}-${Date.now()}@example.com`;

test.describe("가입 → 무료 학습 → 벽 (브라우저)", () => {
	test.beforeEach(async ({ page }) => {
		// 이전 실행의 게스트/로그인 상태가 남아 있으면 이 흐름이 처음부터
		// 시작하지 않는다 — 매번 정말 새 방문자로 만든다
		await page.goto("/");
		await page.evaluate(() => {
			localStorage.clear();
			sessionStorage.clear();
		});
		await page.reload();
	});

	test("게스트로 들어가 무료 활동이 실제로 그려진다", async ({ page }) => {
		await page
			.getByRole("button", { name: "Browse without signing in" })
			.click();

		// 홈 — 로그인 화면으로 튕기지 않고 여기 머무는 것 자체가 게스트
		// 세션이 실제로 섰다는 뜻이다
		await expect(page.getByText("Start learning")).toBeVisible();

		await page.getByRole("link", { name: "Textbook" }).click();
		await page.getByText("Learn vocabulary", { exact: true }).click();

		/*
		 * 여기가 이 테스트의 요점이다 — **서버가 실제로 문항을 내려 줬는지.**
		 * DEV-05 로 콘텐츠가 서버 인증 뒤로 넘어갔으므로, 배선이 끊어지면
		 * 이 화면은 빈 채로 뜨거나 계속 도는 로딩만 보여 준다. "다음" 버튼이
		 * 아니라 **실제 단어 카드**가 있는지를 본다 — 무료 과라 잠기지
		 * 않아야 한다
		 */
		await expect(
			page.getByText("Look through this lesson's words first."),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Start the questions" }),
		).toBeVisible();
	});

	test("잠긴 과에 들어가면 계정 벽을 만난다 — 조용히 안 열린다", async ({
		page,
	}) => {
		await page
			.getByRole("button", { name: "Browse without signing in" })
			.click();
		await page.getByRole("link", { name: "Textbook" }).click();

		// Lesson 4 는 무료 범위, 5 부터는 계정이 있어야 한다(entitlement.py
		// 의 게스트 범위) — 잠금 자물쇠가 이미 화면에 붙어 있다
		await page.getByText("Lesson 5", { exact: true }).click();

		/*
		 * **여기가 "벽" 이다.** 신고 없이 콘텐츠가 그냥 새어 나오면 안 된다 —
		 * 그러면 DEV-05 가 막으려던 것(교재 전체가 기기로 그냥 내려가는 것)
		 * 이 다시 열린 것이다.
		 */
		await expect(page.getByText("Continue with an account")).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Sign in / Sign up" }),
		).toBeVisible();
		// 벽을 만났다고 되돌아갈 길이 없으면 안 된다
		await expect(
			page.getByRole("button", { name: "Browse first" }),
		).toBeVisible();
	});

	test("벽에서 가입하면 게스트 세션이 계정으로 넘어간다", async ({ page }) => {
		const email = uniqueEmail("wall");

		await page
			.getByRole("button", { name: "Browse without signing in" })
			.click();
		await page.getByRole("link", { name: "Textbook" }).click();
		await page.getByText("Lesson 5", { exact: true }).click();
		await page.getByRole("button", { name: "Sign in / Sign up" }).click();
		await page.getByRole("button", { name: "Sign up" }).click();

		/*
		 * 로그인 화면과 가입 화면의 이메일 칸이 **같은 placeholder**
		 * ("test@gmail.com") 를 쓴다. 화면 전환 도중에 바로 채우면 아직 안
		 * 사라진 로그인 화면의 칸을 채우고 마는 경쟁이 난다(실제로 겪었다 —
		 * 채워진 값이 사라진 채로 버튼이 계속 비활성이었다). 가입 화면의
		 * 표식(제목)이 뜬 뒤에 채운다
		 */
		await expect(page.getByText("Create an account")).toBeVisible();

		await page.getByPlaceholder("test@gmail.com").fill(email);
		await page.getByPlaceholder("Enter your password").fill("E2ePass123");
		await page.getByPlaceholder("Enter your name").fill("E2E Flow");
		await page.getByRole("checkbox").check();
		await page.getByRole("button", { name: "Sign up and start" }).click();

		/*
		 * **여기가 이 테스트의 요점이다** — 벽에서 튕겨 나가 다시 로그인
		 * 화면에 갇히는 대신, 가입이 곧장 로그인 상태의 홈으로 이어지는지.
		 * 이름이 인사말에 뜨는 것으로 확인한다("반갑습니다" 로 뭉뚱그려지지
		 * 않는다 — sign-provider.tsx 의 회원가입 뒤 setUser 가 실제로 도는지).
		 */
		await expect(page.getByText("E2E Flow")).toBeVisible();

		const token = await page.evaluate(() =>
			localStorage.getItem("koreanAccessToken"),
		);
		expect(
			token,
			"가입 뒤 토큰이 로컬스토리지에 남아 있어야 한다",
		).toBeTruthy();
	});
});

test.describe("복습 큐 배선 (API)", () => {
	test("새로 가입한 계정도 복습 큐를 정상 조회할 수 있다", async ({
		request,
	}) => {
		const email = uniqueEmail("review");

		// 게스트 없이 바로 가입 — 이 테스트는 게스트 이전이 아니라 복습 큐
		// 라우트 자체의 배선(인증 · 응답 모양)만 본다
		const signup = await request.post(`${API_BASE}/user/sign/up`, {
			data: { email, password: "E2ePass123", name: "E2E Review" },
		});
		expect(signup.ok()).toBeTruthy();
		const signupBody = await signup.json();
		expect(
			signupBody.data?.error,
			`가입이 실패했다 — ${JSON.stringify(signupBody.data)}`,
		).toBeFalsy();

		const token = signupBody.data.token;
		expect(token).toBeTruthy();

		const reviewQueue = await request.get(`${API_BASE}/review-queue`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		expect(reviewQueue.ok()).toBeTruthy();
		const body = await reviewQueue.json();
		expect(body.result).toBe(true);
		// 갓 만든 계정이라 큐는 비어 있는 게 맞다 — 여기서 보는 것은
		// "0개인가" 가 아니라 "이 길이 200 으로, {items, total} 모양으로
		// 응답하는가" 다(review_queue.py 의 listQueue 계약)
		expect(Array.isArray(body.data?.items)).toBe(true);
		expect(typeof body.data?.total).toBe("number");
	});

	test("토큰 없는 복습 큐 요청은 거부된다", async ({ request }) => {
		const res = await request.get(`${API_BASE}/review-queue`);
		expect(
			res.status(),
			"인증 없는 요청이 통과하면 안 된다",
		).toBeGreaterThanOrEqual(401);
		expect(res.status()).toBeLessThan(500);
	});
});
