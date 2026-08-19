import type { ServerResponse } from "./apiType";
import { env } from "@/config/env";

const BASE_URL: string = env.KOREAN_API_URL;

export interface LoginCredentials {
	username: string;
	password: string;
}

const ACCESS_TOKEN_KEY = "koreanAccessToken";
const KOREAN_GUEST_ID = "koreanGuestId";

export function getAccessToken(): string | null {
	return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
	localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function removeAccessToken(): void {
	localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function getGuestId(): string | null {
	return localStorage.getItem(KOREAN_GUEST_ID);
}

export function setGuestId(guestId: string): void {
	localStorage.setItem(KOREAN_GUEST_ID, guestId);
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
