import { flashcards } from "@/shared/data/flashcard";
import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * 구 라우트 — 리다이렉트만 유지한다. 북마크·QR 링크가 살아 있어
 * 바로 지우면 끊긴다. /learn/* 의 다른 구 라우트와 같은 방식이다.
 *
 * 신 경로는 급·과만 받으므로 세트 ID 를 거꾸로 풀어 준다.
 * 못 찾으면 교재학습 목록으로 보낸다 — 죽은 링크로 빈 화면을 보여 주지 않는다.
 */
export const Route = createFileRoute("/book/chapter/unit/flashcard/$id")({
	beforeLoad: ({ params }) => {
		const set = flashcards.find((f) => String(f.id) === params.id);
		if (!set) {
			throw redirect({ to: "/main/textbook", replace: true });
		}
		throw redirect({
			to: "/learn/flashcard",
			search: () => ({ level: set.book_id, lesson: set.chapter }),
			replace: true,
		});
	},
});
