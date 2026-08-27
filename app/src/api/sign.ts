import { api, getGuestId, setAccessToken, setGuestId } from "./api";
import type { GuestToken, LoginError, LoginToken } from "./apiType";

export async function checkSign() {
	try {
		const guestLogin = {
			guestId: getGuestId(),
		};
		const response = await api.post<GuestToken>("/user/sign/guest", guestLogin);

		if (!response.result || !response.data) return false;

		const token = response.data.token;
		const guestId = response.data.guestId;

		// 토큰이 없으면 실패다. 예전에는 그래도 true 를 냈고, setAccessToken(undefined)
		// 가 문자열 "undefined" 를 저장해서 게스트가 들어온 것처럼 보였다 —
		// 그 뒤로 모든 요청이 Bearer undefined 로 나가 조용히 다 실패한다.
		if (!token) return false;

		setAccessToken(token);
		if (guestId) setGuestId(guestId);
		return true;
	} catch (error) {
		console.error(error);
		return false;
	}
}

/**
 * 화면과 서버가 같이 보는 비밀번호 규칙 — 목업 `phase1/draft_auth.html` 의 셋.
 *
 * 서버도 `user_business.checkPassword` 로 같은 것을 본다. **두 곳에 있는 것이
 * 맞다** — 화면은 타이핑하는 동안 알려 주려고, 서버는 앱을 안 거치고 부를 수
 * 있어서. 값이 아니라 규칙이라 갈라져도 조용히 틀리지 않는다(서버가 거절한다).
 */
export const PASSWORD_RULES = [
	{ key: "length", ok: (p: string) => p.length >= 8 },
	{ key: "upper", ok: (p: string) => /[A-Z]/.test(p) },
	{ key: "digit", ok: (p: string) => /[0-9]/.test(p) },
] as const;

export type PasswordRuleKey = (typeof PASSWORD_RULES)[number]["key"];

export function passwordMisses(password: string): PasswordRuleKey[] {
	return PASSWORD_RULES.filter((r) => !r.ok(password)).map((r) => r.key);
}

/**
 * 학생 자체 회원가입 — access_and_pricing_v1 §09 의 4단계.
 *
 * **게스트 id 를 같이 보낸다.** 둘러보며 푼 것이 이 계정으로 따라온다
 * (§07 의 2번). 가입 화면이 맨 위에서 그렇게 약속하므로 여기서 빠뜨리면
 * 화면이 거짓말을 하게 된다.
 *
 * 성공하면 토큰과 사용자를 바로 저장한다 — 가입하고 다시 로그인시키지 않는다.
 */
export async function signUpStudent(
	email: string,
	password: string,
	name: string,
): Promise<{ success: boolean; error?: string; user?: LoginToken["user"] }> {
	try {
		const response = await api.post<LoginToken | LoginError>("/user/sign/up", {
			email,
			password,
			name,
			guestId: getGuestId(),
		});

		if (!response.result || !response.data) {
			return { success: false, error: "signupFailed" };
		}
		if ("error" in response.data) {
			// 서버는 코드를 낸다(emailInvalid · nameRequired · passwordWeak · emailTaken).
			// 화면이 5개 언어라 문장을 서버에서 만들면 영어 화면에 한국어가 뜬다
			return { success: false, error: response.data.error };
		}

		const data = response.data as LoginToken;
		if (!data.token || !data.user) {
			return { success: false, error: "signupBadResponse" };
		}

		setAccessToken(data.token);
		localStorage.setItem("koreanUser", JSON.stringify(data.user));
		return { success: true, user: data.user };
	} catch (error) {
		console.error(error);
		return { success: false, error: "signupFailed" };
	}
}

export async function loginAsStudent(
	email: string,
	password: string,
): Promise<{ success: boolean; error?: string; user?: LoginToken["user"] }> {
	try {
		const response = await api.post<LoginToken | LoginError>(
			"/user/sign/login",
			{ email, password },
		);

		if (!response.result || !response.data) {
			return { success: false, error: "로그인에 실패했습니다." };
		}

		// 에러 응답 확인
		if ("error" in response.data) {
			return { success: false, error: response.data.error };
		}

		const data = response.data as LoginToken;

		// 토큰이나 사용자가 없으면 성공이 아니다. 넣으면 localStorage 에
		// 문자열 "undefined" 가 남아 앱이 부팅에서 죽는다.
		if (!data.token || !data.user) {
			return { success: false, error: "로그인 응답이 올바르지 않습니다." };
		}

		setAccessToken(data.token);
		localStorage.setItem("koreanUser", JSON.stringify(data.user));
		return { success: true, user: data.user };
	} catch (error) {
		console.error(error);
		return { success: false, error: "서버 연결에 실패했습니다." };
	}
}

export async function migrateGuestData(guestId: string): Promise<boolean> {
	try {
		const response = await api.post("/user/sign/migrate", { guestId });
		return response.result === true;
	} catch (error) {
		console.error(error);
		return false;
	}
}

export async function changePassword(
	currentPassword: string,
	newPassword: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await api.patch("/auth/password", {
			current_password: currentPassword,
			new_password: newPassword,
		});
		if (!response.result) {
			return { success: false, error: "wrong_current" };
		}
		return { success: true };
	} catch (error) {
		console.error(error);
		return { success: false, error: "server_error" };
	}
}

/**
 * 회원 탈퇴 — 계정과 그 계정이 만든 것을 지운다.
 *
 * **되돌릴 수 없다.** 그래서 비밀번호를 다시 받는다 — 토큰만 믿으면 남의 기기를
 * 잠깐 만진 사람이 계정을 지울 수 있다. 서버가 지우는 범위는
 * `api/shared/withdrawal_scope.py` 가 정본이다.
 */
export async function withdrawAccount(
	password: string,
): Promise<{ success: boolean; error?: "wrong_password" | "server_error" }> {
	try {
		const response = await api.post("/auth/withdraw", { password });
		if (!response.result) return { success: false, error: "wrong_password" };
		return { success: true };
	} catch (error) {
		console.error(error);
		return { success: false, error: "server_error" };
	}
}
