import VocashotSolo from "@/components/main/game/vocashot-solo";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/main/game/vocashot-solo")({
	component: VocashotSolo,
});
