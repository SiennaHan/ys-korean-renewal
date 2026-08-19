import type { ServerResponse } from "./apiType";
import { env } from "@/config/env";

const BASE_URL: string = env.ADMIN_API_URL;
const ACCESS_TOKEN_KEY = "adminAccessToken";

export function getAccessToken(): string | null {
	return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
	localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function removeAccessToken(): void {
	localStorage.removeItem(ACCESS_TOKEN_KEY);
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
		window.location.href = "/login";
	}

	return response;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
	body?: BodyInit | null;
}

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
	return {} as ServerResponse<T>;
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
		data?: unknown,
		options?: RequestOptions,
	): Promise<ServerResponse<T>> => {
		const response = await authFetch(endpoint, {
			...options,
			method: "POST",
			body: data ? JSON.stringify(data) : undefined,
		});
		return handleResponse<T>(response);
	},

	patch: async <T>(
		endpoint: string,
		data?: unknown,
		options?: RequestOptions,
	): Promise<ServerResponse<T>> => {
		const response = await authFetch(endpoint, {
			...options,
			method: "PATCH",
			body: data ? JSON.stringify(data) : undefined,
		});
		return handleResponse<T>(response);
	},

	delete: async <T = object>(
		endpoint: string,
		options?: RequestOptions,
	): Promise<ServerResponse<T>> => {
		const response = await authFetch(endpoint, {
			...options,
			method: "DELETE",
		});
		return handleResponse<T>(response);
	},

	upload: async <T>(
		endpoint: string,
		formData: FormData,
	): Promise<ServerResponse<T>> => {
		const token = getAccessToken();
		const headers = new Headers();
		if (token) {
			headers.set("Authorization", `Bearer ${token}`);
		}
		const url = `${BASE_URL}${endpoint}`;
		const response = await fetch(url, {
			method: "POST",
			headers,
			body: formData,
		});
		return handleResponse<T>(response);
	},
};
