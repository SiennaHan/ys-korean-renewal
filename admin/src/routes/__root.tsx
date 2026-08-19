import { Outlet, createRootRoute, useLocation, useNavigate } from "@tanstack/react-router";
import AdminLayout from "@/components/layout/admin-layout";
import { getAccessToken } from "@/api/api";
import { useEffect } from "react";

export const Route = createRootRoute({
	component: RootComponent,
});

const PUBLIC_PATHS = ["/login", "/signup"];

function RootComponent() {
	const location = useLocation();
	const navigate = useNavigate();
	const isPublicPage = PUBLIC_PATHS.includes(location.pathname);

	// 로그인 후 document.title 설정: 학교 관리자/학생 관리자는 학교 이름, 그 외는 "한국어학당"
	useEffect(() => {
		const currentPath = location.pathname;
		if (!PUBLIC_PATHS.includes(currentPath)) {
			try {
				const user = JSON.parse(
					localStorage.getItem("adminUser") || "{}",
				);
				document.title = user.schoolName || "한국어학당";
			} catch {
				document.title = "한국어학당";
			}
		} else {
			document.title = "한국어학당";
		}
	}, [location.pathname]);

	useEffect(() => {
		const token = getAccessToken();
		if (!token && !isPublicPage) {
			navigate({ to: "/login" });
		}
	}, [isPublicPage, navigate]);

	if (isPublicPage) {
		return <Outlet />;
	}

	return (
		<AdminLayout>
			<Outlet />
		</AdminLayout>
	);
}
