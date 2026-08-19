import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/main/game")({
	component: GameLayout,
});

function GameLayout() {
	return <Outlet />;
}
