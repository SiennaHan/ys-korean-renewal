import { flashcards } from "@/shared/data/flashcard";
import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * 구 라우트 — 리다이렉트만 유지한다. 북마크·QR 링크가 살아 있어
 * 바로 지우면 끊긴다.
 *
 * 결과는 이제 라우트가 아니라 /learn/flashcard 의 한 단계다(명세 §4 —
 * "결과는 셸 공통이라 별도 라우트 폐지"). 그래서 결과 자체로는 보낼 수 없고
 * 그 활동으로 보낸다. 다 푼 상태면 화면이 스스로 결과를 띄운다.
 */
export const Route = createFileRoute("/book/chapter/unit/flashcard/result/$id")({
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
