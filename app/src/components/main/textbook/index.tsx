import type { LearningProgress } from "@/api/apiType";
import { getChatListByBookId } from "@/api/chat";
import { listUserFlashcardWord } from "@/api/flashcard";
import { getLearningProgress } from "@/api/learning-record";
import { books } from "@/shared/data/book";
import { chapters } from "@/shared/data/chapter";
import { dialogs } from "@/shared/data/dialog";
import { flashcards } from "@/shared/data/flashcard";
import { flashcard_words } from "@/shared/data/flashcard_word";
import {
	getBlankQuestionCount,
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
import { useTextbookSelectionStore } from "@/shared/store/menu-store";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import BookTabs from "./book-tabs";
import ChapterChips from "./chapter-chips";
import ModuleList, {
	type ModuleSection,
	type ModuleState,
	ChapterHead,
} from "./module-list";

export default function TextbookContent() {
	const navigate = useNavigate();
	const { t } = useTranslation();

	// --- State (persisted in Zustand) ---
	const {
		bookTab: activeBookTab,
		chapterId: activeChapterId,
		setBookTab,
		setChapterId,
	} = useTextbookSelectionStore();

	// --- Derived data ---

	// Build book tabs: "한글" + all books
	const bookTabs = useMemo(() => {
		const hasJamo = chapters.some((ch) => ch.type === "jamo");
		const tabs: { id: number | "jamo"; label: string }[] = [];
		if (hasJamo) {
			tabs.push({ id: "jamo", label: "한글" });
		}
		for (const book of books) {
			tabs.push({ id: book.id, label: book.title });
		}
		return tabs;
	}, []);

	// Filter chapters by selected book tab
	const filteredChapters = useMemo(() => {
		if (activeBookTab === "jamo") {
			return chapters.filter((ch) => ch.type === "jamo");
		}
		return chapters.filter(
			(ch) => ch.book_id === activeBookTab && ch.type !== "jamo",
		);
	}, [activeBookTab]);

	// Chapter chips
	const chapterChips = useMemo(() => {
		return filteredChapters.map((ch) => ({
			id: ch.id,
			label: `${ch.seq}과`,
		}));
	}, [filteredChapters]);

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

	// Find flashcard for current book + chapter
	const currentFlashcard = useMemo(() => {
		if (!selectedChapter || activeBookTab === "jamo") return null;
		return (
			flashcards.find(
				(fc) =>
					fc.book_id === activeBookTab && fc.chapter === selectedChapter.seq,
			) ?? null
		);
	}, [activeBookTab, selectedChapter]);

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
		const fc = flashcards.find(
			(f) => f.book_id === bookId && f.chapter === seq,
		);
		if (fc) {
			const totalWords = flashcard_words.filter(
				(w) => w.flashcard_id === fc.id,
			).length;
			listUserFlashcardWord(fc.id).then((words) => {
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
				label: "기초학습",
				modules: [
					{
						id: "word",
						title: "단어 학습하기",
						progress: menuState("word", getWordQuizCount(bookId, seq)),
						disabled: !hasWordData(bookId, seq),
					},
					{
						id: "roleplay",
						title: "AI 롤플레잉",
						progress: menuState(
							"roleplay",
							getRoleplayScenarioCount(bookId, seq),
						),
						disabled: !hasRoleplayData(bookId, seq),
					},
					{
						id: "listen-answer",
						title: "듣고 질문에 답하기",
						progress: menuState(
							"listen-answer",
							getListenQuestionCount(bookId, seq),
						),
						disabled: !hasListenData(bookId, seq),
					},
					{
						id: "fill-blank",
						title: "빈칸 채워 말하기",
						progress: menuState(
							"fill-blank",
							getBlankQuestionCount(bookId, seq),
						),
						disabled: !hasBlankData(bookId, seq),
					},
					{
						id: "read-answer",
						title: "읽고 질문에 답하기",
						progress: menuState(
							"read-answer",
							getReadQuestionCount(bookId, seq),
						),
						disabled: !hasReadData(bookId, seq),
					},
				],
			},
			{
				label: "심화학습",
				modules: [
					{
						id: "mission-chat",
						title: "AI 미션 대화",
						progress: missionChatCompleted ? "done" : "none",
						disabled: !hasMissionChat,
					},
					{
						id: "flashcard",
						title: "단어 플래시카드",
						progress: flashcardCompleted ? "done" : "none",
						disabled: !currentFlashcard,
					},
				],
			},
		]);
	}, [
		selectedChapterId,
		selectedChapter,
		activeBookTab,
		currentFlashcard,
		hasMissionChat,
		menuState,
		flashcardCompleted,
		missionChatCompleted,
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
			if (currentFlashcard) {
				navigate({
					to: `/book/chapter/unit/flashcard/${currentFlashcard.id}`,
				});
			}
			return;
		}

		if (id === "mission-chat") {
			const code = findModuleCode("mission_chat");
			if (code) {
				navigate({ to: `/book/chapter/unit/mission_chat/${code}` });
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
				{selectedChapter && moduleSections.length > 0 && (
					<ModuleList
						sections={moduleSections}
						onModuleClick={handleModuleClick}
					/>
				)}
				{selectedChapter && moduleSections.length === 0 && (
					<div className="catalog-empty">{t("catalog.noModules")}</div>
				)}
			</div>
		</>
	);
}
