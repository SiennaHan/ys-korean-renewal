import Content5 from "@/components/main/content5";
import { useAuth } from "@/components/sign/sign-provider";
import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/main/my")({
	component: Wrapped,
});

function Wrapped() {
	const { isLoggedInUser, isLoading } = useAuth();

	if (isLoading) return <div className="scroll" />;

	/*
	 * 게스트는 들어올 수 없다. 이 화면이 다룰 것 — 계정 · 학습 기록 — 이
	 * 계정에 달려 있는데 게스트에게는 그 계정이 없다.
	 * 언어는 로그인 화면에서도 바꿀 수 있으므로 갇히지 않는다.
	 */
	if (!isLoggedInUser) return <Navigate to="/login" />;

	return (
		<div className="scroll">
			<Content5 />
		</div>
	);
}
