import { books } from "@/shared/data/book";
import { chapters } from "@/shared/data/chapter";
import type { BookTab } from "./book-tabs";
import type { ChapterChip } from "./chapter-chips";

/**
 * 교재학습·자모 목록이 같이 쓰는 라벨.
 *
 * 두 화면이 각자 만들고 있었고 그래서 어긋났다 — 교재학습은 급으로 고쳤는데
 * 자모 쪽은 book.title 을 그대로 써서 "1권" 이 남아 있었다. 한 곳으로 모아
 * 다시 갈라지지 않게 한다. 목업 대조(scripts/activity-parity.tsx)도 이 함수를
 * 불러 쓰므로, 여기서 어긋나면 대조가 잡는다.
 */
type T = (key: string, opts?: Record<string, unknown>) => string;

/**
 * 급 탭 — 한글 + 1급~8급.
 *
 * book.title 은 "1권" 이다. 화면에는 급으로 쓴다 — 목업이 급이고 앱의 다른
 * 곳도 급으로 부른다(i18n 의 "{{level}}급 {{lesson}}과"). book_id 는 DB 값이라
 * 그대로 두고 표시만 바꾼다.
 */
export function buildBookTabs(t: T): BookTab[] {
	const tabs: BookTab[] = [];
	if (chapters.some((ch) => ch.type === "jamo")) {
		tabs.push({ id: "jamo", label: t("catalog.jamoTab") });
	}
	for (const book of books) {
		tabs.push({
			id: book.id,
			label: t("catalog.bookTab", { level: book.seq }),
		});
	}
	return tabs;
}

/** 과 칩 — 넘겨받은 과 목록을 그 순서대로 */
export function buildChapterChips(
	list: { id: number; seq: number }[],
	t: T,
): ChapterChip[] {
	return list.map((ch) => ({
		id: ch.id,
		label: t("catalog.chapterChip", { seq: ch.seq }),
	}));
}

/**
 * 활동 목록의 뼈대. 어느 섹션에 어느 활동이 어떤 순서로 오는지를 여기서 정한다.
 * 상태(완료·진행 중·잠김)는 화면이 붙이고, 이름과 순서는 이쪽이 쥔다.
 */
export const ACT_SECTIONS = [
	{
		labelKey: "catalog.sectionBasic",
		actIds: ["word", "roleplay", "listen-answer", "fill-blank", "read-answer"],
	},
	{
		labelKey: "catalog.sectionAdvanced",
		actIds: ["mission-chat", "flashcard"],
	},
] as const;

/** 활동 한 줄의 이름 */
export function actLabel(t: T, id: string): string {
	return t(`catalog.act.${id}`);
}
