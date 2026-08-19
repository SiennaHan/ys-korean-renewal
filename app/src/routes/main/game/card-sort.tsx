import CardSort from "@/components/main/game/card-sort";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/main/game/card-sort")({
	component: CardSort,
});
