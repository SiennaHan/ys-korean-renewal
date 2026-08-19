import { api } from "@/api/api";
import { createFileRoute } from "@tanstack/react-router";
import { AudioLines, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export const Route = createFileRoute("/stt-shadow")({
	component: SttShadowPage,
});

interface ShadowItem {
	id: number;
	user_id: string | null;
	audio_url: string | null;
	openai_text: string | null;
	openai_model: string | null;
	rtzr_text: string | null;
	rtzr_model: string | null;
	tutorus_text: string | null;
	tutorus_model: string | null;
	openai_ms: number | null;
	rtzr_ms: number | null;
	tutorus_ms: number | null;
	is_match: boolean | null;
	diff_kind: "match" | "ortho" | "content" | "na" | null;
	openai_error: string | null;
	rtzr_error: string | null;
	tutorus_error: string | null;
	created_at: string;
}

interface ShadowListResp {
	items: ShadowItem[];
	total: number;
	limit: number;
	offset: number;
	evaluated: number;
	mismatch: number;
	ortho: number;
	content: number;
}

/** Tutorus korpron 발음평가 결과 (온디맨드, 저장하지 않음) */
interface PronResult {
	score: {
		overall?: number;
		segment?: number;
		speed?: number;
		prosody?: number;
		acoustic?: number;
	};
	weakWords: { index: number; text: string; score: number | null }[];
	/** 채점 기준으로 쓴 문장 (= OpenAI 전사문) */
	reference: string;
}

type PronState = {
	loading?: boolean;
	data?: PronResult;
	error?: string;
};

type FilterKind = "all" | "mismatch" | "ortho" | "content";

const FILTERS: { key: FilterKind; label: string }[] = [
	{ key: "all", label: "전체" },
	{ key: "mismatch", label: "불일치" },
	{ key: "ortho", label: "표기차이" },
	{ key: "content", label: "내용차이" },
];

const PAGE_SIZE = 30;

/** self 문자열에서 other 와 공통되지 않는 중간 구간을 분리 (끝 종결어미 차이 시각화용) */
function diffParts(self: string, other: string) {
	const a = self ?? "";
	const b = other ?? "";
	let p = 0;
	while (p < a.length && p < b.length && a[p] === b[p]) p++;
	let s = 0;
	while (
		s < a.length - p &&
		s < b.length - p &&
		a[a.length - 1 - s] === b[b.length - 1 - s]
	)
		s++;
	return {
		prefix: a.slice(0, p),
		mid: a.slice(p, a.length - s),
		suffix: a.slice(a.length - s),
	};
}

function DiffText({
	text,
	other,
	tone,
}: {
	text: string | null;
	other: string | null;
	tone: "openai" | "rtzr" | "tutorus";
}) {
	if (text == null) return <span className="text-gray-400 italic">—</span>;
	const { prefix, mid, suffix } = diffParts(text, other ?? "");
	const hl =
		tone === "rtzr"
			? "bg-sky-100 text-sky-700"
			: tone === "tutorus"
				? "bg-violet-100 text-violet-700"
				: "bg-emerald-100 text-emerald-700";
	return (
		<span className="break-words text-gray-800 text-sm leading-relaxed">
			{prefix}
			{mid && (
				<span className={`rounded px-0.5 font-semibold ${hl}`}>{mid}</span>
			)}
			{suffix}
		</span>
	);
}

/** 점수대별 색. KO_* 지표는 30~100 범위라 그에 맞춰 구간을 나눈다. */
function scoreColor(score: number) {
	if (score >= 85) return "text-emerald-600";
	if (score >= 70) return "text-sky-600";
	if (score >= 55) return "text-amber-600";
	return "text-rose-600";
}

/** 발음평가 결과 셀 — 종합 점수 + 세부 지표 + 취약 단어 */
function PronCell({
	state,
	onRun,
}: {
	state: PronState | undefined;
	onRun: () => void;
}) {
	if (state?.loading) {
		return (
			<span className="inline-flex items-center gap-1.5 text-gray-400 text-xs">
				<Loader2 className="h-3.5 w-3.5 animate-spin" />
				평가 중…
			</span>
		);
	}

	if (state?.error) {
		return (
			<div>
				<div className="break-words text-amber-600 text-xs">
					⚠ {state.error}
				</div>
				<button
					type="button"
					onClick={onRun}
					className="mt-1 text-gray-400 text-xs underline hover:text-gray-600"
				>
					다시 시도
				</button>
			</div>
		);
	}

	if (!state?.data) {
		return (
			<button
				type="button"
				onClick={onRun}
				className="whitespace-nowrap rounded-lg border border-gray-200 px-2.5 py-1 text-gray-600 text-xs transition hover:bg-gray-50"
			>
				발음평가
			</button>
		);
	}

	const { score, weakWords, reference } = state.data;
	const overall = score.overall;

	return (
		// 채점 기준(= OpenAI 전사문)을 title 로 노출 — 무엇에 대한 점수인지 확인용
		<div title={`기준 문장: ${reference}`}>
			{typeof overall === "number" && (
				<div
					className={`font-bold text-lg leading-none ${scoreColor(overall)}`}
				>
					{Math.round(overall)}
				</div>
			)}
			<div className="mt-1 whitespace-nowrap text-gray-400 text-xs">
				음소 {score.segment ?? "-"} · 속도 {score.speed ?? "-"} · 억양{" "}
				{score.prosody ?? "-"}
			</div>
			{weakWords.length > 0 && (
				<div className="mt-1 flex flex-wrap gap-1">
					{weakWords.map((w) => (
						<span
							key={w.index}
							className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-600 text-xs"
						>
							{w.text}
						</span>
					))}
				</div>
			)}
		</div>
	);
}

function formatTime(iso: string) {
	// DB의 UTC timestamp → 로컬 표시
	const d = new Date(`${iso}Z`);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleString("ko-KR", {
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function KindBadge({ kind }: { kind: ShadowItem["diff_kind"] }) {
	if (kind == null || kind === "na")
		return <span className="text-gray-300">-</span>;
	const map = {
		match: { label: "일치", cls: "bg-emerald-100 text-emerald-700" },
		ortho: { label: "표기차이", cls: "bg-amber-100 text-amber-700" },
		content: { label: "내용차이", cls: "bg-rose-100 text-rose-700" },
	} as const;
	const { label, cls } = map[kind];
	return (
		<span
			className={`whitespace-nowrap rounded-full px-2 py-0.5 font-medium text-xs ${cls}`}
		>
			{label}
		</span>
	);
}

function SttShadowPage() {
	const [data, setData] = useState<ShadowListResp | null>(null);
	const [loading, setLoading] = useState(false);
	const [kind, setKind] = useState<FilterKind>("all");
	const [page, setPage] = useState(0);
	/** 행별 발음평가 상태 (온디맨드 — 누른 행만 계산, 저장하지 않음) */
	const [pron, setPron] = useState<Record<number, PronState>>({});

	const runPron = useCallback(async (id: number) => {
		setPron((prev) => ({ ...prev, [id]: { loading: true } }));
		try {
			const res = await api.post<PronResult>(
				`/tutorus/pronunciation/shadow/${id}`,
				{},
			);
			if (!res.result || !res.data) {
				setPron((prev) => ({
					...prev,
					[id]: { error: res.message ?? "평가 실패" },
				}));
				return;
			}
			setPron((prev) => ({ ...prev, [id]: { data: res.data as PronResult } }));
		} catch (e) {
			setPron((prev) => ({
				...prev,
				[id]: { error: (e as Error)?.message ?? "평가 실패" },
			}));
		}
	}, []);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await api.get<ShadowListResp>(
				`/stt/shadow/list?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}&kind=${kind}`,
			);
			setData(res.data ?? null);
		} catch (e) {
			console.error("shadow list failed:", e);
		} finally {
			setLoading(false);
		}
	}, [page, kind]);

	useEffect(() => {
		void load();
	}, [load]);

	const items = data?.items ?? [];
	const total = data?.total ?? 0;
	const evaluated = data?.evaluated ?? 0;
	const mismatch = data?.mismatch ?? 0;
	const ortho = data?.ortho ?? 0;
	const mismatchRate =
		evaluated > 0 ? ((mismatch / evaluated) * 100).toFixed(1) : "0.0";
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	return (
		<div>
			<div className="mb-6 flex items-start justify-between">
				<div>
					<h1 className="flex items-center gap-2 font-bold text-2xl text-gray-900">
						<AudioLines className="h-6 w-6 text-violet-500" />
						STT 비교 (OpenAI vs Tutorus vs VITO)
					</h1>
					<p className="mt-1 text-gray-500 text-sm">
						실사용 음성에 대해 OpenAI(현행)·Tutorus·VITO(리턴제로) 전사를 병렬
						기록합니다. 오디오를 직접 들어보고 어느 쪽이 정확한지 판단하세요.
						Tutorus 는 비원어민 발음을 교정하지 않고 들리는 대로 받아적으므로,
						다른 둘과 다르게 나오는 것이 정상입니다(발음 오류 진단용).
					</p>
				</div>
				<button
					type="button"
					onClick={() => void load()}
					className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-gray-600 text-sm transition hover:bg-gray-50"
				>
					<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
					새로고침
				</button>
			</div>

			{/* 요약 */}
			<div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
				<div className="rounded-xl border border-gray-200 bg-white p-4">
					<div className="text-gray-500 text-xs">평가됨 (OpenAI 성공)</div>
					<div className="mt-1 font-bold text-gray-900 text-xl">
						{evaluated}
						<span className="ml-1 font-normal text-gray-400 text-sm">
							/ {total}
						</span>
					</div>
				</div>
				<div className="rounded-xl border border-gray-200 bg-white p-4">
					<div className="text-gray-500 text-xs">불일치율</div>
					<div className="mt-1 font-bold text-rose-600 text-xl">
						{mismatchRate}%{" "}
						<span className="font-normal text-gray-400 text-sm">
							({mismatch})
						</span>
					</div>
				</div>
				<div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
					<div className="text-amber-700 text-xs">표기차이 (되/돼·자소 등)</div>
					<div className="mt-1 font-bold text-amber-700 text-xl">{ortho}</div>
				</div>
				<div className="rounded-xl border border-gray-200 bg-white p-4">
					<div className="text-gray-500 text-xs">내용차이</div>
					<div className="mt-1 font-bold text-gray-900 text-xl">
						{data?.content ?? 0}
					</div>
				</div>
			</div>

			{/* 필터 */}
			<div className="mb-3 inline-flex rounded-lg border border-gray-200 p-0.5">
				{FILTERS.map((f) => (
					<button
						key={f.key}
						type="button"
						onClick={() => {
							setPage(0);
							setKind(f.key);
						}}
						className={`rounded-md px-3 py-1.5 font-medium text-sm transition ${
							kind === f.key
								? "bg-violet-500 text-white"
								: "text-gray-500 hover:bg-gray-50"
						}`}
					>
						{f.label}
					</button>
				))}
			</div>

			{/* 표 */}
			<div className="overflow-hidden rounded-xl border border-gray-200">
				<table className="w-full text-left text-sm">
					<thead className="bg-gray-50 text-gray-500 text-xs">
						<tr>
							<th className="px-3 py-2.5 font-medium">시간</th>
							<th className="px-3 py-2.5 font-medium">오디오</th>
							<th className="px-3 py-2.5 font-medium">OpenAI (현행)</th>
							<th className="px-3 py-2.5 font-medium">Tutorus (비원어민)</th>
							<th className="px-3 py-2.5 font-medium">VITO (리턴제로)</th>
							<th className="px-3 py-2.5 text-center font-medium">유형</th>
							<th className="px-3 py-2.5 font-medium">발음평가</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100">
						{items.length === 0 && (
							<tr>
								<td
									colSpan={8}
									className="px-3 py-10 text-center text-gray-400"
								>
									{loading ? "불러오는 중…" : "기록이 없습니다."}
								</td>
							</tr>
						)}
						{items.map((it) => (
							<tr key={it.id} className="align-top hover:bg-gray-50/60">
								<td className="whitespace-nowrap px-3 py-3 text-gray-500 text-xs">
									{formatTime(it.created_at)}
								</td>
								<td className="px-3 py-3">
									{it.audio_url ? (
										// biome-ignore lint/a11y/useMediaCaption: 학생 발화 원본, 캡션 없음
										<audio
											controls
											preload="none"
											src={it.audio_url}
											className="h-8 w-44"
										/>
									) : (
										<span className="text-gray-400 text-xs">없음</span>
									)}
								</td>
								<td className="px-3 py-3">
									{it.openai_error ? (
										<span className="break-words text-amber-600 text-xs">
											⚠ {it.openai_error}
										</span>
									) : (
										<>
											<DiffText
												text={it.openai_text}
												other={it.rtzr_text}
												tone="openai"
											/>
											{it.openai_ms != null && (
												<div className="mt-1 text-gray-400 text-xs">
													{it.openai_ms}ms
												</div>
											)}
										</>
									)}
								</td>
								<td className="px-3 py-3">
									{it.tutorus_error ? (
										<span className="break-words text-amber-600 text-xs">
											⚠ {it.tutorus_error}
										</span>
									) : (
										<>
											<DiffText
												// 무음/잡음이면 빈 문자열이 오므로 미검출로 표시
												text={it.tutorus_text || null}
												other={it.openai_text}
												tone="tutorus"
											/>
											{it.tutorus_ms != null && (
												<div className="mt-1 text-gray-400 text-xs">
													{it.tutorus_ms}ms
												</div>
											)}
										</>
									)}
								</td>
								<td className="px-3 py-3">
									{it.rtzr_error ? (
										<span className="break-words text-amber-600 text-xs">
											⚠ {it.rtzr_error}
										</span>
									) : (
										<>
											<DiffText
												text={it.rtzr_text}
												other={it.openai_text}
												tone="rtzr"
											/>
											{it.rtzr_ms != null && (
												<div className="mt-1 text-gray-400 text-xs">
													{it.rtzr_ms}ms
												</div>
											)}
										</>
									)}
								</td>
								<td className="px-3 py-3 text-center">
									<KindBadge kind={it.diff_kind} />
								</td>
								<td className="px-3 py-3">
									<PronCell
										state={pron[it.id]}
										onRun={() => void runPron(it.id)}
									/>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* 페이지네이션 */}
			<div className="mt-4 flex items-center justify-between text-gray-500 text-sm">
				<span>
					{page + 1} / {totalPages} 페이지 · 총 {total}건
				</span>
				<div className="flex gap-2">
					<button
						type="button"
						disabled={page === 0}
						onClick={() => setPage((p) => Math.max(0, p - 1))}
						className="rounded-lg border border-gray-200 px-3 py-1.5 transition hover:bg-gray-50 disabled:opacity-40"
					>
						이전
					</button>
					<button
						type="button"
						disabled={page >= totalPages - 1}
						onClick={() => setPage((p) => p + 1)}
						className="rounded-lg border border-gray-200 px-3 py-1.5 transition hover:bg-gray-50 disabled:opacity-40"
					>
						다음
					</button>
				</div>
			</div>
		</div>
	);
}
