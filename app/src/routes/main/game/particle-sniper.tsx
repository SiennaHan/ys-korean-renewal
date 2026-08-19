import ParticleSniper from "@/components/main/game/particle-sniper";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/main/game/particle-sniper")({
	component: ParticleSniper,
});
