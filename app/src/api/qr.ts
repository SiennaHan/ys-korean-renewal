import { env } from "@/config/env";
import { api } from "./api";

export type QrRedirectResult = "web_redirect" | "failed";

export interface QrScan {
	trackingId: string;
	scannedAt: string;
	isUnique: boolean;
}

export async function createQrScan(accessUrl: string): Promise<QrScan> {
	const response = await api.post<QrScan>("/qr/scan", { accessUrl });
	if (!response.result || !response.data) {
		throw new Error(response.message || "Failed to register QR scan");
	}
	return response.data;
}

export async function reportQrRedirect(
	trackingId: string,
	result: QrRedirectResult,
): Promise<void> {
	const endpoint = `/qr/scan/${encodeURIComponent(trackingId)}/redirect/${result}`;
	const url = `${env.KOREAN_API_URL}${endpoint}`;
	if (typeof navigator !== "undefined" && navigator.sendBeacon?.(url)) {
		return;
	}

	const response = await fetch(url, {
		method: "POST",
		keepalive: true,
	});
	if (!response.ok) {
		throw new Error(`Failed to report QR redirect: ${response.status}`);
	}
}
