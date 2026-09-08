import type { Entitlement } from "@/api/entitlement";
import {
	useEntitlement,
	useEntitlementStore,
} from "@/shared/store/entitlement-store";
import { useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * MY 의 구독 자리 — 시안 v1 승인(기획 2026-09-04).
 *
 * **MY 는 목업 캡처가 없는 화면이다.** `developer_tasks.md` 가 「시각 정본이 없는
 * 화면은 디자인 승인 뒤 개발한다」로 정해 뒀고, 그래서 코드보다 시안을 먼저 냈다.
 * **새 그림은 없다** — 행 두 꼴과 치수를 `content5.tsx` 에 이미 있는 것에서 그대로
 * 가져왔다(카드 radius 12 · 행 52px · 좌우 16px). 그 덕에 **CSS 가 한 줄도 안 늘었다.**
 *
 * 판정 함수와 뷰를 한 파일에 둔 것은 `paywall-panel.tsx` 와 같은 꼴이다 —
 * 문안과 판정이 같이 읽혀야 갈래를 늘릴 때 한쪽만 고치는 일이 안 생긴다.
 */
export type SubscriptionState =
	| "free"
	| "school"
	| "schoolEnded"
	| "subscribed"
	/** 개인 구독이 끝났다. `schoolEnded` 와 짝을 맞춘 이름이다 */
	| "ended";

/**
 * 어느 줄을 보일지 정한다. `null` 이면 **아무것도 그리지 않는다.**
 *
 * 답이 오기 전에 그리지 않는 것은 이 저장소 관례다 — 「서버가 답하지 않으면 잠금을
 * 아예 그리지 않는다」(`api/entitlement.ts`). **틀린 상태 한 줄이 빈 자리보다 나쁘다.**
 * MY 에는 다른 항목이 일곱 개라 화면이 비지도 않는다.
 *
 * **만료를 `source` 보다 먼저 본다** — `paywallKind()` 와 같은 순서다. 순서를 바꾸면
 * 학기가 끝난 학생이 「범위에 없어요」를 듣는다고 그쪽에 적혀 있다.
 */
export function subscriptionState(
	ent: Entitlement | null,
): SubscriptionState | null {
	if (!ent) return null;
	/*
	 * **여기서 시간대를 「고치지」 마라.** 서버가 `expires_at` 을 오프셋 없이 내고
	 * JS 는 그것을 로컬 시각으로 읽어 한국에서 9시간 어긋난다 — `DEV-19` 다.
	 * `paywallKind()` 와 `semester-ended-modal` 이 **같은 규약**을 쓰고 있어서,
	 * 이 한 곳만 바로잡으면 세 화면이 서로 다른 답을 낸다. 셋을 같이 고쳐야 한다.
	 */
	const expired = ent.expires_at
		? new Date(ent.expires_at).getTime() < Date.now()
		: false;
	if (ent.source === "school") return expired ? "schoolEnded" : "school";
	if (ent.source === "purchase") return expired ? "ended" : "subscribed";
	return "free";
}

/**
 * 누를 수 있는 갈래 — **결제로 갈 수 있는 사람만이다.**
 *
 * `school`·`schoolEnded` 가 거짓인 것이 `access_and_pricing_v1` §06 을 지키는
 * 자리다: **기관 학생에게 개인 결제 화면을 띄우면 안 된다**(학교가 이미 낸 돈이고
 * 학생이 결정할 일이 아니다). 학기가 끝났어도 결제로 풀 일이 아니라 학교의 일이다.
 *
 * `subscribed` 도 거짓이다 — 이미 구독 중인 사람에게 구독 안내를 보여 줄 이유가 없다.
 * 해지·결제수단 변경은 `PD-01` 이 정해지기 전에는 화면을 만들 수 없다.
 *
 * **화살표를 없애는 것만으로는 §06 이 지켜지지 않는다** — 주소를 직접 치는 길도
 * 막아야 한다. 그쪽은 `routes/main/my-subscription.tsx` 가 되돌린다.
 */
const CAN_GO: Record<SubscriptionState, boolean> = {
	free: true,
	ended: true,
	school: false,
	schoolEnded: false,
	subscribed: false,
};

export default function SubscriptionCard() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { entitlement } = useEntitlement();
	/*
	 * MY 를 열면 권한을 한 번 다시 읽는다 — 페이월과 같은 이유다(복원 버튼을 두지
	 * 않기로 한 기획 확정). `refresh` 는 **비우지 않는** 재조회라 이 카드가 그리는
	 * 중에 사라지지 않고, 간격 가드도 스토어가 쥐고 있다.
	 */
	const refresh = useEntitlementStore((s) => s.refresh);
	useEffect(() => {
		refresh();
	}, [refresh]);

	const state = subscriptionState(entitlement);
	if (!state) return null;

	const label = t("mypage.subscription.title");
	const value = t(`mypage.subscription.${state}`);

	if (!CAN_GO[state]) {
		return (
			<div className="mb-[12px] overflow-hidden rounded-[12px] bg-white">
				<div className="flex h-[52px] items-center gap-[20px] px-[16px]">
					<span className="shrink-0 font-medium text-[14px] text-text-sub leading-[20px]">
						{label}
					</span>
					<span className="truncate font-medium text-[14px] text-text-strong leading-[20px]">
						{value}
					</span>
				</div>
			</div>
		);
	}

	return (
		<div className="mb-[12px] overflow-hidden rounded-[12px] bg-white">
			<button
				type="button"
				onClick={() => navigate({ to: "/main/my-subscription" })}
				className="flex h-[52px] w-full items-center gap-[20px] px-[16px] active:bg-background-base"
			>
				<span className="shrink-0 font-medium text-[14px] text-text-sub leading-[20px]">
					{label}
				</span>
				<span className="truncate font-semibold text-[14px] text-text-strong leading-[20px]">
					{value}
				</span>
				<ChevronRight className="ml-auto size-[20px] shrink-0 text-icon-faint" />
			</button>
		</div>
	);
}
