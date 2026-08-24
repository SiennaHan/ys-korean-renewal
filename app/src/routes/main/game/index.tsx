import { getGameProgress } from "@/api/game-progress";
import { GAMES, GameListView } from "@/components/main/game/list-view";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/main/game/")({
	component: GamePage,
});

/** 게임 목록 — 받아 오고 배선한다. 그리는 일은 list-view.tsx 가 한다 */
function GamePage() {
	const navigate = useNavigate();
	const [progress, setProgress] = useState<Record<string, string | null>>({});

	// 다섯 게임 다 점수를 저장하므로 목록 둘째 줄을 진행으로 채울 수 있다
	useEffect(() => {
		let alive = true;
		void (async () => {
			const entries = await Promise.all(
				GAMES.map(async (g) => {
					const rows = await getGameProgress(g.key);
					return [g.key, rows.length ? g.progress(rows) : null] as const;
				}),
			);
			if (alive) setProgress(Object.fromEntries(entries));
		})();
		return () => {
			alive = false;
		};
	}, []);

	return <GameListView progress={progress} onOpen={(to) => navigate({ to })} />;
}
