import { env } from "@/config/env";
import type { ServerResponse } from "./apiType";

const BASE_URL: string = env.KOREAN_API_URL;

export interface LoginCredentials {
	username: string;
	password: string;
}

const ACCESS_TOKEN_KEY = "koreanAccessToken";
const USER_KEY = "koreanUser";
const SAVED_EMAIL_KEY = "koreanSavedEmail";

/**
 * 세션이 서버에서 거절돼 지웠다는 알림.
 *
 * 전에는 401 이 오면 토큰만 지우고 끝냈다. 그런데 `koreanUser` 가 남아서
 * SignProvider 의 `user !== null` 이 참으로 유지됐고, 라우트 가드
 * (`main.tsx` 의 `!isSignedIn`)도 React 상태를 안 보므로 돌지 않았다.
 * 결과는 **토큰 없이 로그인 상태로 믿는 앱**이고, 이후 모든 요청이 헤더 없이
 * 나가 401 을 반복했다(2026-08-26 에 실제로 관측했다).
 *
 * 그래서 저장소를 정리하고 이 이벤트를 쏜다. SignProvider 가 받아 상태를
 * 내리면 가드가 조용히 로그인으로 보낸다 — 만료 안내 화면은 두지 않기로 했다.
 */
export const SESSION_CLEARED_EVENT = "auth:session-cleared";
const KOREAN_GUEST_ID = "koreanGuestId";

/*
 * localStorage 는 무엇을 넣어도 문자열로 바꿔 넣는다. 그래서 값이 없을 때
 * 넣으면 문자열 "undefined" 가 저장되고, 그 뒤로는 있는 것처럼 보이면서
 * 전부 실패한다. 실제로 두 번 났다 — 토큰이 "undefined" 라서 모든 요청이
 * Bearer undefined 로 나갔고, koreanUser 가 "undefined" 라서
 * JSON.parse 가 던져 앱이 부팅마다 죽었다.
 *
 * 읽을 때도 걸러 낸다. 이미 그 값이 들어 있는 기기가 있고, 그 기기는
 * 저장소를 직접 비우지 않으면 앱을 쓸 수 없기 때문이다.
 */
const BAD = new Set(["", "undefined", "null", "NaN"]);

function readClean(key: string): string | null {
	const v = localStorage.getItem(key);
	if (v === null) return null;
	if (BAD.has(v)) {
		localStorage.removeItem(key);
		return null;
	}
	return v;
}

function writeClean(key: string, value: string | null | undefined): void {
	if (typeof value !== "string" || BAD.has(value)) {
		localStorage.removeItem(key);
		return;
	}
	localStorage.setItem(key, value);
}

export function getAccessToken(): string | null {
	return readClean(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
	writeClean(ACCESS_TOKEN_KEY, token);
}

export function removeAccessToken(): void {
	localStorage.removeItem(ACCESS_TOKEN_KEY);
}

/**
 * 아이디 저장 — 로그인 화면에 이메일을 미리 채우기 위한 것.
 *
 * 웹앱이라 학습자가 앱을 띄워 두지 않는다. 토큰은 30일이지만
 * (`signJwt` 의 exp, `dev_spec_v1`) 그보다 오래 쉬면 다시 타이핑해야 한다.
 * **비밀번호는 저장하지 않는다** — 이메일만이다.
 */
export function getSavedEmail(): string | null {
	return readClean(SAVED_EMAIL_KEY);
}

export function setSavedEmail(email: string): void {
	writeClean(SAVED_EMAIL_KEY, email);
}

export function removeSavedEmail(): void {
	localStorage.removeItem(SAVED_EMAIL_KEY);
}

export function getGuestId(): string | null {
	return readClean(KOREAN_GUEST_ID);
}

export function setGuestId(guestId: string): void {
	writeClean(KOREAN_GUEST_ID, guestId);
}

export function removeGuestId(): void {
	localStorage.removeItem(KOREAN_GUEST_ID);
}

export async function authFetch(
	endpoint: string,
	init: RequestInit = {},
): Promise<Response> {
	const token = getAccessToken();
	const headers = new Headers(init.headers);

	if (token) {
		headers.set("Authorization", `Bearer ${token}`);
	}

	if (
		!headers.has("Content-Type") &&
		init.body &&
		typeof init.body === "string"
	) {
		headers.set("Content-Type", "application/json");
	}

	const url = `${BASE_URL}${endpoint}`;
	const response = await fetch(url, { ...init, headers });

	if (response.status === 401 || response.status === 403) {
		// 토큰과 사용자를 **같이** 지운다. 하나만 지우면 앱이 반쪽 상태가 된다.
		// guestId 는 남긴다 — 게스트의 서버 기록을 가리키는 이름이라,
		// 지우면 나중에 계정으로 옮길 길이 끊긴다(BLOCKERS §6-d).
		removeAccessToken();
		localStorage.removeItem(USER_KEY);
		window.dispatchEvent(new Event(SESSION_CLEARED_EVENT));
	}

	return response;
}

type RequestOptions = Omit<RequestInit, "body" | "method">;

async function handleResponse<T>(
	response: Response,
): Promise<ServerResponse<T>> {
	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(errorText || `HTTP error! Status: ${response.status}`);
	}

	const contentType = response.headers.get("content-type");
	if (contentType?.includes("application/json")) {
		return response.json() as Promise<ServerResponse<T>>;
	}

	return { result: false, code: response.status, message: null, data: null };
}

function jsonBody(data: unknown): string | undefined {
	return data ? JSON.stringify(data) : undefined;
}

export const api = {
	get: async <T>(
		endpoint: string,
		options?: RequestOptions,
	): Promise<ServerResponse<T>> => {
		const response = await authFetch(endpoint, {
			...options,
			method: "GET",
		});
		return handleResponse<T>(response);
	},

	post: async <T>(
		endpoint: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		data?: any,
		options?: RequestOptions,
	): Promise<ServerResponse<T>> => {
		const response = await authFetch(endpoint, {
			...options,
			method: "POST",
			body: jsonBody(data),
		});
		return handleResponse<T>(response);
	},

	put: async <T>(
		endpoint: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		data?: any,
		options?: RequestOptions,
	): Promise<ServerResponse<T>> => {
		const response = await authFetch(endpoint, {
			...options,
			method: "PUT",
			body: jsonBody(data),
		});
		return handleResponse<T>(response);
	},

	delete: async <T = Record<string, never>>(
		endpoint: string,
		options?: RequestOptions,
	): Promise<ServerResponse<T>> => {
		const response = await authFetch(endpoint, {
			...options,
			method: "DELETE",
		});
		return handleResponse<T>(response);
	},

	patch: async <T>(
		endpoint: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		data?: any,
		options?: RequestOptions,
	): Promise<ServerResponse<T>> => {
		const response = await authFetch(endpoint, {
			...options,
			method: "PATCH",
			body: jsonBody(data),
		});
		return handleResponse<T>(response);
	},

	fetch: async (
		endpoint: string,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		data?: any,
		options?: RequestOptions,
	): Promise<Response> => {
		return authFetch(endpoint, {
			...options,
			method: "POST",
			body: jsonBody(data),
		});
	},
};

/**
 * 응답이 **배열이라고 약속한 자리**에서 모양을 확인한다.
 *
 * 래퍼 대부분이 `if (!res.result || !res.data) return []; return res.data;` 꼴이다.
 * 없는 것은 막지만 **모양이 틀린 것은 못 막는다** — 서버가 `{}` 를 주면 truthy 라
 * 그대로 흘러가고, 받는 쪽 `.map` 이 터진다. 화면은 조용히 죽고 콘솔에만 남는다.
 * 2026-08-26 에 `review-queue` 가 그렇게 다섯 자리를 한꺼번에 터뜨렸다.
 *
 * 막는 자리는 **부르는 쪽이 아니라 여기**다 — 부르는 곳마다 `?? []` 를 흩뿌리면
 * 새로 부르는 곳이 또 빠뜨린다.
 */
export function asArray<T>(data: unknown): T[] {
	return Array.isArray(data) ? (data as T[]) : [];
}
