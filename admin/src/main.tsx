import "@/styles/globals.css";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const el = document.getElementById("app");
if (el) {
	const root = ReactDOM.createRoot(el);
	root.render(<RouterProvider router={router} />);
}
