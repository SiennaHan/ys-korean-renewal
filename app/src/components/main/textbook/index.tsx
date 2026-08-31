import type { LearningProgress } from "@/api/apiType";
import { getChatListByBookId } from "@/api/chat";
import { isChapterOpen, isJamoChapterOpen } from "@/api/entitlement";
import { listUserFlashcardWord } from "@/api/flashcard";
import { getLearningProgress } from "@/api/learning-record";
import { books } from "@/shared/data/book";
import { chapters } from "@/shared/data/chapter";
import { dialogs } from "@/shared/data/dialog";
import { setNumericId } from "@/shared/data/flashcard";
import {
	getBlankQuestionCount,
	getFlashcardWordCount,
	getListenQuestionCount,
	getReadQuestionCount,
	getRoleplayScenarioCount,
	getWordQuizCount,
	hasBlankData,
	hasListenData,
	hasReadData,
	hasRoleplayData,
	hasWordData,
} from "@/shared/data/learn-data-check";
import { modules } from "@/shared/data/module";
import { units } from "@/shared/data/unit";
import { useEntitlement } from "@/shared/store/entitlement-store";
import { useManifest } from "@/shared/store/manifest-store";
import { useTextbookSelectionStore } from "@/shared/store/menu-store";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import BookTabs from "./book-tabs";
import ChapterChips from "./chapter-chips";
import { buildBookTabs, buildChapterChips } from "./labels";
import ModuleList, {
	type ModuleSection,
	type ModuleState,
	ChapterHead,
} from "./module-list";
import PaywallPanel from "./paywall-panel";

export default function TextbookContent() {
	const navigate = useNavigate();
	const { t } = useTranslation();
	/** 과별 활동 개수 — 서버 매니페스트(DEV-05). 잠긴 과도 준다 */
	const { counts: manifestCounts } = useManifest();

	// --- State (persisted in Zustand) ---
	const {
		bookTab: activeBookTab,
		chapterId: activeChapterId,
		setBookTab,
		setChapterId,
	} = useTextbookSelectionStore();

	// --- Derived data ---

	// 급 탭 — 자모 목록과 같은 것을 쓴다 (labels.ts)
	const bookTabs = useMemo(() => buildBookTabs(t), [t]);

	// Filter chapters by selected book tab
	const filteredChapters = useMemo(() => {
		if (activeBookTab === "jamo") {
			return chapters.filter((ch) => ch.type === "jamo");
		}
		return chapters.filter(
			(ch) => ch.book_id === activeBookTab && ch.type !== "jamo",
		);
	}, [activeBookTab]);

	// 과 칩 — 자모 목록과 같은 것을 쓴다
	const chapterChips = useMemo(
		() => buildChapterChips(filteredChapters, t),
		[filteredChapters, t],
	);

	// Auto-select first chapter when book changes
	const selectedChapterId = useMemo(() => {
		if (
			activeChapterId &&
			filteredChapters.some((ch) => ch.id === activeChapterId)
		) {
			return activeChapterId;
		}
		return filteredChapters.length > 0 ? filteredChapters[0].id : null;
	}, [activeChapterId, filteredChapters]);

	// Selected chapter
	const selectedChapter = useMemo(() => {
		return filteredChapters.find((ch) => ch.id === selectedChapterId);
	}, [filteredChapters, selectedChapterId]);

	/*
	 * 열린 범위 — 서버가 정한다. 앱은 계산하지 않고 이 답만 본다
	 * (access_and_pricing_v1 §04).
	 */
	const { entitlement, ready } = useEntitlement();

	/**
	 * 잠긴 과의 칩 id.
	 *
	 * **답이 오기 전에는 비운다.** 아직 null 인데 잠금을 그리면 무료 과까지
	 * 잠긴 것처럼 한 번 번쩍인다. 목업 대조도 서버 없이 그리므로 여기서
	 * 비워 두면 대조가 지금 그림을 그대로 본다.
	 */
	const lockedChipIds = useMemo(() => {
		if (!ready) return new Set<number>();
		const locked = new Set<number>();
		for (const ch of filteredChapters) {
			const open =
				ch.type === "jamo"
					? isJamoChapterOpen(entitlement, ch.seq)
					: isChapterOpen(entitlement, ch.book_id, ch.seq);
			if (!open) locked.add(ch.id);
		}
		return locked;
	}, [ready, entitlement, filteredChapters]);

	const selectedLocked =
		selectedChapter != null && lockedChipIds.has(selectedChapter.id);

	/** 무료 과로 돌려보낸다 — 이 급에 무료가 없으면 첫 과로 */
	const goToFreeChapter = useCallback(() => {
		const free = filteredChapters.find((ch) => !lockedChipIds.has(ch.id));
		if (free) setChapterId(free.id);
	}, [filteredChapters, lockedChipIds, setChapterId]);

	// Find module code by scene_type for the current chapter
	const findModuleCode = useCallback(
		(sceneType: string): string | null => {
			if (!selectedChapterId) return null;
			const chapterUnitIds = units
				.filter((u) => u.chapter_id === selectedChapterId)
				.map((u) => u.id);
			const mod = modules.find(
				(m) => chapterUnitIds.includes(m.unit_id) && m.scene_type === sceneType,
			);
			return mod?.code ?? null;
		},
		[selectedChapterId],
	);

	/**
	 * 이 과에 플래시카드가 있나 — **매니페스트가 답한다**(DEV-05).
	 *
	 * 전에는 번들의 `flashcards` 에서 세트를 찾았다. 여기서 세트로 하는 일은
	 * ① 있나 없나 ② 학습자 기록을 부를 세트 번호 둘뿐인데, **번호는 급·과에서
	 * 계산한다**(`setNumericId`) — 그래서 세트 자체가 필요 없다.
	 */
	const hasFlashcard = useMemo(() => {
		if (!selectedChapter || activeBookTab === "jamo") return false;
		return (
			getFlashcardWordCount(
				manifestCounts,
				activeBookTab as number,
				selectedChapter.seq,
			) > 0
		);
	}, [activeBookTab, selectedChapter, manifestCounts]);

	// Check if mission_chat exists for current chapter
	const hasMissionChat = useMemo(() => {
		return !!findModuleCode("mission_chat");
	}, [findModuleCode]);

	// Fetch learning progress
	const [progress, setProgress] = useState<LearningProgress>({});
	const [flashcardCompleted, setFlashcardCompleted] = useState(false);
	const [missionChatCompleted, setMissionChatCompleted] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: refetch on book/chapter change
	useEffect(() => {
		if (activeBookTab === "jamo" || !selectedChapter) {
			setProgress({});
			setFlashcardCompleted(false);
			setMissionChatCompleted(false);
			return;
		}
		const bookId = activeBookTab as number;
		const seq = selectedChapter.seq;

		// Basic learning progress
		getLearningProgress(bookId, seq).then(setProgress);

		// Flashcard completion: check if all words answered for both types
		const totalWords = getFlashcardWordCount(manifestCounts, bookId, seq);
		if (totalWords > 0) {
			// 세트 번호는 급·과에서 계산한다 — 서버 표에 그런 열이 없다
			const setId = setNumericId(bookId, seq);
			listUserFlashcardWord(setId).then((words) => {
				// Complete if at least one card type (wm or mw) has all words answered
				const wmCards = words.filter((w) => w.card_type === "wm");
				const mwCards = words.filter((w) => w.card_type === "mw");
				setFlashcardCompleted(
					wmCards.length >= totalWords || mwCards.length >= totalWords,
				);
			});
		} else {
			setFlashcardCompleted(false);
		}

		// Mission chat completion: check chat status
		const chapterDialogs = dialogs.filter(
			(d: { book_id: number; chapter: number }) =>
				d.book_id === bookId && d.chapter === seq,
		);
		if (chapterDialogs.length > 0) {
			getChatListByBookId(bookId).then((chats) => {
				const dialogIds = chapterDialogs.map((d: { id: string }) => d.id);
				const allCompleted = dialogIds.every((dialogId: string) => {
					const chat = chats.find((c) => c.dialog_id === dialogId);
					return chat?.status === "completed";
				});
				setMissionChatCompleted(allCompleted);
			});
		} else {
			setMissionChatCompleted(false);
		}
	}, [activeBookTab, selectedChapter?.id]);

	/** 메뉴의 완료 여부: 학습한 문항 수 >= 총 문제 수이면 완료 */
	/**
	 * 활동 한 줄의 상태. 완료·미완료 둘로 접지 않는다 —
	 * 손댔지만 아직 안 끝난 것을 미완료로 묶으면 어디까지 왔는지가 사라진다.
	 * 잠김(off)은 데이터 유무라 부르는 쪽에서 정한다.
	 */
	const menuState = useCallback(
		(menuType: string, totalQuestions: number): ModuleState => {
			if (totalQuestions === 0) return "none";
			const done = progress[menuType]?.total ?? 0;
			if (done >= totalQuestions) return "done";
			return done > 0 ? "doing" : "none";
		},
		[progress],
	);

	// Fixed module sections — disable if no data for current book/chapter
	const moduleSections = useMemo(() => {
		if (!selectedChapterId || !selectedChapter) return [];
		const bookId = activeBookTab as number;
		const seq = selectedChapter.seq;
		const fold = (
			raw: {
				label: string;
				modules: {
					id: string;
					title: string;
					progress: ModuleState;
					disabled: boolean;
				}[];
			}[],
		): ModuleSection[] =>
			raw.map((sec) => ({
				label: sec.label,
				modules: sec.modules.map(({ id, title, progress: st, disabled }) => ({
					id,
					title,
					state: disabled ? ("off" as const) : st,
				})),
			}));
		return fold([
			{
				label: t("catalog.sectionBasic"),
				modules: [
					{
						id: "word",
						title: t("catalog.act.word"),
						progress: menuState(
							"word",
							getWordQuizCount(manifestCounts, bookId, seq),
						),
						disabled: !hasWordData(manifestCounts, bookId, seq),
					},
					{
						id: "roleplay",
						title: t("catalog.act.roleplay"),
						progress: menuState(
							"roleplay",
							getRoleplayScenarioCount(manifestCounts, bookId, seq),
						),
						disabled: !hasRoleplayData(manifestCounts, bookId, seq),
					},
					{
						id: "listen-answer",
						title: t("catalog.act.listen-answer"),
						progress: menuState(
							"listen-answer",
							getListenQuestionCount(manifestCounts, bookId, seq),
						),
						disabled: !hasListenData(manifestCounts, bookId, seq),
					},
					{
						id: "fill-blank",
						title: t("catalog.act.fill-blank"),
						progress: menuState(
							"fill-blank",
							getBlankQuestionCount(manifestCounts, bookId, seq),
						),
						disabled: !hasBlankData(manifestCounts, bookId, seq),
					},
					{
						id: "read-answer",
						title: t("catalog.act.read-answer"),
						progress: menuState(
							"read-answer",
							getReadQuestionCount(manifestCounts, bookId, seq),
						),
						disabled: !hasReadData(manifestCounts, bookId, seq),
					},
				],
			},
			{
				label: t("catalog.sectionAdvanced"),
				modules: [
					{
						id: "mission-chat",
						title: t("catalog.act.mission-chat"),
						progress: missionChatCompleted ? "done" : "none",
						disabled: !hasMissionChat,
					},
					{
						id: "flashcard",
						title: t("catalog.act.flashcard"),
						progress: flashcardCompleted ? "done" : "none",
						disabled: !hasFlashcard,
					},
				],
			},
		]);
	}, [
		selectedChapterId,
		selectedChapter,
		activeBookTab,
		// **매니페스트는 화면이 뜬 뒤에 온다.** 빼면 첫 그림이 「활동 없음」으로 굳고
		// 답이 도착해도 다시 안 그려진다 — biome 이 짚어 줘서 찾았다(2026-08-31)
		manifestCounts,
		hasFlashcard,
		hasMissionChat,
		menuState,
		flashcardCompleted,
		missionChatCompleted,
		t,
	]);

	// --- Handlers ---
	const handleBookSelect = (id: number | "jamo") => {
		if (id === "jamo") {
			navigate({ to: "/main/textbook/jamo" });
			return;
		}
		setBookTab(id);
	};

	const handleChapterSelect = (id: number) => {
		setChapterId(id);
	};

	const handleModuleClick = (id: string) => {
		if (id === "flashcard") {
			// 신 경로는 급·과만 받는다 — 세트는 그쪽에서 찾는다 (명세 §4)
			if (hasFlashcard) {
				navigate({
					to: "/learn/flashcard",
					search: {
						level: activeBookTab as number,
						lesson: selectedChapter?.seq,
					},
				});
			}
			return;
		}

		if (id === "mission-chat") {
			// 신 경로는 급·과만 받는다 — 모듈은 그쪽에서 찾는다 (명세 §4)
			if (findModuleCode("mission_chat")) {
				navigate({
					to: "/learn/mission-chat",
					search: {
						level: activeBookTab as number,
						lesson: selectedChapter?.seq,
					},
				});
			}
			return;
		}

		// Basic learning modules → /learn routes
		// menu_type → 신규 라우트 (§4). 콘텐츠 ID 는 URL 에 싣지 않는다.
		const learnRouteMap: Record<string, string> = {
			word: "/learn/word",
			roleplay: "/learn/roleplay",
			"listen-answer": "/learn/listen",
			"fill-blank": "/learn/grammar",
			"read-answer": "/learn/read",
		};

		const learnRoute = learnRouteMap[id];
		if (learnRoute) {
			navigate({
				to: learnRoute,
				search: {
					level: activeBookTab as number,
					lesson: selectedChapter?.seq,
				},
			});
			return;
		}
	};

	return (
		<>
			{/* 앱바가 없다. 탭이 최상단에 온다 — 어느 급 어느 과인지가 곧 제목이다 */}
			<div className="catalog-nav">
				<BookTabs
					tabs={bookTabs}
					activeId={activeBookTab}
					onSelect={handleBookSelect}
				/>
				{chapterChips.length > 0 && selectedChapterId && (
					<ChapterChips
						chips={chapterChips}
						activeId={selectedChapterId}
						onSelect={handleChapterSelect}
						lockedIds={lockedChipIds}
					/>
				)}
			</div>

			<div className="scroll catalog-scroll">
				{selectedChapter && (
					<ChapterHead
						seq={selectedChapter.seq}
						title={selectedChapter.title}
					/>
				)}
				{/*
				 * 잠긴 과는 활동 목록 자리에 안내가 들어온다 — 제목과 자물쇠는
				 * 그대로 보인다(§06 "숨기지 않고 보이되 잠근다").
				 */}
				{selectedChapter && selectedLocked && (
					<PaywallPanel
						entitlement={entitlement}
						onBack={goToFreeChapter}
						onSignIn={() => navigate({ to: "/login" })}
					/>
				)}
				{selectedChapter && !selectedLocked && moduleSections.length > 0 && (
					<ModuleList
						sections={moduleSections}
						onModuleClick={handleModuleClick}
					/>
				)}
				{selectedChapter && !selectedLocked && moduleSections.length === 0 && (
					<div className="catalog-empty">{t("catalog.noModules")}</div>
				)}
			</div>
		</>
	);
}
