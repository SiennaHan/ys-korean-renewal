import type { ServerResponse } from "./apiType";
import { env } from "@/config/env";

const BASE_URL: string = env.KOREAN_API_URL;

export interface LoginCredentials {
	username: string;
	password: string;
}

const ACCESS_TOKEN_KEY = "koreanAccessToken";
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
		removeAccessToken();
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
