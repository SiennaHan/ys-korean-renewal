import { isGameOpen } from "@/api/entitlement";
import { getGameProgress } from "@/api/game-progress";
import { GAMES, GameListView } from "@/components/main/game/list-view";
import { useScreenFocus } from "@/components/main/game/use-screen-focus";
import PaywallPanel from "@/components/main/textbook/paywall-panel";
import { useEntitlement } from "@/shared/store/entitlement-store";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/main/game/")({
	component: GamePage,
});

/** 게임 목록 — 받아 오고 배선한다. 그리는 일은 list-view.tsx 가 한다 */
function GamePage() {
	const navigate = useNavigate();
	const { t } = useTranslation();
	const [progress, setProgress] = useState<Record<string, string | null>>({});
	/*
	 * 게임에서 나오면 이 목록으로 돌아오는데, 그때 초점이 `<body>` 로 떨어진다.
	 * 화면이 하나뿐이라 키는 고정이고, 마운트될 때 한 번 옮기는 것이 하는 일이다.
	 */
	const frameRef = useScreenFocus("list");

	/* 열린 범위 — 서버가 정한다(access_and_pricing_v1 §04) */
	const { entitlement, ready } = useEntitlement();
	/** 잠긴 게임을 눌렀을 때 띄우는 안내. null 이면 목록을 그린다 */
	const [lockedShown, setLockedShown] = useState<string | null>(null);

	/*
	 * 답이 오기 전에는 비운다 — 무료 게임까지 잠긴 것처럼 번쩍이지 않게.
	 * 목업 대조도 서버 없이 그리므로 여기서 비워 두면 지금 그림이 그대로다.
	 */
	const lockedGames = useMemo(() => {
		if (!ready) return new Set<string>();
		return new Set(
			GAMES.filter((g) => !isGameOpen(entitlement, g.key)).map((g) => g.key),
		);
	}, [ready, entitlement]);

	// 다섯 게임 다 점수를 저장하므로 목록 둘째 줄을 진행으로 채울 수 있다
	useEffect(() => {
		let alive = true;
		void (async () => {
			const entries = await Promise.all(
				GAMES.map(async (g) => {
					const rows = await getGameProgress(g.key);
					return [g.key, rows.length ? g.progress(rows, t) : null] as const;
				}),
			);
			if (alive) setProgress(Object.fromEntries(entries));
		})();
		return () => {
			alive = false;
		};
		/* t 는 언어를 바꾸면 바뀐다 — 그때 둘째 줄도 다시 만들어야 한다 */
	}, [t]);

	if (lockedShown) {
		/* 전체 화면으로 쓰므로 감싸는 틀이 필요하다 — game-gate.tsx 의 주석 참고 */
		return (
			<div className="paywall-page">
				<PaywallPanel
					entitlement={entitlement}
					onBack={() => setLockedShown(null)}
					onSignIn={() => navigate({ to: "/login" })}
				/>
			</div>
		);
	}

	return (
		<GameListView
			frameRef={frameRef}
			progress={progress}
			onOpen={(to) => navigate({ to })}
			lockedGames={lockedGames}
			onLocked={setLockedShown}
		/>
	);
}
