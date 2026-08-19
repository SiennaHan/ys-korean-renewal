import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/main/textbook")({
	component: TextbookLayout,
});

function TextbookLayout() {
	return <Outlet />;
}
