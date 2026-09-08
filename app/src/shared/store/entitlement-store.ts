import { type Entitlement, getEntitlement } from "@/api/entitlement";
import { useEffect } from "react";
import { create } from "zustand";

/**
 * 열린 범위를 한 번만 받아 화면 여럿이 나눠 쓴다.
 *
 * 교재학습 · 게임 목록 · 활동 진입이 같은 답을 봐야 한다. 화면마다 부르면
 * 같은 순간에 서로 다른 답을 들고 있을 수 있고, 게스트가 탭을 옮길 때마다
 * 왕복이 늘어난다.
 *
 * **로그인·로그아웃하면 다시 받아야 한다** — 권한의 출처가 바뀐다.
 * `reload()` 가 그 자리이고, **부르는 곳은 `components/sign/sign-provider.tsx`** 다
 * (로그인 · 가입 · 로그아웃 · **게스트 시작** 네 곳).
 *
 * 게스트가 뒤늦게 들어온 이유 — 게스트 토큰은 「둘러보기」를 누를 때 생긴다.
 * 그보다 먼저 부르면 401 이고, 그러면 `asked` 가 참인 채로 굳어 **게스트는 권한을
 * 영영 못 받는다.** 앱 셸이 앱을 열자마자 부르게 되면서(무료 범위 미리받기)
 * 실제로 그렇게 됐다 — 2026-08-31.
 *
 * 전에는 이 주석이 "`api.ts` 의 세션 정리 이벤트에서 부른다" 고 적혀 있었는데
 * **부르는 곳이 한 곳도 없었다**(2026-08-28 실측). 그래서 게스트로 둘러보다
 * 로그인하면 — SPA 이동이라 새로고침이 없다 — `asked` 가 참인 채로 남아
 * **게스트 잠금을 그대로 봤다.**
 */
interface EntitlementState {
	entitlement: Entitlement | null;
	loading: boolean;
	/** 한 번 물어봤나. 실패해도 참이 된다 — 무한 재시도를 막는다 */
	asked: boolean;
	/** 이미 받았거나 받는 중이면 다시 부르지 않는다 */
	load: () => Promise<void>;
	/** 로그인 상태가 바뀌었을 때. 캐시를 버리고 다시 받는다 */
	reload: () => Promise<void>;
	/**
	 * **잠금 안내가 뜰 때 조용히 다시 받는다 — 비우지 않는다.**
	 *
	 * `reload()` 를 쓰면 안 되는 이유가 있다. 그쪽은 `entitlement: null` 을 **먼저**
	 * 넣는데, `null` 이면 `ready` 가 거짓이 되고 화면은 **잠금을 아예 그리지 않는다**
	 * (아래 `useEntitlement` 주석). 그래서 페이월이 뜨는 순간 그것을 부르면
	 * **페이월 자신이 한 번 사라진다** — `paywallKind()` 가 `ent?.source` 를 읽는다.
	 *
	 * 이쪽은 성공했을 때만 갈아 끼우고 **실패하면 옛 값을 그대로 둔다.** 그래서
	 * 서버가 죽어 있어도 화면이 깜빡이지도, 비지도 않는다.
	 *
	 * 왜 필요한가 — 결제가 붙은 뒤 「돈은 냈는데 화면은 잠겼다」의 남은 원인이
	 * **낡은 클라이언트 상태**다. 그것을 사용자가 누를 버튼 없이 푼다
	 * (기획 확정 2026-09-04: 복원은 「자동 다시 확인만」).
	 */
	refresh: () => Promise<void>;
}

let inFlight: Promise<void> | null = null;

/**
 * 마지막으로 **물어본** 시각(ms). `refresh()` 가 너무 잦게 부르지 않게 하는
 * 데만 쓴다. **스토어 상태에 두지 않았다** — 이 값이 바뀔 때 화면이 다시 그려질
 * 이유가 없고, 상태에 넣으면 구독한 화면 전부가 10초마다 한 번씩 헛돈다.
 *
 * **성공만 아니라 실패도 찍는다.** 처음에 「실패는 안 찍는다」로 썼는데
 * (서버가 돌아왔을 때 그만큼 빨리 회복하려고) 그러면 **서버가 죽어 있는 동안
 * 제동이 아예 없다** — 페이월을 여닫을 때마다 요청이 그대로 나간다. 폭주를
 * 막아야 하는 순간이 바로 그때고, 대가는 회복이 최대 이 간격만큼 늦는 것뿐이다.
 */
let lastTryAt = 0;

/**
 * `refresh()` 가 이 간격 안에서는 건너뛴다. 페이월은 진입점이 넷이고
 * (교재 과 칩 · 자모 칩 · 게임 카드 · 게임 라우트 가드) **닫고 다시 열기가 쉽다** —
 * 가드가 없으면 그때마다 왕복이 하나씩 늘어난다.
 */
const REFRESH_MIN_GAP_MS = 10_000;

export const useEntitlementStore = create<EntitlementState>()((set) => {
	const fetchNow = async () => {
		set({ loading: true });
		const ent = await getEntitlement();
		// 물어본 시각을 남긴다 — `refresh()` 의 간격 가드가 이것을 본다.
		// **실패도 남긴다**(위 `lastTryAt` 주석의 이유)
		lastTryAt = Date.now();
		set({ entitlement: ent, loading: false, asked: true });
	};
	return {
		entitlement: null,
		loading: false,
		asked: false,
		load: async () => {
			if (useEntitlementStore.getState().asked) return;
			if (inFlight) return inFlight;
			inFlight = fetchNow().finally(() => {
				inFlight = null;
			});
			return inFlight;
		},
		reload: async () => {
			inFlight = null;
			set({ entitlement: null, asked: false });
			inFlight = fetchNow().finally(() => {
				inFlight = null;
			});
			return inFlight;
		},
		refresh: async () => {
			// 이미 받는 중이면 그것을 기다린다 — `load` 와 같은 방어다
			if (inFlight) return inFlight;
			if (Date.now() - lastTryAt < REFRESH_MIN_GAP_MS) return;
			// **성공·실패와 무관하게 먼저 찍는다.** 아래에서 실패에 일찍 돌아가므로
			// 여기서 안 찍으면 서버가 죽은 동안 간격 가드가 통째로 무력해진다
			lastTryAt = Date.now();
			const run = (async () => {
				const ent = await getEntitlement();
				// **여기가 `load`·`reload` 와 다른 한 줄이다.** 그 둘은 `null` 을
				// 그대로 넣어 `ready` 를 끄지만, 이쪽은 옛 값을 지킨다.
				// 덮으면 `ready` 가 꺼져 **잠긴 과의 활동 목록이 그려진다** —
				// 자물쇠가 사라지고 눌러야 402 를 만나는 모양이 된다
				if (!ent) return;
				// **`loading` 을 건드리지 않는다.** 이것은 뒤에서 조용히 도는
				// 재조회라, 켜면 화면이 이미 답을 갖고 있는데도 기다리는 모양이 된다
				set({ entitlement: ent, asked: true });
			})().finally(() => {
				inFlight = null;
			});
			inFlight = run;
			return run;
		},
	};
});

/**
 * 화면에서 쓰는 입구. 처음 그려질 때 한 번 받아 온다.
 *
 * `ready` 는 **답이 실제로 왔을 때만** 참이다. 그 전에 잠금을 그리면 무료 과까지
 * 잠긴 것처럼 한 번 번쩍이고, 서버가 죽어 있으면 계속 그렇게 보인다.
 * 화면은 `ready` 가 참이 될 때까지 잠금을 미룬다 — `entitlement.ts` 의 주석 참고.
 */
export function useEntitlement() {
	const { entitlement, loading, load } = useEntitlementStore();
	useEffect(() => {
		load();
	}, [load]);
	return { entitlement, ready: entitlement !== null, loading };
}
