import PaywallPanel from "@/components/main/textbook/paywall-panel";
import { useAuth } from "@/components/sign/sign-provider";
import { useEntitlement } from "@/shared/store/entitlement-store";
import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/main/my-subscription")({
	component: Wrapped,
});

/**
 * MY 에서 구독 안내로 가는 자리 — 시안 v1 승인(기획 2026-09-04).
 *
 * **왜 이 화면이 생겼나.** 지금까지 페이월로 가는 길이 **넷 다 「잠긴 것을 눌렀을 때」**
 * 였다(교재 과 칩 · 자모 칩 · 게임 카드 · 게임 라우트 가드). 돈을 내려고 마음먹은
 * 사용자가 능동적으로 갈 자리가 앱에 하나도 없었다.
 *
 * **화면을 새로 그리지 않았다** — 이미 승인된 `PaywallPanel`(`paywall_SOT` v1.1)을
 * 그 자리에 세운 것뿐이다. `PaywallKind` 를 늘리지 않으므로 목업 대조도 무영향이다.
 *
 * **★ 이 라우트를 `/main/` 밖으로 옮기면 안 된다.** 페이월 CSS 가 전부
 * `.nav-frame` 아래로 스코프돼 있어서(`styles/nav.css`) `/my-profile` 처럼 최상위에
 * 두면 **검사는 다 통과하는데 스타일이 하나도 안 입는다** — `check:css` 는 클래스
 * 이름만 보고 모양은 보지 않는다.
 */
function Wrapped() {
	const { isLoggedInUser, isLoading } = useAuth();
	const { entitlement } = useEntitlement();
	const navigate = useNavigate();

	if (isLoading) return <div className="scroll" />;

	// 게스트는 들어올 수 없다 — `/main/my` 와 같은 규칙이다
	if (!isLoggedInUser) return <Navigate to="/login" />;

	/*
	 * **답이 오기 전에는 아무것도 그리지 않는다.** `paywallKind(null, true)` 는
	 * `"member"` — 즉 결제 CTA 다. 기관 학생인지 아닌지 **모르는 동안** 결제를
	 * 권하면 §06 을 어긴다. 기존 진입점 넷은 `ready` 를 먼저 통과해야 패널에
	 * 닿아서 우연히 안전했는데, 이 다섯째 진입점은 그 불변식을 직접 지켜야 한다.
	 */
	if (!entitlement) return <div className="scroll" />;

	/*
	 * **주소를 직접 쳐도 막는다** — §06. 카드에서 화살표를 없애는 것만으로는
	 * 지켜지지 않는다. 학기가 끝난 기관 학생도 여기 오지 않는다(결제로 풀 일이
	 * 아니라 학교의 일이다).
	 */
	if (entitlement.source === "school")
		return <Navigate to="/main/my" replace />;

	return (
		<div className="scroll">
			<div className="paywall-page">
				<PaywallPanel
					entitlement={entitlement}
					/*
					 * 교재학습으로 보낸다(기획 확정 D-4). 이 갈래의 버튼 글자가
					 * 「무료 수업 계속 보기」라 MY 로 되돌리면 **글자가 거짓이 된다.**
					 * MY 로 돌아가는 길은 탭바가 이미 갖고 있다.
					 */
					onBack={() => navigate({ to: "/main/textbook" })}
					onSignIn={() => navigate({ to: "/login" })}
				/>
			</div>
		</div>
	);
}
