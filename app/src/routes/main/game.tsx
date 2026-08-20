import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/main/game")({
	component: GameLayout,
});

function GameLayout() {
	// 게임 화면은 스스로 높이를 다 쓴다. .scroll 은 목록처럼 넘칠 때를 위한 것이다
	return (
		<div className="scroll">
			<Outlet />
		</div>
	);
}
