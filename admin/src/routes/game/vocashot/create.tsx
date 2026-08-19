import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
	createRoom,
	type CreateRoomInput,
} from "@/lib/vocashot/appsync";
import type {
	VocabQuestion,
	InputMode,
	DifficultySpeed,
	LanguageCode,
} from "@/lib/vocashot/types";
import {
	listVocashotPresets,
	type VocashotPreset,
} from "@/api/game-content";

type PresetId = string;
import {
	ArrowLeft,
	Download,
	Upload,
	Plus,
	Save,
	FolderOpen,
	Trash2,
	FileSpreadsheet,
} from "lucide-react";

export const Route = createFileRoute("/game/vocashot/create")({
	component: GameCreatePage,
});

// ── Types ──

type CustomQuestionForm = {
	image: string;
	english: string;
	answer: string;
	wrong1: string;
	wrong2: string;
	wrong3: string;
};

type StoredProblemSet = {
	id: string;
	name: string;
	selectedPreset: PresetId | null;
	customQuestions: VocabQuestion[];
	createdAt: number;
};

// ── Constants ──

const PROBLEM_SETS_KEY = "vocashot-problem-sets";

// ── Helpers ──

function generatePin(length = 6) {
	const min = 10 ** (length - 1);
	const max = 10 ** length - 1;
	return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

function createProblemSetId() {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `ps_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

function loadProblemSets(): StoredProblemSet[] {
	try {
		const raw = localStorage.getItem(PROBLEM_SETS_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter(
				(x) =>
					x &&
					typeof x === "object" &&
					"id" in x &&
					"name" in x &&
					"customQuestions" in x,
			)
			.map((x) => x as StoredProblemSet)
			.sort((a, b) => b.createdAt - a.createdAt);
	} catch {
		return [];
	}
}

function saveProblemSets(sets: StoredProblemSet[]) {
	localStorage.setItem(PROBLEM_SETS_KEY, JSON.stringify(sets));
}

function normalizeQuestionForRoom(q: VocabQuestion): VocabQuestion | null {
	const image = q.image ? q.image.trim() : "";
	const english = q.english ? q.english.trim() : "";
	const answer = q.answer.trim();
	const wrong = (q.wrong ?? [])
		.map((w) => String(w).trim())
		.filter((w) => Boolean(w));
	if (!answer) return null;
	if (!image && !english) return null;
	if (wrong.length < 3) return null;
	return {
		...q,
		image: image || undefined,
		english: english || undefined,
		answer,
		wrong,
	}
}

function downloadVocabExcel(presets: VocashotPreset[]) {
	const headers = [
		"lesson",
		"category",
		"image",
		"english",
		"answer",
		"wrong1",
		"wrong2",
		"wrong3",
		"wrong4",
		"wrong5",
		"wrong6",
		"wrong7",
	]
	const rows = presets.flatMap((p) =>
		p.vocab.map((e) => {
			const wrongs = e.wrong ?? [];
			return [
				p.id,
				e.category ?? "",
				e.image ?? "",
				e.english ?? "",
				e.answer,
				...wrongs,
				...Array(Math.max(0, 7 - wrongs.length)).fill(""),
			]
		}),
	)
	const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
	ws["!cols"] = [
		{ wch: 18 },
		{ wch: 8 },
		{ wch: 10 },
		{ wch: 28 },
		{ wch: 12 },
		...Array(7).fill({ wch: 10 }),
	]
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, "기본단어");
	XLSX.writeFile(wb, "VocaShot_기본단어.xlsx");
}

function downloadTemplate() {
	const headers = [
		"image",
		"english",
		"answer",
		"wrong1",
		"wrong2",
		"wrong3",
		"wrong4",
		"wrong5",
		"wrong6",
		"wrong7",
	]
	const examples = [
		[
			"🍎",
			"Apple",
			"사과",
			"포도",
			"바나나",
			"수박",
			"딸기",
			"오렌지",
			"복숭아",
			"키위",
		],
		["🐶", "Dog", "강아지", "고양이", "토끼", "햄스터", "", "", "", ""],
		["", "Red", "빨간색", "파란색", "노란색", "초록색", "", "", "", ""],
	]
	const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
	ws["!cols"] = [
		{ wch: 10 },
		{ wch: 14 },
		{ wch: 10 },
		...Array(7).fill({ wch: 10 }),
	]
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, "문제");
	XLSX.writeFile(wb, "VocaShot_문제양식.xlsx");
}

function parseExcelFile(file: File): Promise<VocabQuestion[]> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const data = new Uint8Array(e.target?.result as ArrayBuffer);
				const wb = XLSX.read(data, { type: "array" });
				const ws = wb.Sheets[wb.SheetNames[0]];
				const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
					defval: "",
				})
				const questions: VocabQuestion[] = rows
					.filter((row) => String(row.answer ?? "").trim())
					.map((row, i) => {
						const image = String(row.image ?? "").trim() || undefined;
						const english = String(row.english ?? "").trim() || undefined;
						const wrong = [
							"wrong1",
							"wrong2",
							"wrong3",
							"wrong4",
							"wrong5",
							"wrong6",
							"wrong7",
						]
							.map((k) => String(row[k] ?? "").trim())
							.filter(Boolean)
						return {
							id: Date.now() + i,
							image,
							english,
							answer: String(row.answer).trim(),
							wrong: Array.from(new Set(wrong)),
						}
					})
					.filter((q) => (q.image || q.english) && q.wrong.length >= 3);
				resolve(questions);
			} catch (err) {
				reject(err)
			}
		}
		reader.onerror = reject;
		reader.readAsArrayBuffer(file);
	})
}

// ── Component ──

function GameCreatePage() {
	const navigate = useNavigate();

	const adminUser = useMemo(() => {
		try {
			return JSON.parse(localStorage.getItem("adminUser") || "{}");
		} catch {
			return {};
		}
	}, []);

	// Word list state
	const [selectedPreset, setSelectedPreset] = useState<PresetId | "">("");
	const [customQuestions, setCustomQuestions] = useState<VocabQuestion[]>([]);
	const [form, setForm] = useState<CustomQuestionForm>({
		image: "",
		english: "",
		answer: "",
		wrong1: "",
		wrong2: "",
		wrong3: "",
	})

	// Game settings
	const [inputMode, setInputMode] = useState<InputMode>("easy");
	const [gameDurationMinutes, setGameDurationMinutes] = useState<number>(5);
	const [difficultySpeed, setDifficultySpeed] =
		useState<DifficultySpeed>("normal");
	const [studentUiLanguage, setStudentUiLanguage] =
		useState<LanguageCode>("en");

	// Room settings
	const [pinMode, setPinMode] = useState<"auto" | "manual">("auto");
	const [pinInput, setPinInput] = useState<string>("");
	const [maxPlayers, setMaxPlayers] = useState<number>(8);

	// UI state
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [xlsxError, setXlsxError] = useState<string | null>(null);
	const [info, setInfo] = useState<string | null>(null);
	const [problemSets, setProblemSets] = useState<StoredProblemSet[]>([]);
	const [problemSetName, setProblemSetName] = useState<string>("");
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setProblemSets(loadProblemSets());
	}, []);

	const [apiPresets, setApiPresets] = useState<VocashotPreset[]>([]);
	const [presetsLoading, setPresetsLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const data = await listVocashotPresets();
				if (!cancelled) setApiPresets(data);
			} finally {
				if (!cancelled) setPresetsLoading(false);
			}
		})()
		return () => {
			cancelled = true;
		}
	}, []);

	const presetOptions = useMemo(
		() => apiPresets.map((p) => ({ id: p.id, label: p.label })),
		[apiPresets],
	)
	const presetData = useMemo(() => {
		const map: Record<string, VocabQuestion[]> = {};
		for (const p of apiPresets) {
			map[p.id] = p.vocab.map((v) => ({
				id: v.id,
				image: v.image ?? undefined,
				english: v.english ?? undefined,
				answer: v.answer,
				wrong: v.wrong ?? [],
			}))
		}
		return map;
	}, [apiPresets]);

	const handleFormChange = (
		field: keyof CustomQuestionForm,
		value: string,
	) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	}

	const handleExcelUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setXlsxError(null);
		setInfo(null);
		try {
			const questions = await parseExcelFile(file);
			if (questions.length === 0) {
				setXlsxError(
					"유효한 문제가 없습니다. 각 문제에 오답 3개 이상이 포함돼 있는지 확인해 주세요.",
				)
				return
			}
			setCustomQuestions((prev) => {
				const existingAnswers = new Set(prev.map((q) => q.answer));
				const newOnes = questions.filter(
					(q) => !existingAnswers.has(q.answer),
				)
				return [...prev, ...newOnes];
			})
			setInfo(`${questions.length}개의 문제가 업로드되었습니다.`);
		} catch {
			setXlsxError("파일을 읽는 중 오류가 발생했습니다.");
		} finally {
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	}

	const handleAddCustomQuestion = () => {
		if (!form.answer || !form.wrong1 || !form.wrong2 || !form.wrong3) {
			setError("정답과 오답 3개는 필수입니다.");
			return
		}
		if (!form.image && !form.english) {
			setError("이모지/이미지 또는 영어 단어 중 하나는 입력해 주세요.");
			return
		}
		setError(null);
		const newQuestion: VocabQuestion = {
			id: Date.now(),
			image: form.image.trim() || undefined,
			english: form.english.trim() || undefined,
			answer: form.answer.trim(),
			wrong: [form.wrong1, form.wrong2, form.wrong3],
		}
		setCustomQuestions((prev) => [...prev, newQuestion]);
		setForm({
			image: "",
			english: "",
			answer: "",
			wrong1: "",
			wrong2: "",
			wrong3: "",
		})
	}

	const handleSaveProblemSet = () => {
		const name = problemSetName.trim();
		if (!name) {
			setError("세트 이름을 입력해 주세요.");
			return
		}
		setError(null);
		setInfo(null);
		const safeCustom = customQuestions
			.map(normalizeQuestionForRoom)
			.filter((q): q is VocabQuestion => q !== null);
		if (!selectedPreset && safeCustom.length === 0) {
			setError(
				"저장할 문제 세트가 비어 있습니다. 프리셋 또는 커스텀 문제를 추가해 주세요.",
			)
			return
		}
		const current = loadProblemSets();
		const existingIndex = current.findIndex((s) => s.name === name);
		const nextSet: StoredProblemSet =
			existingIndex !== -1
				? {
						...current[existingIndex],
						selectedPreset: selectedPreset ? selectedPreset : null,
						customQuestions: safeCustom,
						createdAt: current[existingIndex].createdAt,
					}
				: {
						id: createProblemSetId(),
						name,
						selectedPreset: selectedPreset ? selectedPreset : null,
						customQuestions: safeCustom,
						createdAt: Date.now(),
					}
		const next = (() => {
			if (existingIndex !== -1) {
				const copy = [...current];
				copy[existingIndex] = nextSet;
				return copy
			}
			return [nextSet, ...current];
		})()
		saveProblemSets(next);
		setProblemSets(next);
		setProblemSetName("");
		setInfo(`"${name}" 세트가 저장되었습니다.`);
	}

	const handleLoadProblemSet = (ps: StoredProblemSet) => {
		setError(null);
		setInfo(`"${ps.name}" 세트를 불러왔습니다.`);
		setSelectedPreset(ps.selectedPreset ?? "");
		setCustomQuestions(ps.customQuestions);
	}

	const handleDeleteProblemSet = (id: string) => {
		if (!window.confirm("해당 세트를 삭제할까요?")) return;
		const current = loadProblemSets();
		const next = current.filter((s) => s.id !== id);
		saveProblemSets(next);
		setProblemSets(next);
		setInfo("세트가 삭제되었습니다.");
	}

	const handleCreateRoom = async () => {
		try {
			setIsCreating(true);
			setError(null);
			setInfo(null);

			const finalPin = pinMode === "auto" ? generatePin(6) : pinInput.trim();
			if (!finalPin) {
				setError("PIN 번호를 입력하거나 자동 생성으로 설정해 주세요.");
				setIsCreating(false);
				return
			}

			if (!selectedPreset && customQuestions.length === 0) {
				setError(
					"프리셋을 선택하거나 커스텀 문제를 1개 이상 추가해 주세요.",
				)
				setIsCreating(false);
				return
			}

			const presetQuestions = selectedPreset
				? (presetData[selectedPreset] ?? [])
				: []
			const filteredPresetQuestions = presetQuestions
				.map(normalizeQuestionForRoom)
				.filter((q): q is VocabQuestion => q !== null);
			const filteredCustomQuestions = customQuestions
				.map(normalizeQuestionForRoom)
				.filter((q): q is VocabQuestion => q !== null);
			const excludedCount =
				presetQuestions.length +
				customQuestions.length -
				(filteredPresetQuestions.length + filteredCustomQuestions.length);

			if (excludedCount > 0) {
				setInfo(
					`힌트(이미지/영어)가 없는 문제 ${excludedCount}개는 방에서 자동으로 생략됩니다.`,
				)
			}

			const questions: VocabQuestion[] = [
				...filteredPresetQuestions,
				...filteredCustomQuestions,
			]

			if (questions.length === 0) {
				setError(
					"유효한 힌트(이미지 또는 영어)가 포함된 문제가 없습니다.",
				)
				setIsCreating(false);
				return
			}

			const gameDurationSec = gameDurationMinutes * 60;

			const derivedInitialHearts =
				difficultySpeed === "slow"
					? -1
					: difficultySpeed === "normal"
						? gameDurationMinutes * 8
						: gameDurationMinutes * 4;
			const derivedWrongPenaltyEnabled = difficultySpeed === "fast";
			const derivedGoldenMeteorEnabled = true;

			const presetLabel = selectedPreset
				? (presetOptions.find((p) => p.id === selectedPreset)?.label ??
					null)
				: null
			const customCount = filteredCustomQuestions.length;

			const input: CreateRoomInput = {
				pin: finalPin,
				maxPlayers,
				inputMode,
				gameDurationSec,
				difficultySpeed,
				initialHearts: derivedInitialHearts,
				wrongPenaltyEnabled: derivedWrongPenaltyEnabled,
				goldenMeteorEnabled: derivedGoldenMeteorEnabled,
				studentUiLanguage,
				questions,
				createdBy: adminUser.email || "unknown",
				schoolCode: adminUser.schoolCode || "",
				presetLabel,
				customCount,
			}

			await createRoom(input);
			navigate({ to: "/game/vocashot/host/$pin", params: { pin: finalPin } });
		} catch (e) {
			console.error(e);
			setError("방 생성 중 오류가 발생했습니다.");
		} finally {
			setIsCreating(false);
		}
	}

	const filteredPresetCount = selectedPreset
		? (presetData[selectedPreset] ?? [])
				.map(normalizeQuestionForRoom)
				.filter((q): q is VocabQuestion => q !== null).length
		: 0
	const filteredCustomCount = customQuestions
		.map(normalizeQuestionForRoom)
		.filter((q): q is VocabQuestion => q !== null).length;
	const totalQuestions = filteredPresetCount + filteredCustomCount;

	const pillClass = (active: boolean) =>
		active
			? "bg-violet-600 text-white border-violet-600"
			: "bg-white border-gray-300 text-gray-600 hover:bg-gray-50";

	return (
		<div className="mx-auto max-w-4xl">
			{/* Header */}
			<div className="mb-6 flex items-center gap-3">
				<button
					type="button"
					onClick={() => navigate({ to: "/game/vocashot" })}
					className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
				>
					<ArrowLeft className="h-5 w-5" />
				</button>
				<div>
					<h1 className="font-bold text-2xl text-gray-900">
						새 게임 만들기
					</h1>
					<p className="mt-0.5 text-gray-500 text-sm">
						VocaShot 게임 방을 생성합니다.
					</p>
				</div>
			</div>

			{/* Alerts */}
			{error && (
				<div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
					{error}
				</div>
			)}
			{info && (
				<div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 text-sm">
					{info}
				</div>
			)}

			{/* Section 1: Word List */}
			<section className="mb-6 rounded-lg border border-gray-200 bg-white p-5">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="font-semibold text-gray-900">단어 리스트</h2>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => downloadVocabExcel(apiPresets)}
							className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 text-xs transition hover:bg-gray-50"
						>
							<FileSpreadsheet className="h-3.5 w-3.5" />
							기본 단어 다운로드
						</button>
						<span
							className={`rounded-full border px-2.5 py-1 font-semibold text-xs ${
								totalQuestions > 0
									? "border-violet-200 bg-violet-50 text-violet-700"
									: "border-gray-200 bg-gray-50 text-gray-500"
							}`}
						>
							총 {totalQuestions}문제
						</span>
					</div>
				</div>

				{/* Preset selector */}
				<div className="mb-4 flex items-center gap-3">
					<span className="w-16 shrink-0 font-medium text-gray-600 text-sm">
						프리셋
					</span>
					<select
						value={selectedPreset}
						disabled={presetsLoading}
						onChange={(e) =>
							setSelectedPreset(e.target.value as PresetId | "")
						}
						className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50"
					>
						<option value="">
							{presetsLoading ? "프리셋 불러오는 중..." : "사용 안 함"}
						</option>
						{presetOptions.map((p) => (
							<option key={p.id} value={p.id}>
								{p.label}
							</option>
						))}
					</select>
					{selectedPreset && (
						<span className="shrink-0 font-medium text-violet-600 text-xs">
							{(presetData[selectedPreset] ?? []).length}문제
						</span>
					)}
				</div>

				{/* Custom questions */}
				<div className="border-gray-200 border-t pt-4">
					<div className="mb-3 flex items-center justify-between">
						<span className="font-medium text-gray-600 text-sm">
							커스텀 문제
						</span>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={downloadTemplate}
								className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 text-xs transition hover:bg-gray-50"
							>
								<Download className="h-3.5 w-3.5" />
								양식 다운로드
							</button>
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 text-xs transition hover:bg-gray-50"
							>
								<Upload className="h-3.5 w-3.5" />
								엑셀 업로드
							</button>
							<input
								ref={fileInputRef}
								type="file"
								accept=".xlsx,.xls"
								className="hidden"
								onChange={handleExcelUpload}
							/>
						</div>
					</div>
					{xlsxError && (
						<p className="mb-3 text-red-500 text-xs">{xlsxError}</p>
					)}

					{/* Manual input form */}
					<div className="mb-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
						<div className="flex flex-col gap-1">
							<span className="text-gray-500 text-xs">
								이모지 / 이미지 URL
							</span>
							<input
								value={form.image}
								onChange={(e) =>
									handleFormChange("image", e.target.value)
								}
								className="rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
								placeholder="🍎 또는 https://..."
							/>
						</div>
						<div className="flex flex-col gap-1">
							<span className="text-gray-500 text-xs">영어 단어</span>
							<input
								value={form.english}
								onChange={(e) =>
									handleFormChange("english", e.target.value)
								}
								className="rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
								placeholder="Apple"
							/>
						</div>
						<div className="flex flex-col gap-1">
							<span className="text-gray-500 text-xs">
								정답 (한국어)
							</span>
							<input
								value={form.answer}
								onChange={(e) =>
									handleFormChange("answer", e.target.value)
								}
								className="rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
								placeholder="사과"
							/>
						</div>
						{(["wrong1", "wrong2", "wrong3"] as const).map((k, i) => (
							<div key={k} className="flex flex-col gap-1">
								<span className="text-gray-500 text-xs">
									오답 {i + 1}
								</span>
								<input
									value={form[k]}
									onChange={(e) =>
										handleFormChange(k, e.target.value)
									}
									className="rounded-lg border border-gray-300 px-2.5 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
									placeholder={["포도", "바나나", "수박"][i]}
								/>
							</div>
						))}
					</div>
					<div className="flex items-center justify-between">
						<button
							type="button"
							onClick={handleAddCustomQuestion}
							className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 text-sm transition hover:bg-gray-50"
						>
							<Plus className="h-4 w-4" />
							문제 추가
						</button>
						{customQuestions.length > 0 && (
							<span className="font-medium text-violet-600 text-xs">
								커스텀 {customQuestions.length}문제 추가됨
							</span>
						)}
					</div>

					{/* Custom questions list */}
					{customQuestions.length > 0 && (
						<div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-gray-200">
							{customQuestions.map((q, idx) => (
								<div
									key={q.id}
									className="flex items-center justify-between border-gray-100 border-b px-3 py-2 last:border-b-0"
								>
									<div className="flex items-center gap-2 text-sm">
										<span className="text-gray-400 text-xs">
											{idx + 1}
										</span>
										{q.image && (
											<span className="text-base">{q.image}</span>
										)}
										{q.english && (
											<span className="text-gray-600">
												{q.english}
											</span>
										)}
										<span className="font-medium text-gray-900">
											{q.answer}
										</span>
									</div>
									<button
										type="button"
										onClick={() =>
											setCustomQuestions((prev) =>
												prev.filter((_, i) => i !== idx),
											)
										}
										className="text-gray-400 transition hover:text-red-500"
									>
										<Trash2 className="h-3.5 w-3.5" />
									</button>
								</div>
							))}
						</div>
					)}

					{/* Problem sets */}
					<div className="mt-4 border-gray-200 border-t pt-4">
						<div className="mb-3 flex items-center justify-between">
							<span className="font-medium text-gray-600 text-sm">
								내 문제 세트 (로컬 저장)
							</span>
							{problemSets.length > 0 && (
								<span className="text-gray-400 text-xs">
									{problemSets.length}개
								</span>
							)}
						</div>
						<div className="mb-3 flex items-center gap-2">
							<input
								value={problemSetName}
								onChange={(e) => setProblemSetName(e.target.value)}
								className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
								placeholder="세트 이름"
							/>
							<button
								type="button"
								onClick={handleSaveProblemSet}
								disabled={
									!problemSetName.trim() ||
									(!selectedPreset && customQuestions.length === 0)
								}
								className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-4 py-2 font-medium text-sm text-white transition hover:bg-violet-700 disabled:opacity-50"
							>
								<Save className="h-3.5 w-3.5" />
								저장
							</button>
						</div>
						{problemSets.length === 0 ? (
							<p className="text-gray-400 text-xs">
								현재 상태(프리셋 + 커스텀)를 세트로 저장해둘 수
								있어요.
							</p>
						) : (
							<div className="flex flex-col gap-2">
								{problemSets.slice(0, 6).map((ps) => (
									<div
										key={ps.id}
										className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
									>
										<div className="flex flex-col">
											<span className="max-w-[220px] truncate font-medium text-gray-900 text-sm">
												{ps.name}
											</span>
											<span className="text-gray-400 text-xs">
												preset:
												{ps.selectedPreset ?? "없음"} / custom:
												{ps.customQuestions.length}
											</span>
										</div>
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() => handleLoadProblemSet(ps)}
												className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 text-xs transition hover:bg-gray-50"
											>
												<FolderOpen className="h-3 w-3" />
												불러오기
											</button>
											<button
												type="button"
												onClick={() =>
													handleDeleteProblemSet(ps.id)
												}
												className="inline-flex items-center gap-1 rounded-md bg-red-50 px-3 py-1.5 font-medium text-red-700 text-xs transition hover:bg-red-100"
											>
												<Trash2 className="h-3 w-3" />
												삭제
											</button>
										</div>
									</div>
								))}
								{problemSets.length > 6 && (
									<p className="text-gray-400 text-xs">
										최근 6개만 표시 중입니다.
									</p>
								)}
							</div>
						)}
					</div>
				</div>
			</section>

			{/* Section 2: Game & Room Settings */}
			<div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
				{/* Game settings */}
				<section className="rounded-lg border border-gray-200 bg-white p-5 lg:col-span-3">
					<h2 className="mb-4 font-semibold text-gray-900">게임 설정</h2>

					{/* Input mode */}
					<div className="flex items-center justify-between border-gray-100 border-b py-3">
						<div>
							<p className="font-medium text-gray-700 text-sm">
								입력 모드
							</p>
							<p className="mt-0.5 text-gray-400 text-xs">
								학생이 답을 선택하는 방식
							</p>
						</div>
						<div className="flex gap-1 rounded-lg border border-gray-200 p-1">
							{(["easy", "hard"] as InputMode[]).map((m) => (
								<button
									key={m}
									type="button"
									onClick={() => setInputMode(m)}
									className={`rounded-md border px-3 py-1.5 font-semibold text-xs transition ${pillClass(inputMode === m)}`}
								>
									{m === "easy" ? "고르기" : "타이핑"}
								</button>
							))}
						</div>
					</div>

					{/* Game duration */}
					<div className="flex items-center justify-between gap-4 border-gray-100 border-b py-3">
						<div>
							<p className="font-medium text-gray-700 text-sm">
								게임 시간
							</p>
						</div>
						<div className="flex max-w-xs flex-1 items-center gap-3">
							<input
								type="range"
								min={1}
								max={20}
								value={gameDurationMinutes}
								onChange={(e) =>
									setGameDurationMinutes(
										Number(e.target.value) || 1,
									)
								}
								className="flex-1"
							/>
							<span className="w-10 text-right font-semibold text-gray-700 text-sm">
								{gameDurationMinutes}분
							</span>
						</div>
					</div>

					{/* Difficulty */}
					<div className="flex items-center justify-between border-gray-100 border-b py-3">
						<div>
							<p className="font-medium text-gray-700 text-sm">
								난이도
							</p>
							<p className="mt-0.5 text-gray-400 text-xs">
								하트/오답감점 자동 설정
							</p>
						</div>
						<div className="flex gap-1 rounded-lg border border-gray-200 p-1">
							{(
								[
									["slow", "easy"],
									["normal", "normal"],
									["fast", "hard"],
								] as [DifficultySpeed, string][]
							).map(([v, label]) => (
								<button
									key={v}
									type="button"
									onClick={() => setDifficultySpeed(v)}
									className={`rounded-md border px-3 py-1.5 font-semibold text-xs transition ${pillClass(difficultySpeed === v)}`}
								>
									{label}
								</button>
							))}
						</div>
					</div>

					{/* Student UI language */}
					<div className="flex items-center justify-between pt-3">
						<div>
							<p className="font-medium text-gray-700 text-sm">
								학생 UI 언어
							</p>
							<p className="mt-0.5 text-gray-400 text-xs">
								학생 기기 버튼/메시지 언어
							</p>
						</div>
						<div className="flex gap-1 rounded-lg border border-gray-200 p-1">
							{(
								[
									["en", "English"],
									["ko", "한국어"],
								] as [LanguageCode, string][]
							).map(([v, label]) => (
								<button
									key={v}
									type="button"
									onClick={() => setStudentUiLanguage(v)}
									className={`rounded-md border px-3 py-1.5 font-semibold text-xs transition ${pillClass(studentUiLanguage === v)}`}
								>
									{label}
								</button>
							))}
						</div>
					</div>
				</section>

				{/* Room settings */}
				<section className="rounded-lg border border-gray-200 bg-white p-5 lg:col-span-2">
					<h2 className="mb-4 font-semibold text-gray-900">방 설정</h2>

					{/* PIN */}
					<div className="flex flex-col gap-2 border-gray-100 border-b pb-3">
						<p className="font-medium text-gray-700 text-sm">
							PIN 번호
						</p>
						<div className="flex w-fit gap-1 rounded-lg border border-gray-200 p-1">
							<button
								type="button"
								onClick={() => {
									setPinMode("auto")
									setPinInput("")
								}}
								className={`rounded-md border px-3 py-1.5 font-semibold text-xs transition ${pillClass(pinMode === "auto")}`}
							>
								자동
							</button>
							<button
								type="button"
								onClick={() => setPinMode("manual")}
								className={`rounded-md border px-3 py-1.5 font-semibold text-xs transition ${pillClass(pinMode === "manual")}`}
							>
								수동
							</button>
						</div>
						<input
							value={pinMode === "auto" ? "- - - - - -" : pinInput}
							onChange={(e) => setPinInput(e.target.value)}
							maxLength={8}
							disabled={pinMode === "auto"}
							className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm tracking-[0.3em] focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50 disabled:opacity-60"
							placeholder="6자리 PIN"
						/>
					</div>

					{/* Max players */}
					<div className="flex items-center justify-between pt-3">
						<div>
							<p className="font-medium text-gray-700 text-sm">
								최대 인원
							</p>
							<p className="mt-0.5 text-gray-400 text-xs">
								1 ~ 30명
							</p>
						</div>
						<input
							type="number"
							min={1}
							max={30}
							value={maxPlayers}
							onChange={(e) => {
								const raw = Number(e.target.value);
								setMaxPlayers(
									Number.isFinite(raw)
										? Math.max(1, Math.min(30, raw))
										: 1,
								)
							}}
							className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-center text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
						/>
					</div>
				</section>
			</div>

			{/* Create button */}
			<div className="flex items-center justify-end gap-3 pb-6">
				<button
					type="button"
					onClick={handleCreateRoom}
					disabled={isCreating}
					className="rounded-lg bg-violet-600 px-8 py-3 font-semibold text-sm text-white transition hover:bg-violet-700 disabled:opacity-50"
				>
					{isCreating ? "생성 중..." : "게임 방 생성"}
				</button>
			</div>
		</div>
	)
}
