import HomeContent from "@/components/main/home";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/main/")({
	component: HomeContent,
});
