import type { Entitlement } from "@/api/entitlement";
import { GAMES } from "@/components/main/game/list-view";
import { useAuth } from "@/components/sign/sign-provider";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * 결제 안내 — access_and_pricing_v1 §06 · 목업 phase1/draft_paywall.html
 *
 * **숨기지 않고 보이되 잠근다.** 목록에서 지워 버리면 무엇을 사는지 모르고
 * 자기가 어디까지 왔는지도 가늠하지 못한다. 그래서 잠긴 과를 고르면 활동
 * 목록 자리에 이 안내가 들어온다 — 과 제목과 자물쇠는 그대로 보인다.
 *
 * **기관 학생에게는 결제 버튼을 두지 않는다.** 학교가 이미 낸 돈이고 학생이
 * 결정할 일이 아니다(§06). 그래서 갈래를 넷으로 가른다.
 */
export type PaywallKind = "guest" | "member" | "expired" | "school";

/**
 * 어느 안내를 보일지 정한다.
 *
 * 판정을 앱이 하지 않는다는 규칙과 어긋나지 않는다 — **열린 범위**는 서버가
 * 정하고, 여기서 고르는 것은 그 결과를 어떤 말로 전할지다.
 */
export function paywallKind(
	ent: Entitlement | null,
	isSignedIn: boolean,
): PaywallKind {
	if (ent?.source === "school") return "school";
	if (!isSignedIn) return "guest";
	// 산 적이 있고 기간이 지났다 — 기록이 남아 있다는 말을 먼저 해야 한다
	if (ent?.expires_at && new Date(ent.expires_at).getTime() < Date.now())
		return "expired";
	return "member";
}

export default function PaywallPanel({
	level,
	lesson,
	entitlement,
	onBack,
	onSignIn,
}: {
	/**
	 * 어느 과 때문에 막혔나. **게임처럼 과가 없는 자리에서는 비운다** —
	 * 그때는 "이 과는" 이라고 말하지 않고 범위만 말한다.
	 */
	level?: number;
	lesson?: number;
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
	const { isSignedIn } = useAuth();
	const kind = paywallKind(entitlement, isSignedIn);

	/* 무료 게임 이름은 앱이 부르는 이름을 쓴다 — 목업의 "낱말맞추기" 대신 VocaShot */
	const freeGameNames = (entitlement?.games ?? [])
		.map((key) => GAMES.find((g) => g.key === key)?.i18nKey)
		.filter(Boolean)
		.map((k) => t(`game.list.${k}.name`))
		.join(" · ");

	const title = t(`paywall.${kind}Title`);
	const body =
		kind === "member" && level != null && lesson != null
			? t("paywall.memberBody", { level, lesson })
			: kind === "member"
				? t("paywall.memberBodyGeneric")
				: t(`paywall.${kind}Body`);

	return (
		<div className="paywall">
			<div className="paywall-mark" aria-hidden="true">
				<Lock />
			</div>
			<h2 className="paywall-title">{title}</h2>
			<p className="paywall-body">{body}</p>

			{/* 지금 바로 볼 수 있는 것 — 벽만 보여 주면 할 일이 없어 보인다 */}
			<div className="paywall-free">
				<div className="paywall-free-t">{t("paywall.freeListTitle")}</div>
				<ul>
					<li>{t("paywall.freeJamo")}</li>
					<li>{t("paywall.freeBooks")}</li>
					{freeGameNames && (
						<li>{t("paywall.freeGames", { games: freeGameNames })}</li>
					)}
					{entitlement?.clips !== false && <li>{t("paywall.freeClips")}</li>}
				</ul>
			</div>

			{/* 가격은 기관 학생에게 말하지 않는다 */}
			{kind !== "school" && kind !== "guest" && (
				<div className="paywall-price">
					<div className="paywall-price-t">{t("paywall.priceTitle")}</div>
					<p>{t("paywall.priceBody")}</p>
				</div>
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
					{t(kind === "guest" ? "paywall.guestBack" : "paywall.memberBack")}
				</button>
				{kind === "school" && (
					<p className="paywall-note">{t("paywall.schoolNote")}</p>
				)}
				{kind === "member" && (
					<button type="button" className="paywall-restore" disabled>
						{t("paywall.restore")}
					</button>
				)}
			</div>
		</div>
	);
}
