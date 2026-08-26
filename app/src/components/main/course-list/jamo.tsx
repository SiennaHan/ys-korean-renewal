import { isJamoChapterOpen } from "@/api/entitlement";
import BookTabs from "@/components/main/textbook/book-tabs";
import ChapterChips from "@/components/main/textbook/chapter-chips";
import { buildBookTabs } from "@/components/main/textbook/labels";
import { ActRow, ChapterHead } from "@/components/main/textbook/module-list";
import PaywallPanel from "@/components/main/textbook/paywall-panel";
import { books } from "@/shared/data/book";
import { chapters } from "@/shared/data/chapter";
import { addressOfModule } from "@/shared/data/jamo";
import { modules } from "@/shared/data/module";
import { units } from "@/shared/data/unit";
import { useEntitlement } from "@/shared/store/entitlement-store";
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

	// 급 탭 — 교재학습과 같은 것을 쓴다 (labels.ts).
	// 여기가 각자 만들고 있어서 "1권" 이 남아 있었다.
	const bookTabs = useMemo(() => buildBookTabs(t), [t]);

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
			label: t("catalog.chapterChip", { seq: ch.seq }),
		}));
	}, [filteredChapters, t]);

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

	/*
	 * 열린 범위 — 서버가 정한다(access_and_pricing_v1 §04). 자모는 1급 1~3과이고
	 * 무료는 1과뿐이다. **이 화면의 칩 id 는 chapter.id 가 아니라 seq 다** —
	 * 교재학습 쪽과 다르므로 잠긴 집합도 seq 로 만든다
	 */
	const { entitlement, ready } = useEntitlement();

	const lockedChipSeqs = useMemo(() => {
		if (!ready) return new Set<number>();
		return new Set(
			filteredChapters
				.filter((ch) => !isJamoChapterOpen(entitlement, ch.seq))
				.map((ch) => ch.seq),
		);
	}, [ready, entitlement, filteredChapters]);

	const selectedLocked =
		selectedChapter != null && lockedChipSeqs.has(selectedChapter.seq);

	/** 무료 자모 과로 돌려보낸다 */
	const goToFreeJamo = useCallback(() => {
		const free = filteredChapters.find((ch) => !lockedChipSeqs.has(ch.seq));
		if (free) setActiveChapterSeq(free.seq);
	}, [filteredChapters, lockedChipSeqs, setActiveChapterSeq]);

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

	/*
	 * 자모는 라우트가 하나다 — /learn/jamo?level&lesson&group&sub (dev_spec §4).
	 * 전에는 활동마다 경로가 따로였고 URL 에 모듈 코드를 실었다.
	 * 코드를 주소(과·묶음·활동)로 풀어 보낸다 — 못 풀면 코드를 그대로 실어
	 * 보내고 파서가 받는다(routes/learn/-jamo-search.ts).
	 */
	const handleModuleClick = useCallback(
		(id: string) => {
			const code = id.split("/")[1];
			const addr = addressOfModule(code);
			navigate({ to: "/learn/jamo", search: addr ?? { code } });
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
						lockedIds={lockedChipSeqs}
					/>
				)}
			</div>

			<div className="scroll catalog-scroll">
				{!selectedChapter && (
					<div className="catalog-empty">{t("catalog.noModules")}</div>
				)}

				{selectedChapter && selectedLocked && (
					<PaywallPanel
						entitlement={entitlement}
						onBack={goToFreeJamo}
						onSignIn={() => navigate({ to: "/login" })}
					/>
				)}

				{selectedChapter && !selectedLocked && (
					<>
						<ChapterHead
							seq={selectedChapter.seq}
							title={selectedChapter.title}
						/>
						{chapterUnits.map((unit) => {
							const moduleList = modules.filter((m) => m.unit_id === unit.id);
							// unit.title 은 "모음 1:ㅏ,ㅓ,ㅗ" 처럼 묶음 이름과 음절이 콜론으로 붙어 있다
							// "모음1: ㅏ,ㅓ,…" 를 쪼개면 첫 낱자에 공백이 붙는다
							const [rawName, syllables] = unit.title.split(":");
							const groupName = rawName.trim();
							const syls = syllables
								? syllables.split(",").map((x) => x.trim())
								: [];

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
