import TabBar from "@/components/main/nav/tab-bar";
import SemesterEndedModal from "@/components/main/semester-ended-modal";
import { useAuth } from "@/components/sign/sign-provider";
import { Navigate, Outlet, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";

export const Route = createFileRoute("/main")({
	component: MainLayout,
});

function MainLayout() {
	const { isSignedIn, isLoading, user } = useAuth();

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
			{/*
			 * 학기 종료 알림 — **홈이 아니라 셸에 둔다.** 마지막에 보던 탭으로
			 * 돌아오는 학생은 홈을 안 지나가므로, 홈에 두면 그 학생은 못 본다.
			 * 프레임 밖에 두는 것은 `nav-frame` 아래 CSS 가 탭 바 자리를
			 * 잡아 두었기 때문이다 — 모달은 화면 전체를 덮어야 한다.
			 *
			 * 뜰 조건은 모달이 스스로 판정한다(권한 스토어를 직접 읽는다).
			 * 조건이 아니면 아무것도 그리지 않으므로 여기 갈래를 두지 않는다.
			 */}
			<SemesterEndedModal userId={user?.id} />
		</motion.div>
	);
}
