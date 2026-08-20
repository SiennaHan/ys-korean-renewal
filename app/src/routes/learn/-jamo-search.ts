/**
 * /learn/jamo/* 검색 파라미터
 *
 * 자모 활동은 급·과가 아니라 낱개 묶음(모듈)에 달려 있다 — 1과 안에서도
 * "모음1"과 "자음1"이 각각 자기 활동을 갖는다. 그래서 다른 /learn/* 과 달리
 * level·lesson 으로는 짚을 수 없고 모듈 코드를 그대로 받는다.
 *
 * 구 경로(/book/chapter/unit/{scene}/{code})가 코드를 경로에 실었던 것을
 * 쿼리로 옮긴 것이다. Phase 2 에서 콘텐츠 ID 체계가 정리되면 다시 본다.
 */
export interface JamoSearch {
	code: string;
}

export function parseJamoSearch(search: Record<string, unknown>): JamoSearch {
	return { code: String(search.code ?? "") };
}
