import { addressOfModule } from "@/shared/data/jamo";
import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * 구 라우트 — 리다이렉트만 유지한다. 북마크·QR 링크가 살아 있어
 * 바로 지우면 끊긴다. /learn/* 의 다른 구 라우트와 같은 방식이다.
 *
 * 2026-08-24: 자모 라우트 여섯이 /learn/jamo 하나로 합쳐졌다(dev_spec §4).
 * 모듈 코드를 주소(과·묶음·활동)로 풀어 보낸다 — URL 에 콘텐츠 ID 를 남기지
 * 않는다. 코드를 못 풀면 code 를 그대로 실어 보내고 파서가 받는다.
 */
export const Route = createFileRoute("/book/chapter/unit/listen-repeat/$code")({
	beforeLoad: ({ params }) => {
		const addr = addressOfModule(params.code);
		throw redirect({
			to: "/learn/jamo",
			search: () => addr ?? { code: params.code },
			replace: true,
		});
	},
});
