/**
 * 기관 발급 코드 — 학교가 코드를 찍고 학생이 그것으로 스스로 가입한다.
 *
 * **`/school` 안에 못 넣는다.** 그 메뉴는 `roles: ["master_admin"]` 인데
 * 학교 관리자도 발급 주체다(기획 2026-08-28).
 *
 * **판정은 전부 서버가 한다.** 여기 적힌 한도(500명 · 3개월)는 타이핑하는 동안
 * 알려 주는 것이고, 넘겼는지는 서버가 정한다 — 화면만 막으면 API 로 그냥 넘긴다.
 * 상태(사용 중·정원 참·기간 끝)도 서버가 낸 값을 그대로 쓴다. 브라우저 시계로
 * 만료를 판정하면 시계가 틀린 어드민에게 다른 화면이 보인다.
 */
import { api } from "@/api/api";
import type { School } from "@/api/apiType";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { env } from "@/config/env";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Plus, Printer, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";

export const Route = createFileRoute("/signup-code")({
	component: SignupCodePage,
});

/** 학교 관리자의 한도. **서버(`signup_code_business.py`)가 정본이고 여기는 안내다.** */
const SCHOOL_MAX_USES = 500;
const SCHOOL_MAX_DAYS = 92;

interface SignupCode {
	id: number;
	code: string;
	schoolCode: string;
	schoolName: string | null;
	label: string | null;
	maxUses: number;
	usedCount: number;
	remaining: number;
	startsAt: string | null;
	expiresAt: string | null;
	status: string;
	issuedByRole: string;
	createdAt: string;
}

interface CodeUse {
	userId: number;
	name: string | null;
	email: string | null;
	usedAt: string;
}

/** 서버가 낸 상태를 그대로 그린다. 여기서 다시 계산하지 않는다. */
const STATUS: Record<
	string,
	{
		label: string;
		variant: "success" | "warning" | "secondary" | "destructive";
	}
> = {
	active: { label: "사용 중", variant: "success" },
	full: { label: "정원 참", variant: "warning" },
	expired: { label: "기간 끝", variant: "secondary" },
	scheduled: { label: "시작 전", variant: "secondary" },
	paused: { label: "중지됨", variant: "destructive" },
	disabled: { label: "삭제됨", variant: "destructive" },
};

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "-");

/** 종료일까지 며칠. 어림수라 화면 안내로만 쓴다 */
function daysLeft(iso: string | null): number | null {
	if (!iso) return null;
	const diff = new Date(iso).getTime() - Date.now();
	return diff < 0 ? null : Math.ceil(diff / 86400000);
}

function todayPlus(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d.toISOString().slice(0, 10);
}

function SignupCodePage() {
	const adminUser = useMemo(() => {
		try {
			return JSON.parse(localStorage.getItem("adminUser") || "{}");
		} catch {
			return {};
		}
	}, []);
	const isMaster = adminUser.role === "master_admin";

	const [codes, setCodes] = useState<SignupCode[]>([]);
	const [schools, setSchools] = useState<School[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [searchText, setSearchText] = useState("");
	const [selectedSchoolCode, setSelectedSchoolCode] = useState("");

	const [showAdd, setShowAdd] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);
	const [issued, setIssued] = useState<SignupCode | null>(null);
	const [printing, setPrinting] = useState<SignupCode | null>(null);
	const [copied, setCopied] = useState(false);
	const [uses, setUses] = useState<{
		code: SignupCode;
		rows: CodeUse[];
	} | null>(null);

	const [form, setForm] = useState({
		school_code: "",
		max_uses: "30",
		starts_on: "",
		expires_on: todayPlus(90),
		label: "",
	});

	const loadCodes = useCallback(async () => {
		setIsLoading(true);
		setLoadError(null);
		try {
			const qs = new URLSearchParams();
			if (isMaster && selectedSchoolCode)
				qs.set("school_code", selectedSchoolCode);
			if (searchText.trim()) qs.set("search", searchText.trim());
			const res = await api.get<SignupCode[]>(`/signup-code/list?${qs}`);
			if (!res.result) throw new Error(res.message || "");
			setCodes(res.data ?? []);
		} catch {
			// **빈 표로 그리지 않는다.** 조회 실패와 "코드가 없다" 가 같아 보이면
			// 어드민이 "코드가 사라졌다" 로 읽는다
			setLoadError("목록을 불러오지 못했습니다.");
			setCodes([]);
		} finally {
			setIsLoading(false);
		}
	}, [isMaster, selectedSchoolCode, searchText]);

	useEffect(() => {
		void loadCodes();
	}, [loadCodes]);

	useEffect(() => {
		if (!isMaster) return;
		void api
			.get<School[]>("/school/list")
			.then((res) => setSchools(res.data ?? []))
			.catch(() => setSchools([]));
	}, [isMaster]);

	const maxUsesHint = isMaster ? undefined : SCHOOL_MAX_USES;
	const maxDateHint = isMaster ? undefined : todayPlus(SCHOOL_MAX_DAYS);

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setFormError(null);
		try {
			const res = await api.post<SignupCode>("/signup-code", {
				// 학교 관리자가 보내도 서버가 자기 학교로 덮는다. 그래도 안 보낸다
				school_code: isMaster ? form.school_code : undefined,
				max_uses: Number(form.max_uses),
				starts_on: form.starts_on || undefined,
				expires_on: form.expires_on,
				label: form.label || undefined,
			});
			if (!res.result || !res.data) {
				setFormError(res.message || "발급하지 못했습니다.");
				return;
			}
			setShowAdd(false);
			setIssued(res.data); // 목록으로 보내면 방금 만든 코드를 표에서 다시 찾아야 한다
			setCopied(false);
			await loadCodes();
		} catch {
			setFormError("발급하지 못했습니다.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const togglePause = async (row: SignupCode) => {
		const next = row.status === "paused" ? "active" : "paused";
		const res = await api.patch<SignupCode>(`/signup-code/${row.id}`, {
			status: next,
		});
		if (!res.result) alert(res.message || "바꾸지 못했습니다.");
		await loadCodes();
	};

	const openUses = async (row: SignupCode) => {
		const res = await api.get<CodeUse[]>(`/signup-code/${row.id}/uses`);
		setUses({ code: row, rows: res.data ?? [] });
	};

	const copyCode = async (code: string) => {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// 클립보드가 막힌 브라우저가 있다. 그때는 직접 고르게 둔다
			alert("복사하지 못했습니다. 코드를 직접 선택해 복사해 주세요.");
		}
	};

	const joinUrl = (code: string) =>
		env.STUDENT_APP_URL
			? `${env.STUDENT_APP_URL.replace(/\/$/, "")}/join?code=${code.replace(/-/g, "")}`
			: null;

	return (
		<>
			{/* 화면용. 인쇄할 때는 통째로 숨고 아래 카드만 나온다 */}
			<div className="mx-auto max-w-6xl print:hidden">
				<div className="mb-6 flex items-center justify-between">
					<div>
						<h1 className="font-bold text-2xl tracking-tight">코드 발급</h1>
						<p className="mt-1 text-gray-500 text-sm">
							학생이 이 코드를 넣으면{" "}
							{isMaster ? "해당 학교" : adminUser.schoolName || "우리 학교"}{" "}
							학생으로 가입합니다.
						</p>
					</div>
					<div className="flex items-center gap-3">
						{isMaster && (
							<select
								value={selectedSchoolCode}
								onChange={(e) => setSelectedSchoolCode(e.target.value)}
								className="h-10 rounded-full border border-gray-200 bg-white px-4 pr-8 font-medium text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
							>
								<option value="">전체 학교</option>
								{schools.map((s) => (
									<option key={s.id} value={s.school_code}>
										{s.school_name} ({s.school_code})
									</option>
								))}
							</select>
						)}
						<button
							type="button"
							onClick={() => {
								setForm((f) => ({
									...f,
									school_code: isMaster ? selectedSchoolCode : "",
								}));
								setFormError(null);
								setShowAdd(true);
							}}
							className="flex h-10 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-5 font-medium text-gray-700 text-sm transition hover:bg-gray-50"
						>
							<Plus className="h-4 w-4" />
							코드 발급
						</button>
					</div>
				</div>

				<div className="mb-6 flex items-center gap-3">
					<div className="relative">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3.5 h-4 w-4 text-gray-400" />
						<Input
							value={searchText}
							onChange={(e) => setSearchText(e.target.value)}
							placeholder="코드나 메모를 입력해 주세요.."
							className="h-10 w-64 rounded-full border-gray-200 bg-white pl-10 text-sm placeholder:text-gray-400 focus-visible:ring-gray-300"
						/>
					</div>
				</div>

				{loadError && (
					<div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm">
						<span>{loadError}</span>
						<button
							type="button"
							onClick={() => void loadCodes()}
							className="font-medium underline"
						>
							다시 시도
						</button>
					</div>
				)}

				{isLoading ? (
					<p className="mt-8 text-center text-gray-400">
						코드 목록을 불러오는 중...
					</p>
				) : codes.length === 0 && !loadError ? (
					<div className="rounded-xl border border-gray-200 py-20 text-center">
						<p className="text-gray-400">
							{isMaster && selectedSchoolCode
								? "이 학교에 발급한 코드가 없습니다."
								: "발급한 코드가 없습니다."}
						</p>
					</div>
				) : (
					<div className="overflow-x-auto rounded-xl border border-gray-200">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-gray-100 border-b bg-gray-50/80">
									<th className="px-5 py-4 text-left font-normal text-gray-500">
										코드
									</th>
									{isMaster && (
										<th className="px-5 py-4 text-left font-normal text-gray-500">
											학교
										</th>
									)}
									<th className="px-5 py-4 text-left font-normal text-gray-500">
										사용
									</th>
									<th className="px-5 py-4 text-left font-normal text-gray-500">
										사용 기간
									</th>
									<th className="px-5 py-4 text-left font-normal text-gray-500">
										상태
									</th>
									<th className="px-5 py-4 text-left font-normal text-gray-500">
										메모
									</th>
									<th className="w-44 px-5 py-4" />
								</tr>
							</thead>
							<tbody>
								{codes.map((c) => {
									const left = daysLeft(c.expiresAt);
									const st = STATUS[c.status] ?? {
										label: c.status,
										variant: "secondary" as const,
									};
									return (
										<tr
											key={c.id}
											className="border-gray-100 border-b transition last:border-b-0 hover:bg-gray-50/50"
										>
											<td className="px-5 py-4 font-medium font-mono text-gray-900 tracking-wider">
												{c.code}
											</td>
											{isMaster && (
												<td className="px-5 py-4 text-gray-600">
													{c.schoolName ?? c.schoolCode}
												</td>
											)}
											<td className="px-5 py-4 text-gray-900">
												{c.usedCount} / {c.maxUses}
												<span className="block text-gray-400 text-xs">
													남음 {c.remaining}
												</span>
											</td>
											<td className="px-5 py-4 text-gray-600">
												{day(c.startsAt)} ~ {day(c.expiresAt)}
												{left !== null && (
													<span className="block text-gray-400 text-xs">
														D-{left}
													</span>
												)}
											</td>
											<td className="px-5 py-4">
												<Badge variant={st.variant}>{st.label}</Badge>
											</td>
											<td className="px-5 py-4 text-gray-600">
												{c.label ?? "-"}
											</td>
											<td className="px-5 py-4">
												<div className="flex items-center justify-end gap-1.5">
													<button
														type="button"
														onClick={() => void openUses(c)}
														className="rounded-full border border-gray-200 px-3 py-1.5 text-gray-600 text-xs transition hover:bg-gray-50"
													>
														사용 내역
													</button>
													<button
														type="button"
														onClick={() => {
															setIssued(c);
															setCopied(false);
														}}
														className="rounded-full border border-gray-200 px-3 py-1.5 text-gray-600 text-xs transition hover:bg-gray-50"
													>
														배포
													</button>
													{c.status !== "disabled" && (
														<button
															type="button"
															onClick={() => void togglePause(c)}
															className="rounded-full border border-gray-200 px-3 py-1.5 text-gray-600 text-xs transition hover:bg-gray-50"
														>
															{c.status === "paused" ? "다시 열기" : "중지"}
														</button>
													)}
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}

				{/* 발급 폼 */}
				{showAdd && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
						<div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl">
							<div className="mb-6 flex items-center justify-between">
								<h2 className="font-semibold text-gray-900 text-lg">
									코드 발급
								</h2>
								<button
									type="button"
									onClick={() => setShowAdd(false)}
									className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
								>
									<X className="h-5 w-5" />
								</button>
							</div>
							<form onSubmit={submit} className="space-y-4">
								{isMaster ? (
									<label htmlFor="code-school" className="block">
										<span className="mb-1.5 block font-medium text-gray-700 text-sm">
											학교
										</span>
										<select
											id="code-school"
											required
											value={form.school_code}
											onChange={(e) =>
												setForm({ ...form, school_code: e.target.value })
											}
											className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
										>
											<option value="">학교를 선택해 주세요</option>
											{schools.map((s) => (
												<option key={s.id} value={s.school_code}>
													{s.school_name} ({s.school_code})
												</option>
											))}
										</select>
									</label>
								) : (
									/* 학교 관리자에게는 칸을 주지 않는다 — 서버가 어차피 자기 학교로 덮는다 */
									<div className="rounded-lg bg-gray-50 px-3 py-2.5 text-gray-600 text-sm">
										학교{" "}
										<b className="text-gray-900">
											{adminUser.schoolName || adminUser.schoolCode}
										</b>
									</div>
								)}

								<label htmlFor="code-max-uses" className="block">
									<span className="mb-1.5 flex items-baseline justify-between font-medium text-gray-700 text-sm">
										수량 (몇 명이 이 코드로 가입할 수 있나)
										{maxUsesHint && (
											<span className="font-normal text-gray-400 text-xs">
												최대 {maxUsesHint}명
											</span>
										)}
									</span>
									<Input
										id="code-max-uses"
										type="number"
										required
										min={1}
										max={maxUsesHint}
										value={form.max_uses}
										onChange={(e) =>
											setForm({ ...form, max_uses: e.target.value })
										}
									/>
								</label>

								<div className="grid grid-cols-2 gap-3">
									<label htmlFor="code-starts" className="block">
										<span className="mb-1.5 block font-medium text-gray-700 text-sm">
											시작일 (선택)
										</span>
										<Input
											id="code-starts"
											type="date"
											value={form.starts_on}
											onChange={(e) =>
												setForm({ ...form, starts_on: e.target.value })
											}
										/>
									</label>
									<label htmlFor="code-expires" className="block">
										<span className="mb-1.5 flex items-baseline justify-between font-medium text-gray-700 text-sm">
											종료일
											{maxDateHint && (
												<span className="font-normal text-gray-400 text-xs">
													최대 3개월
												</span>
											)}
										</span>
										<Input
											id="code-expires"
											type="date"
											required
											max={maxDateHint}
											value={form.expires_on}
											onChange={(e) =>
												setForm({ ...form, expires_on: e.target.value })
											}
										/>
									</label>
								</div>

								<label htmlFor="code-label" className="block">
									<span className="mb-1.5 block font-medium text-gray-700 text-sm">
										메모 (선택)
									</span>
									<Input
										id="code-label"
										maxLength={100}
										placeholder="2026 봄학기 1급 A반"
										value={form.label}
										onChange={(e) =>
											setForm({ ...form, label: e.target.value })
										}
									/>
									<span className="mt-1 block text-gray-400 text-xs">
										한 학교가 코드를 여러 장 갖습니다. 메모가 없으면 목록에서
										구별하기 어렵습니다.
									</span>
								</label>

								{formError && (
									<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm">
										{formError}
									</div>
								)}

								<button
									type="submit"
									disabled={isSubmitting}
									className="h-11 w-full rounded-full bg-gray-900 font-medium text-sm text-white transition hover:bg-gray-800 disabled:opacity-50"
								>
									{isSubmitting ? "발급하는 중..." : "코드 발급"}
								</button>
							</form>
						</div>
					</div>
				)}

				{/* 발급 결과 · 배포 */}
				{issued && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
						<div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl">
							<div className="mb-6 flex items-center justify-between">
								<h2 className="font-semibold text-gray-900 text-lg">
									학생에게 나눠 주세요
								</h2>
								<button
									type="button"
									onClick={() => setIssued(null)}
									className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
								>
									<X className="h-5 w-5" />
								</button>
							</div>
							<p className="text-center font-bold font-mono text-4xl text-gray-900 tracking-[0.2em]">
								{issued.code}
							</p>
							<p className="mt-3 text-center text-gray-500 text-sm">
								{issued.schoolName ?? issued.schoolCode} · {issued.maxUses}명 ·{" "}
								{day(issued.startsAt)} ~ {day(issued.expiresAt)}
							</p>
							<div className="mt-6 flex gap-2">
								<button
									type="button"
									onClick={() => void copyCode(issued.code)}
									className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-gray-200 font-medium text-gray-700 text-sm transition hover:bg-gray-50"
								>
									{copied ? (
										<Check className="h-4 w-4" />
									) : (
										<Copy className="h-4 w-4" />
									)}
									{copied ? "복사됨" : "코드 복사"}
								</button>
								<button
									type="button"
									onClick={() => {
										setPrinting(issued);
										setTimeout(() => window.print(), 50);
									}}
									className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-gray-900 font-medium text-sm text-white transition hover:bg-gray-800"
								>
									<Printer className="h-4 w-4" />
									인쇄
								</button>
							</div>
						</div>
					</div>
				)}

				{/* 사용 내역 */}
				{uses && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
						<div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl">
							<div className="mb-6 flex items-center justify-between">
								<h2 className="font-semibold text-gray-900 text-lg">
									<span className="font-mono tracking-wider">
										{uses.code.code}
									</span>{" "}
									사용 내역
								</h2>
								<button
									type="button"
									onClick={() => setUses(null)}
									className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
								>
									<X className="h-5 w-5" />
								</button>
							</div>
							{uses.rows.length === 0 ? (
								<p className="py-12 text-center text-gray-400">
									아직 아무도 이 코드로 가입하지 않았습니다.
								</p>
							) : (
								<div className="max-h-80 overflow-y-auto">
									<table className="w-full text-sm">
										<tbody>
											{uses.rows.map((u) => (
												<tr
													key={u.userId}
													className="border-gray-100 border-b last:border-b-0"
												>
													<td className="py-3 font-medium text-gray-900">
														{u.name ?? "-"}
													</td>
													<td className="py-3 text-gray-500">
														{u.email ?? "-"}
													</td>
													<td className="py-3 text-right text-gray-400 text-xs">
														{u.usedAt.slice(0, 16).replace("T", " ")}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			{/* 인쇄용 카드 — 화면에는 없고 인쇄할 때만 나온다.
			    어드민에는 i18n 이 없다. 5개 언어는 학생이 닿는 화면이 지고,
			    종이는 거기까지 데려가기만 하면 된다. */}
			{printing && (
				<div className="hidden print:fixed print:inset-0 print:block print:bg-white print:p-16">
					<div className="mx-auto max-w-lg text-center">
						<p className="font-bold text-2xl text-black">
							{printing.schoolName ?? printing.schoolCode}
						</p>
						<p className="mt-1 text-base text-black">학교 코드로 가입하세요</p>
						<p className="text-gray-600 text-sm">
							Sign up with your school code
						</p>
						<p className="mt-10 font-bold font-mono text-6xl text-black tracking-[0.2em]">
							{printing.code}
						</p>
						{joinUrl(printing.code) ? (
							<>
								<div className="mt-10 flex justify-center">
									<QRCode value={joinUrl(printing.code) as string} size={180} />
								</div>
								<p className="mt-4 break-all text-black text-sm">
									{joinUrl(printing.code)}
								</p>
							</>
						) : (
							/* 빈 링크가 인쇄돼 나가는 것보다 낫다 */
							<p className="mt-10 text-red-700 text-sm">
								가입 주소가 설정되지 않았습니다 (PUBLIC_STUDENT_APP_URL)
							</p>
						)}
						<p className="mt-10 text-gray-600 text-sm">
							사용 기간 {day(printing.startsAt)} ~ {day(printing.expiresAt)} ·{" "}
							{printing.maxUses}명
						</p>
					</div>
				</div>
			)}
		</>
	);
}
