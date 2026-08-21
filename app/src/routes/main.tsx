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

	/*
	 * 게스트도 들어온다 — 무료 범위를 보여 주는 것이 유입 장치다
	 * (access_and_pricing_v1 §02). 계정을 요구하는 곳은 MY 하나뿐이고
	 * 그 화면이 스스로 막는다.
	 *
	 * 한때 여기서 isLoggedInUser 로 막았다. 이유는 "홈이 Guest 님 으로
	 * 맞이하다가 MY 에서 튕겨 나가는 반쪽 상태" 였는데, 그건 게스트를
	 * 들여보낸 탓이 아니라 홈이 게스트를 이름 없는 계정처럼 맞이한 탓이었다.
	 * 홈의 인사말을 게스트용으로 따로 두어 그쪽을 고쳤다.
	 */
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
