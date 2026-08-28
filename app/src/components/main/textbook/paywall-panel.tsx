import type { Entitlement } from "@/api/entitlement";
import { useAuth } from "@/components/sign/sign-provider";
import { Check, LockKeyhole, LogIn, RefreshCw, School } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * 결제 안내 — access_and_pricing_v1 §06 · 시각 정본 phase1/paywall_SOT.html
 *
 * **숨기지 않고 보이되 잠근다.** 잠긴 과를 고르면 활동 목록 자리에 이 안내가
 * 들어온다. 선택한 과 제목은 위에 남기고, 본문은 구독 가치와 다음 행동만 말한다.
 *
 * **기관 학생에게는 결제 버튼을 두지 않는다.** 학교가 이미 낸 돈이고 학생이
 * 결정할 일이 아니다(§06). 그래서 갈래를 다섯으로 가른다.
 */
/**
 * `schoolExpired` 가 2026-08-28 에 붙었다. 그 전에는 학기가 끝난 기관 학생도
 * `school` 로 떨어져 **「학교 담당자에게 이용 범위 확대를 문의해 주세요」**를
 * 봤다 — 범위 문제가 아니라 학기가 끝난 것이니 사실과 다른 안내였다.
 */
export type PaywallKind =
	| "guest"
	| "member"
	| "expired"
	| "school"
	| "schoolExpired";

/**
 * 어느 안내를 보일지 정한다.
 *
 * 판정을 앱이 하지 않는다는 규칙과 어긋나지 않는다 — **열린 범위**는 서버가
 * 정하고, 여기서 고르는 것은 그 결과를 어떤 말로 전할지다.
 */
export function paywallKind(
	ent: Entitlement | null,
	/**
	 * **계정이 있는 사람인가** — `useAuth().isLoggedInUser` 다.
	 *
	 * `isSignedIn` 을 쓰면 안 된다. 그것은 `!!getAccessToken()` 이라 **게스트도
	 * 참**이다(게스트도 JWT 를 받는다). 처음에 그걸 넘겼다가 게스트가 잠긴 과를
	 * 눌렀을 때 「먼저 로그인해 주세요」 대신 결제 안내가 떴다 — §06 이
	 * "게스트는 로그인 먼저. 계정 없이 결제하면 기기를 바꿀 때 잃는다" 로
	 * 정한 것을 정면으로 어긴다. 브라우저에서 눌러 보고서야 드러났다.
	 */
	hasAccount: boolean,
): PaywallKind {
	/*
	 * **만료를 school 보다 먼저 본다.** 순서를 바꾸면 학기가 끝난 학생이
	 * 「이용 범위에 포함되지 않아요」를 보는데, 그건 범위 문제가 아니다.
	 * 서버는 학기 종료를 `source:"school"` + 과거 `expires_at` 으로 낸다
	 * (`api/business/entitlement.py` 의 학교 분기).
	 */
	const expiredAt = ent?.expires_at ? new Date(ent.expires_at).getTime() : null;
	const isExpired = expiredAt !== null && expiredAt < Date.now();
	if (ent?.source === "school") return isExpired ? "schoolExpired" : "school";
	if (!hasAccount) return "guest";
	// 산 적이 있고 기간이 지났다 — 기록이 남아 있다는 말을 먼저 해야 한다
	if (ent?.expires_at && new Date(ent.expires_at).getTime() < Date.now())
		return "expired";
	return "member";
}

export default function PaywallPanel({
	entitlement,
	onBack,
	onSignIn,
}: {
	entitlement: Entitlement | null;
	/** 무료 과로 돌려보낸다. 어느 과가 무료인지는 부르는 쪽이 안다 */
	onBack: () => void;
	/**
	 * 로그인으로 보낸다. **이 컴포넌트가 직접 옮기지 않는다** — 이 저장소는
	 * 표시와 배선을 갈라 놨고(2026-08-26), 안에서 useNavigate 를 부르면
	 * 라우터 없이 그릴 수 없어 목업 대조에도 못 올린다.
	 */
	onSignIn: () => void;
}) {
	const { t } = useTranslation();
	const { isLoggedInUser } = useAuth();
	const kind = paywallKind(entitlement, isLoggedInUser);
	const title = t(`paywall.${kind}Title`);
	const body = t(`paywall.${kind}Body`);
	/* 기관 학생에게는 결제를 권하지 않는다 — 학기가 끝났어도 학교가 낼 일이다 */
	const purchasable = kind === "member" || kind === "expired";
	const MarkIcon =
		kind === "expired"
			? RefreshCw
			: kind === "school" || kind === "schoolExpired"
				? School
				: kind === "guest"
					? LogIn
					: LockKeyhole;
	const backKey =
		kind === "guest"
			? "guestBack"
			: kind === "school" || kind === "schoolExpired"
				? "schoolBack"
				: "memberBack";
	const benefitKeys = [
		"benefitAll",
		"benefitPractice",
		"benefitProgress",
	] as const;

	return (
		<section
			className="paywall"
			data-kind={kind}
			aria-labelledby="paywall-title"
		>
			<div className="paywall-mark" aria-hidden="true">
				<MarkIcon />
			</div>
			<div className="paywall-kicker">{t(`paywall.${kind}Kicker`)}</div>
			<h2 className="paywall-title" id="paywall-title">
				{title}
			</h2>
			<p className="paywall-body">{body}</p>

			{purchasable && (
				<ul className="paywall-benefits">
					{benefitKeys.map((benefit) => (
						<li key={benefit}>
							<span aria-hidden="true">
								<Check />
							</span>
							{t(`paywall.${benefit}`)}
						</li>
					))}
				</ul>
			)}

			<div className="paywall-acts">
				{kind === "guest" && (
					<button type="button" className="paywall-cta" onClick={onSignIn}>
						{t("paywall.guestCta")}
					</button>
				)}
				{(kind === "member" || kind === "expired") && (
					/*
					 * 결제가 아직 없다(§09 의 그 뒤). 그래서 이 버튼은 지금 아무 데도
					 * 가지 않는다 — 붙일 화면이 생기면 여기 한 줄이 바뀐다.
					 * 눌러도 조용한 것보다 **눌리지 않는 것**이 솔직하다.
					 */
					<button type="button" className="paywall-cta" disabled>
						{t(`paywall.${kind}Cta`)}
					</button>
				)}
				<button type="button" className="paywall-back" onClick={onBack}>
					{t(`paywall.${backKey}`)}
				</button>
				{kind === "school" && (
					<p className="paywall-note">{t("paywall.schoolNote")}</p>
				)}
			</div>
		</section>
	);
}
