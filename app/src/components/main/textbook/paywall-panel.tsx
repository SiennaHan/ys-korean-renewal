import type { Entitlement } from "@/api/entitlement";
import { useAuth } from "@/components/sign/sign-provider";
import { MONTHLY_PRICE_KRW } from "@/shared/constants";
import { useEntitlementStore } from "@/shared/store/entitlement-store";
import { Check, LockKeyhole, LogIn, RefreshCw, School } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * 결제 안내 — access_and_pricing_v1 §06 · 시각 정본 docs/paywall_SOT.html
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
	/*
	 * **이 안내가 뜨면 권한을 한 번 다시 받는다** (기획 확정 2026-09-04).
	 *
	 * 잠긴 것처럼 보이는 이유가 「정말 잠겼다」가 아니라 **손에 든 답이 낡았다**
	 * 일 수 있다. 그때 사용자가 할 수 있는 것이 없으면 바로 문의로 온다 —
	 * 그것을 누를 버튼 없이 푼다(복원 버튼을 두지 않기로 한 근거).
	 *
	 * **네 진입점이 다 이 컴포넌트를 지나므로 여기 한 곳으로 끝난다** — 교재 과 칩 ·
	 * 자모 칩 · 게임 카드 · 게임 라우트 가드. 부르는 쪽에 넷을 각각 넣으면 한 곳을
	 * 빠뜨렸을 때 조용히 안 돈다.
	 *
	 * `refresh` 는 **비우지 않는** 재조회다(스토어 주석). `reload` 를 쓰면
	 * `entitlement` 가 잠깐 `null` 이 되어 이 페이월이 스스로 사라진다.
	 * 간격 가드도 스토어가 쥐고 있어서, 닫고 다시 열기를 반복해도 왕복이 새지 않는다.
	 *
	 * 액션만 골라 구독한다 — 스토어 전체를 구독하면 `entitlement` 가 바뀔 때마다
	 * 이 컴포넌트가 다시 그려진다. 값은 이미 prop 으로 받고 있다.
	 */
	const refresh = useEntitlementStore((s) => s.refresh);
	useEffect(() => {
		refresh();
	}, [refresh]);
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

			{/*
			 * 금액 줄 — **혜택 아래, 행동 위**(기획 확정 E-1). 혜택 셋을 읽고 값을
			 * 확인하고 누르는 순서라 기존 화면의 순서를 하나도 바꾸지 않는다.
			 * **`purchasable` 과 같은 조건이다** — 기관 학생에게는 가격도 결제 버튼도
			 * 보이지 않는다(§06). 게스트도 안 본다: 값보다 계정이 앞선다.
			 */}
			{purchasable && (
				<p className="paywall-price">
					<span className="paywall-price-amount">
						{t("paywall.priceAmount", {
							amount: MONTHLY_PRICE_KRW.toLocaleString("ko-KR"),
						})}
					</span>
					<span className="paywall-price-per">{t("paywall.pricePer")}</span>
					<span className="paywall-price-vat">{t("paywall.priceVat")}</span>
				</p>
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
