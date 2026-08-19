import { api } from "./api";

export interface QrSummary {
	totalScans: number;
	totalVisitors: number;
	periodScans: number;
	periodUniqueScans: number;
	todayScans: number;
	webRedirects: number;
	redirectRate: number;
}

export interface QrDailyStat {
	date: string;
	scans: number;
	uniqueScans: number;
}

export interface QrCountryStat {
	country: string;
	scans: number;
}

export interface QrCityStat {
	country: string;
	city: string;
	scans: number;
}

export interface QrAccessUrlStat {
	accessUrl: string;
	scans: number;
}

export interface QrScanItem {
	id: number;
	scannedAt: string;
	accessUrl: string;
	ipAddress: string;
	geoCountry: string | null;
	geoCity: string | null;
	userAgent: string;
	isUnique: boolean;
	redirectResult:
		| "pending"
		| "web_redirect"
		| "failed"
		| "deep_link_success"
		| "store_redirect";
}

export interface QrStatsResponse {
	days: number;
	summary: QrSummary;
	daily: QrDailyStat[];
	countries: QrCountryStat[];
	cities: QrCityStat[];
	accessUrls: QrAccessUrlStat[];
	recent: {
		items: QrScanItem[];
		total: number;
		limit: number;
		offset: number;
	};
	ipStorage: "raw" | "hashed";
}

export async function getQrStats(days: number, limit: number, offset: number) {
	const response = await api.get<QrStatsResponse>(
		`/qr/admin/stats?days=${days}&limit=${limit}&offset=${offset}`,
	);
	if (!response.result || !response.data) {
		throw new Error(response.message || "QR 통계를 불러오지 못했습니다.");
	}
	return response.data;
}
