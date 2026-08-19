import SpringPicnicGame from "@/components/main/game/spring-picnic";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/main/game/spring-picnic")({
	component: SpringPicnicGame,
});
