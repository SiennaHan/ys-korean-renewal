import { useMemo, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { books } from "@/shared/data/book";
import { chapters } from "@/shared/data/chapter";
import { units } from "@/shared/data/unit";
import { modules } from "@/shared/data/module";
import { useJamoChapterIdStore, useTextbookSelectionStore } from "@/shared/store/menu-store";
import BookTabs from "@/components/main/textbook/book-tabs";
import ChapterChips from "@/components/main/textbook/chapter-chips";

export default function Jamo() {
	const navigate = useNavigate();

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

	// Book title
	const book = books.find((b) => b.id === effectiveBookId);
	const bookTitle = book ? `3주 완성 연세 한국어 ${book.title}` : "";

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

	const handleModuleClick = useCallback(
		(sceneType: string, code: string) => {
			navigate({
				to: `/book/chapter/unit/${sceneType}/${code}`,
			});
		},
		[navigate],
	);

	return (
		<div className="flex flex-col h-full w-full bg-[#F9FAFC]">
			{/* Header */}
			<div className="flex items-center justify-center px-[16px] py-[16px]">
				<p className="text-[17px] font-semibold text-[#383A3F]">
					한글 자모 익히기
				</p>
			</div>

			{/* Book tabs */}
			<BookTabs
				tabs={bookTabs}
				activeId={"jamo"}
				onSelect={handleBookSelect}
			/>

			{/* Book title */}
			<div className="px-[16px] pt-[16px] pb-[12px]">
				<p className="text-[14px] font-bold text-[#359AFF]">{bookTitle}</p>
			</div>

			{/* Chapter chips */}
			{chapterChips.length > 0 && effectiveChapterSeq !== 0 && (
				<ChapterChips
					chips={chapterChips}
					activeId={effectiveChapterSeq}
					onSelect={handleChapterSelect}
				/>
			)}

			{/* Content */}
			<div className="scrollbar-hide flex-1 overflow-y-auto pt-[20px] pb-[80px] px-[16px]">
				{!selectedChapter && (
					<div className="h-[300px] flex justify-center text-[14px] text-[#888]">
						데이터가 없습니다
					</div>
				)}

				{selectedChapter && (
					<div className="grid gap-[12px]">
						{/* Chapter header */}
						<div className="flex items-center px-[6px] bg-[#f7f7f7] rounded-[10px]">
							<div className="text-[14px] text-[#7F848D]">
								제{selectedChapter.seq}과 {selectedChapter.title}
							</div>
						</div>

						{/* Units */}
						{chapterUnits.map((unit) => {
							const moduleList = modules.filter(
								(m) => m.unit_id === unit.id,
							);
							const titleText = unit.title.split(":");
							const sylList =
								titleText.length > 1
									? titleText[1].split(",")
									: [];

							return (
								<div
									key={unit.id}
									className="bg-white rounded-[10px] py-[12px] min-w-0"
								>
									<div className="px-[12px]">
										<div className="text-[14px] text-[#0180FF] font-bold">
											{titleText[0]}
										</div>
										{sylList.length > 0 && (
											<div className="flex gap-1 mt-[10px] overflow-x-auto scrollbar-hide flex-nowrap w-full">
												{sylList.map((syl) => (
													<div
														key={syl}
														className="size-[28px] flex-shrink-0 flex items-center justify-center rounded-[6px] text-[14px] text-[#24425F] font-bold bg-[#DBEDFF]"
													>
														{syl}
													</div>
												))}
											</div>
										)}
									</div>
									<div className="h-[12px] border-b border-[#F6F7F8] mb-[12px]" />
									<div className="grid gap-[10px] px-[12px]">
										{moduleList.map((mod) => (
											<div
												key={mod.id}
												onClick={() =>
													handleModuleClick(
														mod.scene_type,
														mod.code,
													)
												}
												className="bg-[#F9FAFC] rounded-[5px] h-[46px] pl-[10px] pr-[16px] flex items-center justify-between cursor-pointer hover:opacity-80 active:opacity-90"
											>
												<div className="text-[14px] text-[#24425F] font-semibold pl-[10px]">
													{mod.title}
												</div>
												<div className="text-[12px] text-[#ADB3BE] font-semibold bg-[#E5E8EC] rounded-[4px] px-[6px] py-[2px]">
													미완료
												</div>
											</div>
										))}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
