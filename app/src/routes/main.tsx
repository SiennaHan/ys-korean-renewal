import TabBar from "@/components/main/nav/tab-bar";
import { useAuth } from "@/components/sign/sign-provider";
import { Navigate, Outlet, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";

export const Route = createFileRoute("/main")({
	component: MainLayout,
});

function MainLayout() {
	const { isSignedIn, isLoading } = useAuth();

	// 로딩 중에는 빈 화면
	if (isLoading) {
		return <div className="h-full bg-white" />;
	}

	// 미인증 시 로그인 페이지로 리다이렉트
	if (!isSignedIn) {
		return <Navigate to="/login" />;
	}

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.5 }}
			className="h-full"
		>
			{/* nav.css 가 전부 이 클래스 아래에 있다. 스크롤은 각 화면의
			    .scroll 이 지고 탭 바는 그 아래 고정으로 앉는다 */}
			<div className="nav-frame h-full">
				<Outlet />
				<TabBar />
			</div>
		</motion.div>
	);
}
