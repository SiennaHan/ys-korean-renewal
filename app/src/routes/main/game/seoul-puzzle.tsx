import SeoulPuzzle from "@/components/main/game/seoul-puzzle";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/main/game/seoul-puzzle")({
	component: SeoulPuzzle,
});
