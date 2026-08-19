import type { ReactNode } from "react";
import Sidebar from "./sidebar";

interface AdminLayoutProps {
	children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
	return (
		<div className="flex h-screen bg-white">
			<Sidebar />
			<main className="flex-1 overflow-auto p-10">{children}</main>
		</div>
	);
}
