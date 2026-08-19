import MissionChat from "@/components/main/course-list/mission-chat";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/main/game/missionchat")({
	component: MissionChat,
});
