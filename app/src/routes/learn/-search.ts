/**
 * /learn/* 공통 검색 파라미터 — Phase 1 §4
 *
 * URL 에서 콘텐츠 ID($code · $id)를 걷어내고 급·과만 받는다.
 * 화면 라벨은 "급/과"이므로 쿼리 키도 level/lesson 으로 맞춘다.
 *
 * 구 키(book · chapter · chapterSeq)는 Phase 1 동안 그대로 수용한다 —
 * 북마크와 QR 링크가 살아 있기 때문이다. Phase 3 에서 제거한다.
 */
export interface LearnSearch {
	level?: number;
	lesson?: number;
}

const num = (v: unknown): number | undefined => Number(v) || undefined;

export function parseLearnSearch(search: Record<string, unknown>): LearnSearch {
	return {
		level: num(search.level) ?? num(search.book),
		// 구 링크는 과를 chapterSeq 로 실어 보냈고, chapter 를 쓴 것도 있다
		lesson: num(search.lesson) ?? num(search.chapterSeq) ?? num(search.chapter),
	};
}
