import { chapters } from "@/shared/data/chapter";
import { flashcards } from "@/shared/data/flashcard";
import {
	hasBlankData,
	hasListenData,
	hasReadData,
	hasRoleplayData,
	hasWordData,
} from "@/shared/data/learn-data-check";
import { modules } from "@/shared/data/module";
import { units } from "@/shared/data/unit";

/**
 * 한 과 안에서 활동이 놓이는 순서와 그 활동으로 가는 길.
 *
 * 결과 화면의 [다음 활동] 이 "같은 과의 다음 활동으로" 가려면 이 순서가
 * 필요한데(shell_spec §3.3), 지금까지는 교재학습 목록(`textbook/index.tsx`)이
 * 자기 JSX 안에 순서를 박아 두고 있어서 다른 데서 쓸 수가 없었다.
 * 목록도 이 배열을 쓰게 해 두 곳이 갈라지지 않게 한다.
 *
 * 있는지 없는지는 전부 로컬 데이터로 판단한다 — 서버가 없어도 답이 나온다.
 * (완료 여부는 서버가 쥐고 있고 여기서는 묻지 않는다. 다음 활동은
 *  "다 했는지" 가 아니라 "열 수 있는지" 로 고른다.)
 */
export type LessonActivityId =
	| "word"
	| "roleplay"
	| "listen-answer"
	| "fill-blank"
	| "read-answer"
	| "mission-chat"
	| "flashcard";

/** 교재학습 목록이 그리는 차례 그대로 — 기본 학습 다섯 · 심화 둘 */
export const LESSON_ACTIVITY_ORDER: LessonActivityId[] = [
	"word",
	"roleplay",
	"listen-answer",
	"fill-blank",
	"read-answer",
	"mission-chat",
	"flashcard",
];

/** menu_type → 신규 라우트 (명세 §4). 콘텐츠 ID 는 URL 에 싣지 않는다 */
export const LEARN_ROUTE: Record<LessonActivityId, string> = {
	word: "/learn/word",
	roleplay: "/learn/roleplay",
	"listen-answer": "/learn/listen",
	"fill-blank": "/learn/grammar",
	"read-answer": "/learn/read",
	"mission-chat": "/learn/mission-chat",
	flashcard: "/learn/flashcard",
};

function hasMissionChat(bookId: number, chapterSeq: number): boolean {
	const chapter = chapters.find(
		(c) => c.book_id === bookId && c.seq === chapterSeq,
	);
	if (!chapter) return false;
	const unitIds = units
		.filter((u) => u.chapter_id === chapter.id)
		.map((u) => u.id);
	return modules.some(
		(m) => unitIds.includes(m.unit_id) && m.scene_type === "mission_chat",
	);
}

function hasFlashcard(bookId: number, chapterSeq: number): boolean {
	return flashcards.some(
		(fc) => fc.book_id === bookId && fc.chapter === chapterSeq,
	);
}

/** 이 과에서 그 활동을 열 수 있나 */
export function hasActivityData(
	id: LessonActivityId,
	bookId: number,
	chapterSeq: number,
): boolean {
	switch (id) {
		case "word":
			return hasWordData(bookId, chapterSeq);
		case "roleplay":
			return hasRoleplayData(bookId, chapterSeq);
		case "listen-answer":
			return hasListenData(bookId, chapterSeq);
		case "fill-blank":
			return hasBlankData(bookId, chapterSeq);
		case "read-answer":
			return hasReadData(bookId, chapterSeq);
		case "mission-chat":
			return hasMissionChat(bookId, chapterSeq);
		case "flashcard":
			return hasFlashcard(bookId, chapterSeq);
	}
}

/**
 * 같은 과의 다음 활동. 열 수 있는 것이 없으면 null 이다 —
 * 그 과의 마지막 활동을 끝냈다는 뜻이라 부르는 쪽이 과 목록으로 보낸다.
 */
export function nextLessonActivity(
	current: LessonActivityId,
	bookId: number,
	chapterSeq: number,
): { id: LessonActivityId; route: string } | null {
	const from = LESSON_ACTIVITY_ORDER.indexOf(current);
	if (from < 0) return null;
	for (const id of LESSON_ACTIVITY_ORDER.slice(from + 1)) {
		if (hasActivityData(id, bookId, chapterSeq)) {
			return { id, route: LEARN_ROUTE[id] };
		}
	}
	return null;
}
