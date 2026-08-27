import { isGameOpen } from "@/api/entitlement";
import PaywallPanel from "@/components/main/textbook/paywall-panel";
import { useEntitlement } from "@/shared/store/entitlement-store";
import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * 유료 게임의 문 — access_and_pricing_v1 §08 의 3번.
 *
 * 게임 목록은 잠긴 카드를 눌러도 안내를 띄우지만, **주소를 직접 치면 그 목록을
 * 거치지 않는다.** 서버는 402 로 막지만(`accepter/entitlement_guard.py`)
 * 콘텐츠를 받는 함수들이 오류를 삼켜 `{}` 를 내므로, 그대로 두면 화면이
 * **빈 게임**으로 조용히 열린다. 여기서 문을 세운다.
 *
 * **답이 오기 전에는 아무것도 그리지 않는다.** 처음에는 통과시켰는데(교재 쪽
 * 자물쇠와 같은 규약으로) 그러면 **잠긴 게임의 놀이판이 먼저 그려지고** 몇 초 뒤
 * 결제 안내로 바뀐다 — 큰 그림이 스쳐 지나가고, 하단바가 뒤늦게 나타나며 화면이
 * 밀린다(2026-08-27 에 layout-shift 로 375x60 이 4.1초에 들어오는 것을 재서 찾았다).
 *
 * 교재 쪽과 규약이 다른 이유는 **무엇이 먼저 그려지는가**가 다르기 때문이다.
 * 교재는 자물쇠만 늦게 붙으면 되지만, 여기서는 놀이판 전체가 잘못 그려진다.
 * 대신 게임을 열 때 잠깐 빈 화면이 지나간다 — SPA 안에서는 열린 범위가 이미
 * 손에 있어 거의 없고, 전체 새로고침일 때만 보인다.
 */
export default function GameGate({
	gameKey,
	children,
}: {
	/** `list-view.tsx` 의 `GAMES.key` 와 같은 값 */
	gameKey: string;
	children: ReactNode;
}) {
	const { entitlement, ready } = useEntitlement();
	const navigate = useNavigate();

	/* 아직 모른다 — 놀이판도 안내도 그리지 않는다 */
	if (!ready) return null;

	if (!isGameOpen(entitlement, gameKey)) {
		/*
		 * **감싸는 틀이 필요하다.** `.paywall` 은 교재학습 화면 안에 들어가도록
		 * 위 여백만 있어서, 전체 화면으로 쓰면 맨 위에 붙고 아래가 텅 빈다.
		 * `.paywall-page` 가 가운데로 세운다. **껍데기를 덧대지 않는다** —
		 * 라우트 레이아웃이 이미 `.nav-frame h-full` 과 `.scroll`(전체 높이)을 주므로,
		 * 그 사이에 높이 없는 div 를 하나 끼우면 `min-height:100%` 가 죽는다
		 * (2026-08-27 에 그래서 여전히 맨 위에 붙어 있었다 — 부모 높이를 재서 찾았다).
		 */
		return (
			<div className="paywall-page">
				<PaywallPanel
					entitlement={entitlement}
					onBack={() => navigate({ to: "/main/game" })}
					onSignIn={() => navigate({ to: "/login" })}
				/>
			</div>
		);
	}
	return <>{children}</>;
}
