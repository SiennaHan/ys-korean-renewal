/**
 * 기관 발급 코드 — 확인과 가입.
 *
 * **오류 코드를 문구 키로 잇는 자리가 여기 하나뿐이다.** `/join` 과
 * `/signup?code=` 두 화면이 같은 코드를 받는데, `joinCode.err_*` 를
 * `signup.err_*` 에 베껴 두면 한쪽만 고쳐진다.
 *
 * `signup.tsx` 는 모르는 코드를 만나면 **그 값을 날것으로 보여 준다**
 * (뭉개면 이유가 사라지므로 일부러 그렇게 뒀다). 그래서 여기서 옮기지 못한
 * 값은 화면에 영문 코드로 뜬다 — 아래 목록을 서버와 같이 늘려야 한다.
 */
import { api, getGuestId, setAccessToken } from "./api";
import type { LoginError, LoginToken } from "./apiType";

/** 서버가 내는 코드. `accepter/user_accepter.py` · `business/signup_code_business.py` 와 짝이다 */
const CODE_ERRORS = [
	"codeRequired",
	"codeInvalid",
	"codeFull",
	"codeExpired",
	"codeNotStarted",
	"codePaused",
	"codeDisabled",
	"tooManyTries",
	"codeCheckFailed",
] as const;

export type JoinCodeError = (typeof CODE_ERRORS)[number];

/** 오류 코드 → i18n 키. 모르는 값이면 `null` 을 내고 화면이 코드를 그대로 보여 준다 */
export function joinCodeErrorKey(code: string | undefined): string | null {
	if (!code) return null;
	return (CODE_ERRORS as readonly string[]).includes(code)
		? `joinCode.err_${code}`
		: null;
}

export interface CodeCheck {
	valid: boolean;
	schoolName?: string | null;
	reason?: string;
	retryAfterSec?: number;
}

/**
 * 코드를 확인한다. **학교 이름만 돌아온다** — 학교 코드도 남은 자리 수도 안 준다.
 *
 * `POST` 인 이유는 서버 access 로그에 request line 이 남기 때문이다.
 * 쿼리스트링으로 보내면 코드가 평문으로 디스크에 쌓인다.
 */
export async function verifyJoinCode(code: string): Promise<CodeCheck> {
	try {
		const res = await api.post<CodeCheck>("/user/sign/code/verify", { code });
		if (!res.result || !res.data) return { valid: false, reason: "codeCheckFailed" };
		return res.data;
	} catch (error) {
		console.error(error);
		return { valid: false, reason: "codeCheckFailed" };
	}
}

/**
 * 코드로 가입한다 — 그 코드가 가리키는 학교의 학생이 된다.
 *
 * **`school_code` 를 보내지 않는다.** 코드만 보내고 서버가 학교를 정한다.
 * 게스트로 푼 기록은 `guestId` 를 같이 보내 서버가 옮긴다(`/sign/up` 과 같다).
 */
export async function signUpWithCode(
	code: string,
	email: string,
	password: string,
	name: string,
): Promise<{ success: boolean; error?: string; user?: LoginToken["user"] }> {
	try {
		const res = await api.post<LoginToken | LoginError>("/user/sign/up/code", {
			code,
			email,
			password,
			name,
			guestId: getGuestId(),
		});

		if (!res.result || !res.data) return { success: false, error: "signupFailed" };
		if ("error" in res.data) return { success: false, error: res.data.error };

		const data = res.data as LoginToken;
		if (!data.token || !data.user) return { success: false, error: "signupBadResponse" };

		setAccessToken(data.token);
		localStorage.setItem("koreanUser", JSON.stringify(data.user));
		return { success: true, user: data.user };
	} catch (error) {
		console.error(error);
		return { success: false, error: "signupFailed" };
	}
}

/** 보여 주는 꼴 — `ABCD-2345`. 저장·전송은 하이픈 없이 한다 */
export function formatCode(raw: string): string {
	const s = raw.replace(/[^0-9A-Za-z]/g, "").toUpperCase().slice(0, 8);
	return s.length > 4 ? `${s.slice(0, 4)}-${s.slice(4)}` : s;
}

/** 서버에 보낼 꼴 — 알파벳 밖 문자를 걷고 대문자로 */
export function normalizeCode(raw: string): string {
	return raw.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}
