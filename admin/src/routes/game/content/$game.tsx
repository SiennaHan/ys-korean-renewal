import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import DataTable, {
	type Column,
} from "@/components/game-content/data-table";
import EditModal, {
	type FieldSpec,
} from "@/components/game-content/edit-modal";
import {
	createCardSortCategory,
	createCardSortRare,
	createCardSortVocab,
	createParticleSniperLesson,
	createParticleSniperLevel,
	createSeoulPuzzleLocation,
	createSeoulPuzzleStep,
	createSpringPicnicFriend,
	createSpringPicnicQuestion,
	createVocashotPreset,
	deleteCardSortCategory,
	deleteCardSortRare,
	deleteCardSortVocab,
	deleteParticleSniperLesson,
	deleteParticleSniperLevel,
	deleteSeoulPuzzleLocation,
	deleteSeoulPuzzleStep,
	deleteSpringPicnicFriend,
	deleteSpringPicnicQuestion,
	deleteVocashotPreset,
	listCardSortCategories,
	listCardSortRare,
	listCardSortVocab,
	listParticleSniperLessons,
	listSeoulPuzzleLocations,
	listSeoulPuzzleSteps,
	listSpringPicnicFriends,
	listSpringPicnicQuestions,
	listVocashotPresets,
	type ParticleSniperLesson,
	type ParticleSniperLevel,
	type SeoulPuzzleLocation,
	type SeoulPuzzleStep,
	type SpringPicnicFriend,
	type SpringPicnicQuestion,
	type CardSortCategory,
	type CardSortRareRow,
	type CardSortVocabRow,
	type VocashotPreset,
	updateCardSortCategory,
	updateCardSortRare,
	updateCardSortVocab,
	updateParticleSniperLesson,
	updateParticleSniperLevel,
	updateSeoulPuzzleLocation,
	updateSeoulPuzzleStep,
	updateSpringPicnicFriend,
	updateSpringPicnicQuestion,
	updateVocashotPreset,
} from "@/api/game-content";
import { api } from "@/api/api";

export const Route = createFileRoute("/game/content/$game")({
	component: GameContentEditorPage,
});

const titles: Record<string, string> = {
	"spring-picnic": "봄 소풍 숫자 미션",
	"particle-sniper": "조사 스나이퍼",
	"card-sort": "어휘 카드 마스터",
	"seoul-puzzle": "서울 퍼즐",
	vocashot: "낱말맞추기",
};

const tabsByGame: Record<string, { key: string; label: string }[]> = {
	"spring-picnic": [
		{ key: "friends", label: "캐릭터" },
		{ key: "questions", label: "문항" },
	],
	"particle-sniper": [
		{ key: "levels", label: "급수" },
		{ key: "lessons", label: "레슨" },
	],
	"card-sort": [
		{ key: "categories", label: "카테고리" },
		{ key: "vocab", label: "어휘" },
		{ key: "rare", label: "희귀어" },
	],
	"seoul-puzzle": [
		{ key: "locations", label: "장소" },
		{ key: "steps", label: "단계" },
	],
	vocashot: [{ key: "presets", label: "프리셋" }],
};

function GameContentEditorPage() {
	const { game } = Route.useParams();
	const navigate = useNavigate();
	const title = titles[game] ?? game;
	const tabs = tabsByGame[game] ?? [];
	const [activeTab, setActiveTab] = useState<string>(tabs[0]?.key ?? "");

	useEffect(() => {
		setActiveTab(tabs[0]?.key ?? "");
	}, [tabs]);

	if (!tabs.length) {
		return (
			<div>
				<button
					type="button"
					onClick={() => navigate({ to: "/game/content" })}
					className="mb-4 inline-flex items-center gap-1 text-gray-500 text-sm hover:text-gray-900"
				>
					<ArrowLeft className="h-4 w-4" />
					목록으로
				</button>
				<div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-8 text-center text-gray-500 text-sm">
					알 수 없는 게임: {game}
				</div>
			</div>
		)
	}

	return (
		<div>
			<button
				type="button"
				onClick={() => navigate({ to: "/game/content" })}
				className="mb-4 inline-flex items-center gap-1 text-gray-500 text-sm hover:text-gray-900"
			>
				<ArrowLeft className="h-4 w-4" />
				목록으로
			</button>
			<div className="mb-5">
				<h1 className="font-bold text-2xl text-gray-900">{title}</h1>
				<p className="mt-1 text-gray-500 text-sm">
					행을 클릭하여 컨텐츠를 편집합니다.
				</p>
			</div>

			<div className="mb-4 flex gap-2 border-gray-200 border-b">
				{tabs.map((t) => (
					<button
						key={t.key}
						type="button"
						onClick={() => setActiveTab(t.key)}
						className={`px-4 py-2 font-medium text-sm transition ${
							activeTab === t.key
								? "border-violet-600 border-b-2 text-violet-700"
								: "text-gray-500 hover:text-gray-900"
						}`}
					>
						{t.label}
					</button>
				))}
			</div>

			{game === "spring-picnic" && activeTab === "friends" && (
				<FriendsTab />
			)}
			{game === "spring-picnic" && activeTab === "questions" && (
				<QuestionsTab />
			)}
			{game === "particle-sniper" && activeTab === "levels" && <LevelsTab />}
			{game === "particle-sniper" && activeTab === "lessons" && <LessonsTab />}
			{game === "card-sort" && activeTab === "categories" && <CategoriesTab />}
			{game === "card-sort" && activeTab === "vocab" && <VocabTab />}
			{game === "card-sort" && activeTab === "rare" && <RareTab />}
			{game === "seoul-puzzle" && activeTab === "locations" && (
				<LocationsTab />
			)}
			{game === "seoul-puzzle" && activeTab === "steps" && <StepsTab />}
			{game === "vocashot" && activeTab === "presets" && <PresetsTab />}
		</div>
	)
}

// ─── helper ──────────────────────────────────────

function useEditor<T>(loader: () => Promise<T[]>, createDefaults: () => T) {
	const [rows, setRows] = useState<T[]>([]);
	const [loading, setLoading] = useState(false);
	const [editing, setEditing] = useState<T | null>(null);
	const [mode, setMode] = useState<"edit" | "create">("edit");

	const reload = useCallback(async () => {
		setLoading(true);
		try {
			setRows(await loader());
		} finally {
			setLoading(false);
		}
	}, [loader]);

	useEffect(() => {
		reload();
	}, [reload]);

	const openEdit = (row: T) => {
		setMode("edit");
		setEditing(row);
	}
	const openCreate = () => {
		setMode("create");
		setEditing(createDefaults());
	}
	const close = () => setEditing(null);

	return { rows, loading, editing, mode, openEdit, openCreate, close, reload };
}

interface DeleteConfirmProps {
	label: string;
	onConfirm: () => Promise<void>;
}

async function confirmDelete({ label, onConfirm }: DeleteConfirmProps) {
	if (!window.confirm(`${label}을(를) 삭제하시겠습니까?`)) return;
	await onConfirm();
}

function ToolBar({ onCreate }: { onCreate: () => void }) {
	return (
		<div className="mb-3 flex justify-end">
			<button
				type="button"
				onClick={onCreate}
				className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-3 py-1.5 font-medium text-sm text-white hover:bg-violet-700"
			>
				<Plus className="h-4 w-4" />
				새로 추가
			</button>
		</div>
	)
}

interface PydanticErrorItem {
	loc: (string | number)[];
	msg: string;
}

function formatValidationError(items: PydanticErrorItem[]): string {
	return items
		.map((it) => {
			// loc starts with "body"; drop it for readability.
			const path = it.loc
				.slice(1)
				.map((p) => String(p))
				.join(".")
			// Pydantic prefixes "Value error, " for custom validators — strip it.
			const msg = it.msg.replace(/^Value error,\s*/, "");
			return path ? `${path}: ${msg}` : msg;
		})
		.join("\n");
}

async function callPatch(
	fn: () => Promise<unknown>,
): Promise<{ ok: boolean; error?: string }> {
	try {
		await fn();
		return { ok: true };
	} catch (err) {
		const raw = err instanceof Error ? err.message : String(err);
		try {
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed.detail === "string") {
				return { ok: false, error: parsed.detail };
			}
			if (parsed && Array.isArray(parsed.detail)) {
				return { ok: false, error: formatValidationError(parsed.detail) };
			}
		} catch {
			// not JSON — fall through
		}
		return { ok: false, error: raw };
	}
}

// ─── spring-picnic ──────────────────────────────────────

function FriendsTab() {
	const ed = useEditor<SpringPicnicFriend>(listSpringPicnicFriends, () => ({
		id: "",
		face: "",
		name: "",
		bg: "#9CA3AF",
		cats: [],
		mission: "",
		desc: "",
		desc2: "",
	}));

	const columns: Column<SpringPicnicFriend>[] = [
		{ key: "id", label: "ID", width: "100px" },
		{ key: "face", label: "이모지", width: "70px" },
		{ key: "name", label: "이름" },
		{ key: "mission", label: "미션" },
		{
			key: "cats",
			label: "카테고리",
			render: (r) => r.cats.join(", "),
		},
	]

	const fields: FieldSpec[] = [
		{ key: "id", label: "ID", type: "text", disabled: true, editableOnCreate: true },
		{ key: "face", label: "이모지", type: "text" },
		{ key: "name", label: "이름", type: "text" },
		{ key: "bg", label: "배경색 (HEX)", type: "text" },
		{ key: "mission", label: "미션", type: "text" },
		{ key: "desc", label: "설명 (쉬움)", type: "text" },
		{ key: "desc2", label: "설명 (어려움)", type: "text" },
		{ key: "cats", label: "카테고리 배열", type: "json", rows: 4 },
	]

	return (
		<>
			<ToolBar onCreate={ed.openCreate} />
			<DataTable<SpringPicnicFriend>
				rows={ed.rows}
				columns={columns}
				loading={ed.loading}
				getRowKey={(r) => r.id}
				onEdit={ed.openEdit}
				onDelete={(r) =>
					confirmDelete({
						label: `캐릭터 "${r.name}"`,
						onConfirm: async () => {
							await callPatch(() => deleteSpringPicnicFriend(r.id));
							await ed.reload()
						},
					})
				}
			/>
			<EditModal
				title={
					ed.mode === "create"
						? "캐릭터 추가"
						: `캐릭터 편집 — ${ed.editing?.id ?? ""}`
				}
				open={!!ed.editing}
				mode={ed.mode}
				initialValue={(ed.editing ?? {}) as Record<string, unknown>}
				fields={fields}
				onClose={ed.close}
				onSave={async (payload) => {
					if (!ed.editing) return { ok: false };
					const res =
						ed.mode === "create"
							? await callPatch(() => createSpringPicnicFriend(payload))
							: await callPatch(() =>
									updateSpringPicnicFriend(ed.editing!.id, payload),
								)
					if (res.ok) await ed.reload();
					return res
				}}
			/>
		</>
	)
}

function QuestionsTab() {
	const ed = useEditor<SpringPicnicQuestion>(listSpringPicnicQuestions, () => ({
		id: "",
		cat: "",
		level: 1,
		il: "",
		hint: { ko: "", en: "", zh: "", ja: "", vi: "" },
		num: "",
		tmpl: "",
		tts: "",
		correct: "",
		wrong: [],
	}));

	const columns: Column<SpringPicnicQuestion>[] = [
		{ key: "id", label: "ID", width: "90px" },
		{ key: "cat", label: "카테고리", width: "90px" },
		{ key: "level", label: "레벨", width: "70px" },
		{ key: "num", label: "숫자", width: "120px" },
		{ key: "tmpl", label: "템플릿" },
		{ key: "correct", label: "정답" },
	]

	const fields: FieldSpec[] = [
		{ key: "id", label: "ID", type: "text", disabled: true, editableOnCreate: true },
		{ key: "cat", label: "카테고리", type: "text" },
		{ key: "level", label: "레벨", type: "number" },
		{ key: "il", label: "일러스트 이모지", type: "text" },
		{ key: "num", label: "숫자 표시", type: "text" },
		{ key: "tmpl", label: "문장 템플릿 (___ 자리)", type: "text" },
		{ key: "tts", label: "TTS 텍스트", type: "text" },
		{ key: "correct", label: "정답", type: "text" },
		{ key: "hint", label: "다국어 힌트 (JSON)", type: "json", rows: 7 },
		{ key: "wrong", label: "오답 배열 (JSON)", type: "json", rows: 4 },
	]

	return (
		<>
			<ToolBar onCreate={ed.openCreate} />
			<DataTable<SpringPicnicQuestion>
				rows={ed.rows}
				columns={columns}
				loading={ed.loading}
				getRowKey={(r) => r.id}
				onEdit={ed.openEdit}
				onDelete={(r) =>
					confirmDelete({
						label: `문항 "${r.id}"`,
						onConfirm: async () => {
							await callPatch(() => deleteSpringPicnicQuestion(r.id));
							await ed.reload()
						},
					})
				}
			/>
			<EditModal
				title={
					ed.mode === "create"
						? "문항 추가"
						: `문항 편집 — ${ed.editing?.id ?? ""}`
				}
				open={!!ed.editing}
				mode={ed.mode}
				initialValue={(ed.editing ?? {}) as Record<string, unknown>}
				fields={fields}
				onClose={ed.close}
				onSave={async (payload) => {
					if (!ed.editing) return { ok: false };
					const res =
						ed.mode === "create"
							? await callPatch(() => createSpringPicnicQuestion(payload))
							: await callPatch(() =>
									updateSpringPicnicQuestion(ed.editing!.id, payload),
								)
					if (res.ok) await ed.reload();
					return res
				}}
			/>
		</>
	)
}

// ─── particle-sniper ──────────────────────────────────────

function LevelsTab() {
	const loader = useCallback(async () => {
		const map = await (async () => {
			const res = await api.get<
				Record<string, { summary: string; color: string; accent: string }>
			>("/game-content/particle-sniper/levels");
			return res.result && res.data ? res.data : {};
		})()
		return Object.entries(map).map(([id, v]) => ({ id, ...v }));
	}, []);
	const ed = useEditor<ParticleSniperLevel>(loader, () => ({
		id: "",
		summary: "",
		color: "#9CA3AF",
		accent: "#000000",
	}));

	const columns: Column<ParticleSniperLevel>[] = [
		{ key: "id", label: "급수", width: "100px" },
		{ key: "summary", label: "조사 요약" },
		{ key: "color", label: "색상", width: "100px" },
		{ key: "accent", label: "강조색", width: "100px" },
	]

	const fields: FieldSpec[] = [
		{ key: "id", label: "급수", type: "text", disabled: true, editableOnCreate: true },
		{ key: "summary", label: "조사 요약", type: "text" },
		{ key: "color", label: "색상 (HEX)", type: "text" },
		{ key: "accent", label: "강조색 (HEX)", type: "text" },
	]

	return (
		<>
			<ToolBar onCreate={ed.openCreate} />
			<DataTable<ParticleSniperLevel>
				rows={ed.rows}
				columns={columns}
				loading={ed.loading}
				getRowKey={(r) => r.id}
				onEdit={ed.openEdit}
				onDelete={(r) =>
					confirmDelete({
						label: `급수 "${r.id}"`,
						onConfirm: async () => {
							await callPatch(() => deleteParticleSniperLevel(r.id));
							await ed.reload()
						},
					})
				}
			/>
			<EditModal
				title={
					ed.mode === "create"
						? "급수 추가"
						: `급수 편집 — ${ed.editing?.id ?? ""}`
				}
				open={!!ed.editing}
				mode={ed.mode}
				initialValue={(ed.editing ?? {}) as Record<string, unknown>}
				fields={fields}
				onClose={ed.close}
				onSave={async (payload) => {
					if (!ed.editing) return { ok: false };
					const res =
						ed.mode === "create"
							? await callPatch(() => createParticleSniperLevel(payload))
							: await callPatch(() =>
									updateParticleSniperLevel(ed.editing!.id, payload),
								)
					if (res.ok) await ed.reload();
					return res
				}}
			/>
		</>
	)
}

function LessonsTab() {
	const ed = useEditor<ParticleSniperLesson>(listParticleSniperLessons, () => ({
		id: 0,
		level: "",
		lesson_name: "",
		new_particles: [],
		cumulative_particles: [],
		questions: [],
	}));

	const columns: Column<ParticleSniperLesson>[] = [
		{ key: "id", label: "ID", width: "70px" },
		{ key: "level", label: "급수", width: "80px" },
		{ key: "lesson_name", label: "과", width: "90px" },
		{
			key: "new_particles",
			label: "신규 조사",
			render: (r) => r.new_particles.join(", "),
		},
		{
			key: "questions",
			label: "문항 수",
			render: (r) => `${r.questions.length}개`,
			width: "100px",
		},
	]

	const fields: FieldSpec[] = [
		{ key: "id", label: "ID (자동)", type: "number", disabled: true },
		{ key: "level", label: "급수", type: "text" },
		{ key: "lesson_name", label: "과", type: "text" },
		{
			key: "new_particles",
			label: "신규 조사 배열 (JSON)",
			type: "json",
			rows: 3,
		},
		{
			key: "cumulative_particles",
			label: "누적 조사 배열 (JSON)",
			type: "json",
			rows: 4,
		},
		{
			key: "questions",
			label: "문항 배열 (JSON)",
			type: "json",
			rows: 16,
		},
	]

	return (
		<>
			<ToolBar onCreate={ed.openCreate} />
			<DataTable<ParticleSniperLesson>
				rows={ed.rows}
				columns={columns}
				loading={ed.loading}
				getRowKey={(r) => r.id}
				onEdit={ed.openEdit}
				onDelete={(r) =>
					confirmDelete({
						label: `레슨 "${r.level} ${r.lesson_name}"`,
						onConfirm: async () => {
							await callPatch(() => deleteParticleSniperLesson(r.id));
							await ed.reload()
						},
					})
				}
			/>
			<EditModal
				title={
					ed.mode === "create"
						? "레슨 추가"
						: `레슨 편집 — ${ed.editing?.level ?? ""} ${ed.editing?.lesson_name ?? ""}`
				}
				open={!!ed.editing}
				mode={ed.mode}
				initialValue={(ed.editing ?? {}) as Record<string, unknown>}
				fields={fields}
				onClose={ed.close}
				onSave={async (payload) => {
					if (!ed.editing) return { ok: false };
					const res =
						ed.mode === "create"
							? await callPatch(() => createParticleSniperLesson(payload))
							: await callPatch(() =>
									updateParticleSniperLesson(ed.editing!.id, payload),
								)
					if (res.ok) await ed.reload();
					return res
				}}
			/>
		</>
	)
}

// ─── card-sort ──────────────────────────────────────

function CategoriesTab() {
	const ed = useEditor<CardSortCategory>(listCardSortCategories, () => ({
		name: "",
		color: "#9CA3AF",
		sort_order: 0,
	}));

	const columns: Column<CardSortCategory>[] = [
		{ key: "name", label: "이름" },
		{ key: "color", label: "색상 (HEX)", width: "140px" },
		{ key: "sort_order", label: "정렬", width: "80px" },
	]

	const fields: FieldSpec[] = [
		{ key: "name", label: "이름", type: "text", disabled: true, editableOnCreate: true },
		{ key: "color", label: "색상 (HEX)", type: "text" },
		{ key: "sort_order", label: "정렬 순서", type: "number" },
	]

	return (
		<>
			<ToolBar onCreate={ed.openCreate} />
			<DataTable<CardSortCategory>
				rows={ed.rows}
				columns={columns}
				loading={ed.loading}
				getRowKey={(r) => r.name}
				onEdit={ed.openEdit}
				onDelete={(r) =>
					confirmDelete({
						label: `카테고리 "${r.name}"`,
						onConfirm: async () => {
							await callPatch(() => deleteCardSortCategory(r.name));
							await ed.reload()
						},
					})
				}
			/>
			<EditModal
				title={
					ed.mode === "create"
						? "카테고리 추가"
						: `카테고리 편집 — ${ed.editing?.name ?? ""}`
				}
				open={!!ed.editing}
				mode={ed.mode}
				initialValue={(ed.editing ?? {}) as Record<string, unknown>}
				fields={fields}
				onClose={ed.close}
				onSave={async (payload) => {
					if (!ed.editing) return { ok: false };
					const res =
						ed.mode === "create"
							? await callPatch(() => createCardSortCategory(payload))
							: await callPatch(() =>
									updateCardSortCategory(ed.editing!.name, payload),
								)
					if (res.ok) await ed.reload();
					return res
				}}
			/>
		</>
	)
}

function VocabTab() {
	const ed = useEditor<CardSortVocabRow>(listCardSortVocab, () => ({
		id: 0,
		grade: "",
		lesson: "",
		new_categories: [],
		words: {},
	}));

	const columns: Column<CardSortVocabRow>[] = [
		{ key: "id", label: "ID", width: "70px" },
		{ key: "grade", label: "급", width: "80px" },
		{ key: "lesson", label: "과", width: "80px" },
		{
			key: "new_categories",
			label: "신규 카테고리",
			render: (r) => r.new_categories.join(", "),
		},
		{
			key: "words",
			label: "단어 수",
			render: (r) =>
				Object.values(r.words).reduce((s, ws) => s + ws.length, 0) + "개",
			width: "100px",
		},
	]

	const fields: FieldSpec[] = [
		{ key: "id", label: "ID (자동)", type: "number", disabled: true },
		{ key: "grade", label: "급", type: "text" },
		{ key: "lesson", label: "과", type: "text" },
		{
			key: "new_categories",
			label: "신규 카테고리 배열 (JSON)",
			type: "json",
			rows: 3,
		},
		{
			key: "words",
			label: "카테고리별 단어 (JSON)",
			type: "json",
			rows: 12,
		},
	]

	return (
		<>
			<ToolBar onCreate={ed.openCreate} />
			<DataTable<CardSortVocabRow>
				rows={ed.rows}
				columns={columns}
				loading={ed.loading}
				getRowKey={(r) => r.id}
				onEdit={ed.openEdit}
				onDelete={(r) =>
					confirmDelete({
						label: `어휘 "${r.grade} ${r.lesson}"`,
						onConfirm: async () => {
							await callPatch(() => deleteCardSortVocab(r.id));
							await ed.reload()
						},
					})
				}
			/>
			<EditModal
				title={
					ed.mode === "create"
						? "어휘 추가"
						: `어휘 편집 — ${ed.editing?.grade ?? ""} ${ed.editing?.lesson ?? ""}`
				}
				open={!!ed.editing}
				mode={ed.mode}
				initialValue={(ed.editing ?? {}) as Record<string, unknown>}
				fields={fields}
				onClose={ed.close}
				onSave={async (payload) => {
					if (!ed.editing) return { ok: false };
					const res =
						ed.mode === "create"
							? await callPatch(() => createCardSortVocab(payload))
							: await callPatch(() =>
									updateCardSortVocab(ed.editing!.id, payload),
								)
					if (res.ok) await ed.reload();
					return res
				}}
			/>
		</>
	)
}

function RareTab() {
	const ed = useEditor<CardSortRareRow>(listCardSortRare, () => ({
		word: "",
		category: "",
		confusable_with: "",
	}));

	const columns: Column<CardSortRareRow>[] = [
		{ key: "word", label: "단어" },
		{ key: "category", label: "카테고리" },
		{ key: "confusable_with", label: "혼동 가능" },
	]

	const fields: FieldSpec[] = [
		{ key: "word", label: "단어", type: "text", disabled: true, editableOnCreate: true },
		{ key: "category", label: "카테고리", type: "text" },
		{ key: "confusable_with", label: "혼동 가능 단어 (콤마구분)", type: "text" },
	]

	return (
		<>
			<ToolBar onCreate={ed.openCreate} />
			<DataTable<CardSortRareRow>
				rows={ed.rows}
				columns={columns}
				loading={ed.loading}
				getRowKey={(r) => r.word}
				onEdit={ed.openEdit}
				onDelete={(r) =>
					confirmDelete({
						label: `희귀어 "${r.word}"`,
						onConfirm: async () => {
							await callPatch(() => deleteCardSortRare(r.word));
							await ed.reload()
						},
					})
				}
			/>
			<EditModal
				title={
					ed.mode === "create"
						? "희귀어 추가"
						: `희귀어 편집 — ${ed.editing?.word ?? ""}`
				}
				open={!!ed.editing}
				mode={ed.mode}
				initialValue={(ed.editing ?? {}) as Record<string, unknown>}
				fields={fields}
				onClose={ed.close}
				onSave={async (payload) => {
					if (!ed.editing) return { ok: false };
					const res =
						ed.mode === "create"
							? await callPatch(() => createCardSortRare(payload))
							: await callPatch(() =>
									updateCardSortRare(ed.editing!.word, payload),
								)
					if (res.ok) await ed.reload();
					return res
				}}
			/>
		</>
	)
}

// ─── seoul-puzzle ──────────────────────────────────────

function LocationsTab() {
	const ed = useEditor<SeoulPuzzleLocation>(listSeoulPuzzleLocations, () => ({
		id: "",
		name: "",
		num: 0,
		x: 0,
		y: 0,
		unit: "",
		desc: "",
		grammar: [],
		entryMessages: [],
	}));

	const columns: Column<SeoulPuzzleLocation>[] = [
		{ key: "num", label: "#", width: "60px" },
		{ key: "id", label: "ID", width: "120px" },
		{ key: "name", label: "이름" },
		{ key: "unit", label: "과", width: "100px" },
		{ key: "desc", label: "설명" },
	]

	const fields: FieldSpec[] = [
		{ key: "id", label: "ID", type: "text", disabled: true, editableOnCreate: true },
		{ key: "name", label: "이름", type: "text" },
		{ key: "num", label: "번호", type: "number" },
		{ key: "x", label: "지도 X", type: "number" },
		{ key: "y", label: "지도 Y", type: "number" },
		{ key: "unit", label: "과 범위", type: "text" },
		{ key: "desc", label: "설명", type: "text" },
		{ key: "grammar", label: "문법 배열 (JSON)", type: "json", rows: 4 },
		{
			key: "entryMessages",
			label: "입장 메시지 (JSON)",
			type: "json",
			rows: 8,
		},
	]

	return (
		<>
			<ToolBar onCreate={ed.openCreate} />
			<DataTable<SeoulPuzzleLocation>
				rows={ed.rows}
				columns={columns}
				loading={ed.loading}
				getRowKey={(r) => r.id}
				onEdit={ed.openEdit}
				onDelete={(r) =>
					confirmDelete({
						label: `장소 "${r.name}"`,
						onConfirm: async () => {
							await callPatch(() => deleteSeoulPuzzleLocation(r.id));
							await ed.reload()
						},
					})
				}
			/>
			<EditModal
				title={
					ed.mode === "create"
						? "장소 추가"
						: `장소 편집 — ${ed.editing?.name ?? ""}`
				}
				open={!!ed.editing}
				mode={ed.mode}
				initialValue={(ed.editing ?? {}) as Record<string, unknown>}
				fields={fields}
				onClose={ed.close}
				onSave={async (payload) => {
					if (!ed.editing) return { ok: false };
					const res =
						ed.mode === "create"
							? await callPatch(() => createSeoulPuzzleLocation(payload))
							: await callPatch(() =>
									updateSeoulPuzzleLocation(ed.editing!.id, payload),
								)
					if (res.ok) await ed.reload();
					return res
				}}
			/>
		</>
	)
}

function StepsTab() {
	const ed = useEditor<SeoulPuzzleStep>(listSeoulPuzzleSteps, () => ({
		id: 0,
		location_id: "",
		step_index: 0,
		data: {},
	}));

	const columns: Column<SeoulPuzzleStep>[] = [
		{ key: "id", label: "ID", width: "70px" },
		{ key: "location_id", label: "장소", width: "140px" },
		{ key: "step_index", label: "단계", width: "80px" },
		{
			key: "data",
			label: "내용 미리보기",
			render: (r) => {
				const d = r.data as Record<string, unknown>;
				return String(d.friendMsg ?? d.hintText ?? "");
			},
		},
	]

	const fields: FieldSpec[] = [
		{ key: "id", label: "ID (자동)", type: "number", disabled: true },
		{ key: "location_id", label: "장소 ID", type: "text" },
		{ key: "step_index", label: "단계 번호", type: "number" },
		{ key: "data", label: "단계 데이터 (JSON)", type: "json", rows: 16 },
	]

	const previewLabel = useMemo(() => {
		if (!ed.editing) return "";
		return `${ed.editing.location_id} #${ed.editing.step_index}`;
	}, [ed.editing]);

	return (
		<>
			<ToolBar onCreate={ed.openCreate} />
			<DataTable<SeoulPuzzleStep>
				rows={ed.rows}
				columns={columns}
				loading={ed.loading}
				getRowKey={(r) => r.id}
				onEdit={ed.openEdit}
				onDelete={(r) =>
					confirmDelete({
						label: `단계 "${r.location_id} #${r.step_index}"`,
						onConfirm: async () => {
							await callPatch(() => deleteSeoulPuzzleStep(r.id));
							await ed.reload()
						},
					})
				}
			/>
			<EditModal
				title={ed.mode === "create" ? "단계 추가" : `단계 편집 — ${previewLabel}`}
				open={!!ed.editing}
				mode={ed.mode}
				initialValue={(ed.editing ?? {}) as Record<string, unknown>}
				fields={fields}
				onClose={ed.close}
				onSave={async (payload) => {
					if (!ed.editing) return { ok: false };
					const res =
						ed.mode === "create"
							? await callPatch(() => createSeoulPuzzleStep(payload))
							: await callPatch(() =>
									updateSeoulPuzzleStep(ed.editing!.id, payload),
								)
					if (res.ok) await ed.reload();
					return res
				}}
			/>
		</>
	)
}

// ─── vocashot ──────────────────────────────────────

function PresetsTab() {
	const ed = useEditor<VocashotPreset>(listVocashotPresets, () => ({
		id: "",
		label: "",
		vocab: [],
	}));

	const columns: Column<VocashotPreset>[] = [
		{ key: "id", label: "ID", width: "180px" },
		{ key: "label", label: "이름" },
		{
			key: "vocab",
			label: "문항 수",
			render: (r) => `${r.vocab.length}개`,
			width: "100px",
		},
	]

	const fields: FieldSpec[] = [
		{ key: "id", label: "ID", type: "text", disabled: true, editableOnCreate: true },
		{ key: "label", label: "이름", type: "text" },
		{ key: "vocab", label: "단어 배열 (JSON)", type: "json", rows: 18 },
	]

	return (
		<>
			<ToolBar onCreate={ed.openCreate} />
			<DataTable<VocashotPreset>
				rows={ed.rows}
				columns={columns}
				loading={ed.loading}
				getRowKey={(r) => r.id}
				onEdit={ed.openEdit}
				onDelete={(r) =>
					confirmDelete({
						label: `프리셋 "${r.label}"`,
						onConfirm: async () => {
							await callPatch(() => deleteVocashotPreset(r.id));
							await ed.reload()
						},
					})
				}
			/>
			<EditModal
				title={
					ed.mode === "create"
						? "프리셋 추가"
						: `프리셋 편집 — ${ed.editing?.label ?? ""}`
				}
				open={!!ed.editing}
				mode={ed.mode}
				initialValue={(ed.editing ?? {}) as Record<string, unknown>}
				fields={fields}
				onClose={ed.close}
				onSave={async (payload) => {
					if (!ed.editing) return { ok: false };
					const res =
						ed.mode === "create"
							? await callPatch(() => createVocashotPreset(payload))
							: await callPatch(() =>
									updateVocashotPreset(ed.editing!.id, payload),
								)
					if (res.ok) await ed.reload();
					return res
				}}
			/>
		</>
	)
}
