import Jamo from "@/components/main/course-list/jamo";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/main/textbook/jamo")({
	component: Jamo,
});
