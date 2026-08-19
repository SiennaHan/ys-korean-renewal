import roleplayData from "./n2_ai_role_play.json";
import listenData from "./n3_listen_repeat.json";
/**
 * 기초학습 데이터 존재 여부를 book_id + chapter(seq) 기준으로 확인
 */
import blankQuestions from "./n4_blank_question.json";
import readQuestions from "./n5_read_answer_questions.json";
import readTexts from "./n5_read_answer_text.json";
import { wordList } from "./word-list";
import { wordQuizList } from "./word-quiz";

export function hasWordData(bookId: number, chapterSeq: number): boolean {
	return wordList.some((w) => w.book_id === bookId && w.chapter === chapterSeq);
}

export function hasRoleplayData(bookId: number, chapterSeq: number): boolean {
	return (roleplayData as { book_id: number; chapter: number }[]).some(
		(r) => r.book_id === bookId && r.chapter === chapterSeq,
	);
}

export function hasListenData(bookId: number, chapterSeq: number): boolean {
	return (listenData as { book_id: number; chapter: number }[]).some(
		(l) => l.book_id === bookId && l.chapter === chapterSeq,
	);
}

export function hasBlankData(bookId: number, chapterSeq: number): boolean {
	return (blankQuestions as { book_id: number; chapter: number }[]).some(
		(q) => q.book_id === bookId && q.chapter === chapterSeq,
	);
}

export function hasReadData(bookId: number, chapterSeq: number): boolean {
	return (readTexts as { book_id: number; chapter: number }[]).some(
		(t) => t.book_id === bookId && t.chapter === chapterSeq,
	);
}

/** 각 메뉴별 총 문제 수 반환 */

export function getWordQuizCount(bookId: number, chapterSeq: number): number {
	return wordQuizList.filter(
		(q) => q.book_id === bookId && q.chapter === chapterSeq,
	).length;
}

export function getRoleplayScenarioCount(
	bookId: number,
	chapterSeq: number,
): number {
	const scenarioIds = new Set<string>();
	for (const r of roleplayData as {
		book_id: number;
		chapter: number;
		scenario_id: string;
	}[]) {
		if (r.book_id === bookId && r.chapter === chapterSeq) {
			scenarioIds.add(r.scenario_id);
		}
	}
	return scenarioIds.size;
}

export function getListenQuestionCount(
	bookId: number,
	chapterSeq: number,
): number {
	return (listenData as { book_id: number; chapter: number }[]).filter(
		(l) => l.book_id === bookId && l.chapter === chapterSeq,
	).length;
}

export function getBlankQuestionCount(
	bookId: number,
	chapterSeq: number,
): number {
	return (blankQuestions as { book_id: number; chapter: number }[]).filter(
		(q) => q.book_id === bookId && q.chapter === chapterSeq,
	).length;
}

export function getReadQuestionCount(
	bookId: number,
	chapterSeq: number,
): number {
	const textIds = (
		readTexts as { id: number; book_id: number; chapter: number }[]
	)
		.filter((t) => t.book_id === bookId && t.chapter === chapterSeq)
		.map((t) => t.id);
	return (readQuestions as { text_id: number }[]).filter((q) =>
		textIds.includes(q.text_id),
	).length;
}
