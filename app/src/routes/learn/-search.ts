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
	/**
	 * 다시 풀기로 들어왔나. 홈의 다시 풀기 카드가 이것을 붙여 보낸다.
	 *
	 * 참이면 화면이 `GET /review-queue?scope=activity` 로 자기 몫을 받아 그 문항만
	 * 낸다 — 결과 화면의 [다시 풀기] 와 같은 길이다(shell_spec §3.3). 그래서 복습을
	 * 위한 새 화면이 없다.
	 */
	review?: boolean;
}

const num = (v: unknown): number | undefined => Number(v) || undefined;

export function parseLearnSearch(search: Record<string, unknown>): LearnSearch {
	return {
		level: num(search.level) ?? num(search.book),
		// 구 링크는 과를 chapterSeq 로 실어 보냈고, chapter 를 쓴 것도 있다
		lesson: num(search.lesson) ?? num(search.chapterSeq) ?? num(search.chapter),
		/*
		 * ?review=1 · ?review=true · review={true} 를 다 받는다.
		 *
		 * `=== "1"` 만 봤다가 틀렸다 — 라우터가 `?review=1` 의 값을 **숫자 1** 로
		 * 파싱해서 문자열 비교가 어긋났고 URL 이 review=false 로 되돌아 쓰였다.
		 *
		 * 거짓일 때 `false` 가 아니라 **undefined** 를 낸다 — 라우터가 값 있는 키만
		 * 직렬화하므로 평소 학습 URL 에 review=false 가 붙지 않는다. 기본값이라
		 * 굳이 쓸 것이 없고, 주소를 보는 사람이 복습 세션인 줄 오해할 일도 없다.
		 * 브라우저에서 진행바가 과 전체(10칸)로 나온 것으로 드러났다.
		 */
		review:
			search.review === true ||
			search.review === 1 ||
			search.review === "1" ||
			search.review === "true"
				? true
				: undefined,
	};
}
