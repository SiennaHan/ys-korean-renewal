import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * 구 라우트 — 리다이렉트만 유지한다. 북마크·QR 링크가 살아 있어
 * 바로 지우면 끊긴다. /learn/* 의 다른 구 라우트와 같은 방식이다.
 */
export const Route = createFileRoute("/book/chapter/unit/write3/$code")({
	beforeLoad: ({ params }) => {
		throw redirect({
			to: "/learn/jamo/combine3",
			search: () => ({ code: params.code }),
			replace: true,
		});
	},
});
