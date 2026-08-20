import BookTabs from "@/components/main/textbook/book-tabs";
import ChapterChips from "@/components/main/textbook/chapter-chips";
import { ActRow, ChapterHead } from "@/components/main/textbook/module-list";
import { books } from "@/shared/data/book";
import { chapters } from "@/shared/data/chapter";
import { modules } from "@/shared/data/module";
import { units } from "@/shared/data/unit";
import {
	useJamoChapterIdStore,
	useTextbookSelectionStore,
} from "@/shared/store/menu-store";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

export default function Jamo() {
	const navigate = useNavigate();
	const { t } = useTranslation();

	const { setBookTab } = useTextbookSelectionStore();
	const { chapterId: activeChapterSeq, setChapterId: setActiveChapterSeq } =
		useJamoChapterIdStore();

	// --- Derived data ---

	// Same book tabs as textbook: "한글" + all books
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

	// Jamo uses book 1 for now (first book with jamo chapters)
	const effectiveBookId = useMemo(() => {
		const jamoChapter = chapters.find((ch) => ch.type === "jamo");
		return jamoChapter?.book_id ?? 1;
	}, []);

	// Jamo chapters for the selected book
	const filteredChapters = useMemo(() => {
		return chapters.filter(
			(ch) => ch.book_id === effectiveBookId && ch.type === "jamo",
		);
	}, [effectiveBookId]);

	// Chapter chips
	const chapterChips = useMemo(() => {
		return filteredChapters.map((ch) => ({
			id: ch.seq,
			label: `${ch.seq}과`,
		}));
	}, [filteredChapters]);

	// Effective chapter seq
	const effectiveChapterSeq = useMemo(() => {
		if (
			activeChapterSeq !== 0 &&
			filteredChapters.some((ch) => ch.seq === activeChapterSeq)
		) {
			return activeChapterSeq;
		}
		return filteredChapters.length > 0 ? filteredChapters[0].seq : 0;
	}, [activeChapterSeq, filteredChapters]);

	// Selected chapter object
	const selectedChapter = useMemo(() => {
		return filteredChapters.find((ch) => ch.seq === effectiveChapterSeq);
	}, [filteredChapters, effectiveChapterSeq]);

	// Units + modules for the selected chapter
	const chapterUnits = useMemo(() => {
		if (!selectedChapter) return [];
		return units.filter((u) => u.chapter_id === selectedChapter.id);
	}, [selectedChapter]);

	// --- Handlers ---

	const handleBookSelect = useCallback(
		(id: number | "jamo") => {
			if (id === "jamo") return; // already on jamo page
			setBookTab(id);
			navigate({ to: "/main/textbook" });
		},
		[setBookTab, navigate],
	);

	const handleChapterSelect = useCallback(
		(seq: number) => {
			setActiveChapterSeq(seq);
		},
		[setActiveChapterSeq],
	);

	/** 구 scene_type → /learn/jamo/* 경로. 이름은 무엇을 하는 활동인지로 바꿨다 */
	const JAMO_ROUTE: Record<string, string> = {
		"listen-repeat": "/learn/jamo/pronounce",
		"listen-repeat2": "/learn/jamo/word-repeat",
		write: "/learn/jamo/combine",
		write3: "/learn/jamo/combine3",
		"read-write": "/learn/jamo/word-write",
		listen: "/learn/jamo/choose",
	};

	const handleModuleClick = useCallback(
		(id: string) => {
			const [sceneType, code] = id.split("/");
			const to = JAMO_ROUTE[sceneType];
			// 아직 안 옮긴 활동이 있으면 구 경로로 보낸다 — 리다이렉트가 받아 준다
			navigate(
				to ? { to, search: { code } } : { to: `/book/chapter/unit/${id}` },
			);
		},
		[navigate],
	);

	return (
		<>
			<div className="catalog-nav">
				<BookTabs
					tabs={bookTabs}
					activeId={"jamo"}
					onSelect={handleBookSelect}
				/>
				{chapterChips.length > 0 && effectiveChapterSeq !== 0 && (
					<ChapterChips
						chips={chapterChips}
						activeId={effectiveChapterSeq}
						onSelect={handleChapterSelect}
					/>
				)}
			</div>

			<div className="scroll catalog-scroll">
				{!selectedChapter && (
					<div className="catalog-empty">{t("catalog.noModules")}</div>
				)}

				{selectedChapter && (
					<>
						<ChapterHead
							seq={selectedChapter.seq}
							title={selectedChapter.title}
						/>
						{chapterUnits.map((unit) => {
							const moduleList = modules.filter((m) => m.unit_id === unit.id);
							// unit.title 은 "모음 1:ㅏ,ㅓ,ㅗ" 처럼 묶음 이름과 음절이 콜론으로 붙어 있다
							const [groupName, syllables] = unit.title.split(":");
							const syls = syllables ? syllables.split(",") : [];

							return (
								<div className="unit" key={unit.id}>
									<div className="ti">{groupName}</div>
									{syls.length > 0 && (
										<div className="syls">
											{syls.map((syl) => (
												<div key={syl}>{syl}</div>
											))}
										</div>
									)}
									<div className="acts">
										{moduleList.map((mod) => (
											<ActRow
												key={mod.id}
												item={{
													id: `${mod.scene_type}/${mod.code}`,
													title: mod.title,
													// 자모는 아직 진행 기록을 읽지 않는다 — 비운 자리로 둔다
													state: "none",
												}}
												onClick={handleModuleClick}
											/>
										))}
									</div>
								</div>
							);
						})}
					</>
				)}
			</div>
		</>
	);
}
