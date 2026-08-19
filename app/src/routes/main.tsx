import BottomTabBar from "@/components/main/home/bottom-tab-bar";
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
			className="h-full bg-white"
		>
			<div className="flex h-full flex-col">
				<div className="scrollbar-hide h-full w-full flex-1 overflow-y-auto">
					<Outlet />
				</div>
				<BottomTabBar />
			</div>
		</motion.div>
	);
}
