import { dialogs } from "@/shared/data/dialog";
import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * 구 라우트 — 리다이렉트만 유지한다. 북마크·QR 링크가 살아 있어
 * 바로 지우면 끊긴다.
 *
 * 대화 단계는 이제 라우트가 아니라 /learn/mission-chat 의 한 단계다
 * (명세 §4 — "내부 단계는 컴포넌트 상태로"). 그래서 그 단계로는 바로 보낼 수
 * 없고 활동 입구로 보낸다.
 */
export const Route = createFileRoute("/book/chapter/unit/dialog/$id")({
	beforeLoad: ({ params }) => {
		const dialog = dialogs.find((d) => d.id === params.id);
		if (!dialog) {
			throw redirect({ to: "/main/textbook", replace: true });
		}
		throw redirect({
			to: "/learn/mission-chat",
			search: () => ({ level: dialog.book_id, lesson: dialog.chapter }),
			replace: true,
		});
	},
});
