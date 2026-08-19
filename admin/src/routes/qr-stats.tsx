import {
	getQrStats,
	type QrDailyStat,
	type QrScanItem,
	type QrStatsResponse,
} from "@/api/qr-stats";
import { createFileRoute } from "@tanstack/react-router";
import {
	ChartNoAxesCombined,
	ChevronLeft,
	ChevronRight,
	Globe2,
	MousePointerClick,
	RefreshCw,
	ScanLine,
	UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export const Route = createFileRoute("/qr-stats")({
	component: QrStatsPage,
});

const DAY_OPTIONS = [7, 30, 90] as const;
const PAGE_SIZE = 30;

function formatNumber(value: number) {
	return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDateTime(value: string) {
	const date = new Date(`${value}Z`);
	if (Number.isNaN(date.getTime())) {
		return value;
	}
	return date.toLocaleString("ko-KR", {
		year: "2-digit",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function getEnvironmentLabel(userAgent: string) {
	let os = "기타";
	if (/iphone|ipad|ipod/i.test(userAgent)) os = "iOS";
	else if (/android/i.test(userAgent)) os = "Android";
	else if (/windows/i.test(userAgent)) os = "Windows";
	else if (/macintosh|mac os/i.test(userAgent)) os = "macOS";
	else if (/linux/i.test(userAgent)) os = "Linux";

	let browser = "브라우저";
	if (/edg\//i.test(userAgent)) browser = "Edge";
	else if (/chrome|crios/i.test(userAgent)) browser = "Chrome";
	else if (/firefox|fxios/i.test(userAgent)) browser = "Firefox";
	else if (/safari/i.test(userAgent)) browser = "Safari";
	return `${os} · ${browser}`;
}

function formatAccessUrl(value: string) {
	if (!value || value === "unknown") {
		return "알 수 없음";
	}
	try {
		const url = new URL(value);
		return `${url.host}${url.pathname}${url.search}`;
	} catch {
		return value;
	}
}

function DailyChart({ items }: { items: QrDailyStat[] }) {
	const maxValue = Math.max(1, ...items.map((item) => item.scans));
	const labelStep = items.length <= 14 ? 1 : items.length <= 31 ? 5 : 15;

	return (
		<div className="overflow-x-auto overflow-y-hidden pb-1">
			<div
				className="flex h-52 min-w-full items-end gap-1.5 border-gray-100 border-b px-1 pt-8"
				style={{ width: `${Math.max(700, items.length * 18)}px` }}
			>
				{items.map((item, index) => (
					<div
						className="group relative flex h-[calc(100%-1.5rem)] min-w-0 flex-1 items-end justify-center gap-px"
						key={item.date}
					>
						<div className="pointer-events-none absolute top-0 z-10 hidden whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-white text-xs shadow group-hover:block">
							{item.date} · 전체 {formatNumber(item.scans)} · 고유{" "}
							{formatNumber(item.uniqueScans)}
						</div>
						<div
							className="w-2/5 rounded-t bg-violet-400 transition group-hover:bg-violet-500"
							style={{
								height: `${Math.max(2, (item.scans / maxValue) * 100)}%`,
							}}
						/>
						<div
							className="w-2/5 rounded-t bg-cyan-400 transition group-hover:bg-cyan-500"
							style={{
								height: `${Math.max(2, (item.uniqueScans / maxValue) * 100)}%`,
							}}
						/>
						{index % labelStep === 0 && (
							<span className="absolute top-full mt-2 whitespace-nowrap text-[10px] text-gray-400">
								{item.date.slice(5).replace("-", "/")}
							</span>
						)}
					</div>
				))}
			</div>
		</div>
	);
}

function RankingBars({
	items,
}: {
	items: { label: string; value: number }[];
}) {
	const maxValue = Math.max(1, ...items.map((item) => item.value));
	if (items.length === 0) {
		return (
			<div className="py-12 text-center text-gray-400 text-sm">
				데이터가 없습니다.
			</div>
		);
	}
	return (
		<div className="space-y-3">
			{items.map((item) => (
				<div key={item.label}>
					<div className="mb-1 flex items-center justify-between gap-3 text-sm">
						<span className="truncate text-gray-700">{item.label}</span>
						<span className="font-semibold text-gray-900">
							{formatNumber(item.value)}
						</span>
					</div>
					<div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
						<div
							className="h-full rounded-full bg-violet-400"
							style={{ width: `${(item.value / maxValue) * 100}%` }}
						/>
					</div>
				</div>
			))}
		</div>
	);
}

function RedirectBadge({ result }: { result: QrScanItem["redirectResult"] }) {
	const styles = {
		web_redirect: "bg-emerald-100 text-emerald-700",
		pending: "bg-amber-100 text-amber-700",
		failed: "bg-rose-100 text-rose-700",
		deep_link_success: "bg-blue-100 text-blue-700",
		store_redirect: "bg-gray-100 text-gray-600",
	};
	const labels = {
		web_redirect: "이동 완료",
		pending: "처리 중",
		failed: "실패",
		deep_link_success: "앱 이동(이전)",
		store_redirect: "스토어(이전)",
	};
	return (
		<span
			className={`rounded-full px-2 py-1 font-medium text-xs ${styles[result]}`}
		>
			{labels[result]}
		</span>
	);
}

function QrStatsPage() {
	const [days, setDays] = useState<(typeof DAY_OPTIONS)[number]>(30);
	const [page, setPage] = useState(0);
	const [data, setData] = useState<QrStatsResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			setData(await getQrStats(days, PAGE_SIZE, page * PAGE_SIZE));
		} catch (loadError) {
			setError(
				loadError instanceof Error
					? loadError.message
					: "통계를 불러오지 못했습니다.",
			);
		} finally {
			setLoading(false);
		}
	}, [days, page]);

	useEffect(() => {
		void load();
	}, [load]);

	const summary = data?.summary;
	const recent = data?.recent;
	const totalPages = Math.max(1, Math.ceil((recent?.total ?? 0) / PAGE_SIZE));

	return (
		<div className="mx-auto max-w-7xl space-y-6">
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="flex items-center gap-2 font-bold text-2xl text-gray-900">
						<ChartNoAxesCombined className="h-6 w-6 text-violet-500" />
						QR 접속 통계
					</h1>
					<p className="mt-1 text-gray-500 text-sm">
						로그인하지 않은 사용자의 QR 스캔과 웹 페이지 이동 현황입니다.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
						{DAY_OPTIONS.map((option) => (
							<button
								className={`rounded-md px-3 py-1.5 font-medium text-sm transition ${
									days === option
										? "bg-violet-500 text-white"
										: "text-gray-500 hover:bg-gray-50"
								}`}
								key={option}
								onClick={() => {
									setDays(option);
									setPage(0);
								}}
								type="button"
							>
								{option}일
							</button>
						))}
					</div>
					<button
						className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-600 text-sm hover:bg-gray-50"
						onClick={() => void load()}
						type="button"
					>
						<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
						새로고침
					</button>
				</div>
			</header>

			{error && (
				<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm">
					{error}
				</div>
			)}

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{[
					{
						label: "누적 스캔",
						value: summary?.totalScans ?? 0,
						detail: `누적 고유 ${formatNumber(summary?.totalVisitors ?? 0)}명`,
						icon: ScanLine,
						color: "text-violet-600 bg-violet-50",
					},
					{
						label: "오늘 스캔",
						value: summary?.todayScans ?? 0,
						detail: "한국 시간 기준",
						icon: MousePointerClick,
						color: "text-blue-600 bg-blue-50",
					},
					{
						label: `${days}일 고유 방문자`,
						value: summary?.periodUniqueScans ?? 0,
						detail: `전체 ${formatNumber(summary?.periodScans ?? 0)}회`,
						icon: UsersRound,
						color: "text-cyan-600 bg-cyan-50",
					},
					{
						label: "웹 이동률",
						value: `${summary?.redirectRate ?? 0}%`,
						detail: `${formatNumber(summary?.webRedirects ?? 0)}회 이동`,
						icon: Globe2,
						color: "text-emerald-600 bg-emerald-50",
					},
				].map((card) => (
					<div
						className="rounded-2xl border border-gray-200 bg-white p-5"
						key={card.label}
					>
						<div className="flex items-start justify-between">
							<div>
								<p className="text-gray-500 text-sm">{card.label}</p>
								<p className="mt-2 font-bold text-3xl text-gray-900">
									{typeof card.value === "number"
										? formatNumber(card.value)
										: card.value}
								</p>
								<p className="mt-1 text-gray-400 text-xs">{card.detail}</p>
							</div>
							<div className={`rounded-xl p-2.5 ${card.color}`}>
								<card.icon className="h-5 w-5" />
							</div>
						</div>
					</div>
				))}
			</div>

			<section className="rounded-2xl border border-gray-200 bg-white p-5">
				<div className="mb-2 flex items-center justify-between">
					<div>
						<h2 className="font-semibold text-gray-900">일별 스캔 추이</h2>
						<p className="mt-0.5 text-gray-400 text-xs">한국 시간 기준</p>
					</div>
					<div className="flex items-center gap-3 text-gray-500 text-xs">
						<span className="flex items-center gap-1">
							<i className="h-2.5 w-2.5 rounded-sm bg-violet-400" />
							전체
						</span>
						<span className="flex items-center gap-1">
							<i className="h-2.5 w-2.5 rounded-sm bg-cyan-400" />
							고유
						</span>
					</div>
				</div>
				<DailyChart items={data?.daily ?? []} />
			</section>

			<div className="grid gap-4 lg:grid-cols-2">
				<section className="rounded-2xl border border-gray-200 bg-white p-5 lg:col-span-2">
					<h2 className="mb-5 font-semibold text-gray-900">접속 주소별 스캔</h2>
					<RankingBars
						items={(data?.accessUrls ?? []).map((item) => ({
							label: formatAccessUrl(item.accessUrl),
							value: item.scans,
						}))}
					/>
				</section>
				<section className="rounded-2xl border border-gray-200 bg-white p-5">
					<h2 className="mb-5 font-semibold text-gray-900">국가별 스캔</h2>
					<RankingBars
						items={(data?.countries ?? []).map((item) => ({
							label: item.country === "Unknown" ? "알 수 없음" : item.country,
							value: item.scans,
						}))}
					/>
				</section>
				<section className="rounded-2xl border border-gray-200 bg-white p-5">
					<h2 className="mb-5 font-semibold text-gray-900">도시별 스캔</h2>
					<RankingBars
						items={(data?.cities ?? []).map((item) => ({
							label:
								item.city === "Unknown"
									? "알 수 없음"
									: `${item.city} · ${item.country}`,
							value: item.scans,
						}))}
					/>
				</section>
			</div>

			<section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
				<div className="flex items-center justify-between border-gray-100 border-b px-5 py-4">
					<div>
						<h2 className="font-semibold text-gray-900">최근 스캔 기록</h2>
						<p className="mt-0.5 text-gray-400 text-xs">
							IP 저장 방식: {data?.ipStorage === "raw" ? "원문" : "HMAC 해시"}
						</p>
					</div>
					<span className="text-gray-400 text-sm">
						총 {formatNumber(recent?.total ?? 0)}건
					</span>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead className="bg-gray-50 text-gray-500 text-xs">
							<tr>
								<th className="px-4 py-3 font-medium">스캔 시각</th>
								<th className="px-4 py-3 font-medium">접속 주소</th>
								<th className="px-4 py-3 font-medium">위치</th>
								<th className="px-4 py-3 font-medium">환경</th>
								<th className="px-4 py-3 font-medium">IP</th>
								<th className="px-4 py-3 text-center font-medium">구분</th>
								<th className="px-4 py-3 text-center font-medium">결과</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{(recent?.items ?? []).map((item) => (
								<tr className="hover:bg-gray-50/70" key={item.id}>
									<td className="whitespace-nowrap px-4 py-3 text-gray-600">
										{formatDateTime(item.scannedAt)}
									</td>
									<td
										className="max-w-64 truncate px-4 py-3 text-gray-600"
										title={item.accessUrl}
									>
										{formatAccessUrl(item.accessUrl)}
									</td>
									<td className="whitespace-nowrap px-4 py-3 text-gray-600">
										{item.geoCity || item.geoCountry
											? [item.geoCity, item.geoCountry]
													.filter(Boolean)
													.join(", ")
											: "알 수 없음"}
									</td>
									<td
										className="px-4 py-3 text-gray-600"
										title={item.userAgent}
									>
										{getEnvironmentLabel(item.userAgent)}
									</td>
									<td
										className="max-w-36 truncate px-4 py-3 font-mono text-gray-400 text-xs"
										title={item.ipAddress}
									>
										{data?.ipStorage === "hashed"
											? `${item.ipAddress.slice(0, 12)}…`
											: item.ipAddress}
									</td>
									<td className="px-4 py-3 text-center">
										<span
											className={`rounded-full px-2 py-1 font-medium text-xs ${item.isUnique ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}
										>
											{item.isUnique ? "최초" : "재스캔"}
										</span>
									</td>
									<td className="px-4 py-3 text-center">
										<RedirectBadge result={item.redirectResult} />
									</td>
								</tr>
							))}
							{!loading && (recent?.items.length ?? 0) === 0 && (
								<tr>
									<td
										className="px-4 py-12 text-center text-gray-400"
										colSpan={7}
									>
										스캔 기록이 없습니다.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
				<div className="flex items-center justify-between border-gray-100 border-t px-5 py-3">
					<span className="text-gray-400 text-xs">
						{page + 1} / {totalPages} 페이지
					</span>
					<div className="flex gap-1">
						<button
							className="rounded-lg border border-gray-200 p-2 text-gray-500 disabled:opacity-30"
							disabled={page === 0}
							onClick={() => setPage((value) => Math.max(0, value - 1))}
							type="button"
						>
							<ChevronLeft className="h-4 w-4" />
						</button>
						<button
							className="rounded-lg border border-gray-200 p-2 text-gray-500 disabled:opacity-30"
							disabled={page + 1 >= totalPages}
							onClick={() => setPage((value) => value + 1)}
							type="button"
						>
							<ChevronRight className="h-4 w-4" />
						</button>
					</div>
				</div>
			</section>
		</div>
	);
}
