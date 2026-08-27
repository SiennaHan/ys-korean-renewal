import CardSort from "@/components/main/game/card-sort";
import GameGate from "@/components/main/game/game-gate";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/main/game/card-sort")({
	component: Gated,
});

/* 유료 게임이다. 주소를 직접 쳐도 잠금을 지나게 한다 — GameGate 의 주석 참고 */
function Gated() {
	return (
		<GameGate gameKey="card-sort">
			<CardSort />
		</GameGate>
	);
}
