import { createFileRoute, redirect } from "@tanstack/react-router";
import { type LearnSearch, parseLearnSearch } from "./-search";

/**
 * 구 라우트 — Phase 1 은 리다이렉트만 유지하고 Phase 3 에서 제거한다.
 * 북마크·QR 링크가 살아 있어 바로 지우면 끊긴다.
 */
export const Route = createFileRoute("/learn/fill-blank")({
	validateSearch: (search: Record<string, unknown>): LearnSearch =>
		parseLearnSearch(search),
	beforeLoad: ({ search }) => {
		// 함수 형태여야 구 키(book · chapterSeq)가 URL 에 남지 않고 통째로 갈린다
		throw redirect({
			to: "/learn/grammar",
			search: () => ({ level: search.level, lesson: search.lesson }),
			replace: true,
		});
	},
});
