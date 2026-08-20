import TabBar from "@/components/main/nav/tab-bar";
import { useAuth } from "@/components/sign/sign-provider";
import { Navigate, Outlet, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";

export const Route = createFileRoute("/main")({
	component: MainLayout,
});

function MainLayout() {
	const { isLoggedInUser, isLoading } = useAuth();

	// 로딩 중에는 빈 화면
	if (isLoading) {
		return <div className="h-full bg-white" />;
	}

	/*
	 * 로그인은 무조건이다 — 게스트로 쓰는 길은 없다.
	 * isSignedIn 으로 막으면 안 된다. 그건 "토큰이 있다" 는 뜻일 뿐이어서
	 * 계정 없는 세션까지 들여보내고, 홈이 "Guest 님" 으로 맞이하다가
	 * MY 에서 로그인 화면으로 튕겨 나가는 반쪽 상태가 된다.
	 */
	if (!isLoggedInUser) {
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
