import { chapters } from "@/shared/data/chapter";
import { modules } from "@/shared/data/module";
import { units } from "@/shared/data/unit";
import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * 구 라우트 — 리다이렉트만 유지한다. 북마크·QR 링크가 살아 있어
 * 바로 지우면 끊긴다. /learn/* 의 다른 구 라우트와 같은 방식이다.
 *
 * 신 경로는 급·과만 받으므로 모듈 코드를 거꾸로 풀어 준다.
 * 못 찾으면 교재학습 목록으로 보낸다 — 죽은 링크로 빈 화면을 보여 주지 않는다.
 */
export const Route = createFileRoute("/book/chapter/unit/mission_chat/$code")({
	beforeLoad: ({ params }) => {
		const mod = modules.find((m) => m.code === params.code);
		const unit = units.find((u) => u.id === mod?.unit_id);
		const chapter = chapters.find((c) => c.id === unit?.chapter_id);
		if (!chapter) {
			throw redirect({ to: "/main/textbook", replace: true });
		}
		throw redirect({
			to: "/learn/mission-chat",
			search: () => ({ level: chapter.book_id, lesson: chapter.seq }),
			replace: true,
		});
	},
});
