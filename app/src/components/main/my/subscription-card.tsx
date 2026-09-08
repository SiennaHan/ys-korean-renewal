import { type Entitlement, eventLastDay } from "@/api/entitlement";
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
	| "ended"
	/**
	 * **런칭 이벤트 기간**(2026-09-04 기획 확정) — 그 날까지 로그인한 사람 전원이
	 * 전 범위를 받는다. 무료 체험이 아니다.
	 */
	| "event";

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
	/*
	 * **이벤트가 끝나면 서버가 `event` 를 그만 낸다** — 기간 판정은 서버 한 곳
	 * (`api/business/entitlement.py`)이고 앱은 받은 것만 그린다. 그래서 여기서
	 * `expired` 를 볼 필요가 없다. 그 규칙을 앱에 한 벌 더 두면 두 시계가 갈린다.
	 */
	if (ent.source === "event") return "event";
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
	/*
	 * **이벤트 중에도 누를 수 있다.** 오히려 이 갈래가 가장 눌러야 하는 자리다 —
	 * 언제 끝나는지와 그 뒤 얼마인지를 그 화면이 말해 준다. 알리지 않으면 이벤트가
	 * 아니라 배신이 된다(기획 2026-09-04).
	 */
	event: true,
	school: false,
	schoolEnded: false,
	subscribed: false,
};

export default function SubscriptionCard() {
	// `i18n.language` 는 이벤트 마지막 날을 그 언어의 날짜 꼴로 만들기 위해서다
	const { t, i18n } = useTranslation();
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
	/*
	 * **`event` 갈래의 문구에는 날짜가 들어간다** — 「10월 31일까지 무료」.
	 * 처음에 이 자리를 그냥 `t(키)` 로 두었더니 화면에 `{{date}}` 가 글자 그대로
	 * 떴다. **게이트는 하나도 안 울었다** — i18n 값이 화면에 어떻게 박히는지는
	 * typecheck·parity·check:css 가 세지 않는 축이다. 눌러 보고서야 드러났다.
	 */
	const lastDay = eventLastDay(entitlement);
	const value = t(
		`mypage.subscription.${state}`,
		lastDay
			? {
					date: lastDay.toLocaleDateString(i18n.language, {
						month: "long",
						day: "numeric",
					}),
				}
			: undefined,
	);

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
