import type { LearningProgress } from "@/api/apiType";
import { getChatListByBookId } from "@/api/chat";
import { listUserFlashcardWord } from "@/api/flashcard";
import { getLearningProgress } from "@/api/learning-record";
import { books } from "@/shared/data/book";
import { chapters } from "@/shared/data/chapter";
import { flashcards } from "@/shared/data/flashcard";
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
import { dialogs } from "@/shared/data/dialog";
import { flashcard_words } from "@/shared/data/flashcard_word";
import { modules } from "@/shared/data/module";
import { units } from "@/shared/data/unit";
import { useTextbookSelectionStore } from "@/shared/store/menu-store";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import BookTabs from "./book-tabs";
import ChapterChips from "./chapter-chips";
import ModuleList from "./module-list";

export default function TextbookContent() {
	const navigate = useNavigate();

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

	// Current book title
	const bookTitle = useMemo(() => {
		if (activeBookTab === "jamo") return "한글 자모 익히기";
		const book = books.find((b) => b.id === activeBookTab);
		return book ? `3주 완성 연세 한국어 ${book.title}` : "";
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
				const dialogIds = chapterDialogs.map(
					(d: { id: string }) => d.id,
				);
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
	const isMenuCompleted = useCallback(
		(menuType: string, totalQuestions: number): boolean => {
			if (totalQuestions === 0) return false;
			const p = progress[menuType];
			if (!p) return false;
			return p.total >= totalQuestions;
		},
		[progress],
	);

	// Fixed module sections — disable if no data for current book/chapter
	const moduleSections = useMemo(() => {
		if (!selectedChapterId || !selectedChapter) return [];
		const bookId = activeBookTab as number;
		const seq = selectedChapter.seq;
		return [
			{
				label: "기초학습",
				modules: [
					{
						id: "word",
						title: "단어 학습하기",
						isCompleted: isMenuCompleted(
							"word",
							getWordQuizCount(bookId, seq),
						),
						disabled: !hasWordData(bookId, seq),
					},
					{
						id: "roleplay",
						title: "AI 롤플레잉",
						isCompleted: isMenuCompleted(
							"roleplay",
							getRoleplayScenarioCount(bookId, seq),
						),
						disabled: !hasRoleplayData(bookId, seq),
					},
					{
						id: "listen-answer",
						title: "듣고 질문에 답하기",
						isCompleted: isMenuCompleted(
							"listen-answer",
							getListenQuestionCount(bookId, seq),
						),
						disabled: !hasListenData(bookId, seq),
					},
					{
						id: "fill-blank",
						title: "빈칸 채워 말하기",
						isCompleted: isMenuCompleted(
							"fill-blank",
							getBlankQuestionCount(bookId, seq),
						),
						disabled: !hasBlankData(bookId, seq),
					},
					{
						id: "read-answer",
						title: "읽고 질문에 답하기",
						isCompleted: isMenuCompleted(
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
						isCompleted: missionChatCompleted,
						disabled: !hasMissionChat,
					},
					{
						id: "flashcard",
						title: "단어 플래시카드",
						isCompleted: flashcardCompleted,
						disabled: !currentFlashcard,
					},
				],
			},
		];
	}, [
		selectedChapterId,
		selectedChapter,
		activeBookTab,
		currentFlashcard,
		hasMissionChat,
		isMenuCompleted,
		flashcardCompleted,
		missionChatCompleted,
	]);

	// Chapter display title
	const chapterTitle = selectedChapter
		? `${selectedChapter.seq}과. ${selectedChapter.title}`
		: "";

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
		const learnRouteMap: Record<string, string> = {
			word: "/learn/word",
			roleplay: "/learn/roleplay",
			"listen-answer": "/learn/listen-answer",
			"fill-blank": "/learn/fill-blank",
			"read-answer": "/learn/read-answer",
		};

		const learnRoute = learnRouteMap[id];
		if (learnRoute) {
			navigate({
				to: learnRoute,
				search: {
					book: activeBookTab as number,
					chapter: selectedChapterId ?? undefined,
					chapterSeq: selectedChapter?.seq,
				},
			});
			return;
		}
	};

	return (
		<div className="flex h-full flex-col bg-[#F9FAFC]">
			{/* Header */}
			<div className="flex items-center justify-center px-[16px] py-[16px]">
				<p className="font-semibold text-[#383A3F] text-[17px]">{bookTitle}</p>
			</div>

			{/* Book tabs */}
			<BookTabs
				tabs={bookTabs}
				activeId={activeBookTab}
				onSelect={handleBookSelect}
			/>

			{/* Book title */}
			<div className="px-[16px] pt-[16px] pb-[12px]">
				<p className="font-bold text-[#359AFF] text-[14px]">{bookTitle}</p>
			</div>

			{/* Chapter chips */}
			{chapterChips.length > 0 && selectedChapterId && (
				<ChapterChips
					chips={chapterChips}
					activeId={selectedChapterId}
					onSelect={handleChapterSelect}
				/>
			)}

			{/* Module list */}
			<div className="scrollbar-hide flex-1 overflow-y-auto pt-[20px] pb-[80px]">
				{selectedChapter && moduleSections.length > 0 && (
					<ModuleList
						chapterTitle={chapterTitle}
						sections={moduleSections}
						onModuleClick={handleModuleClick}
					/>
				)}

				{moduleSections.length === 0 && selectedChapter && (
					<div className="flex h-[100px] items-center justify-center text-[#C8CCD3] text-[14px]">
						학습 모듈이 없습니다
					</div>
				)}
			</div>
		</div>
	);
}
