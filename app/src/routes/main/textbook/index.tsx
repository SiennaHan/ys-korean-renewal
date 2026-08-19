import TextbookContent from "@/components/main/textbook";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/main/textbook/")({
	component: TextbookContent,
});
