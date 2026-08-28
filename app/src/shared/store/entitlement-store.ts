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
 * (로그인 · 가입 · 로그아웃 세 곳).
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
}

let inFlight: Promise<void> | null = null;

export const useEntitlementStore = create<EntitlementState>()((set) => {
	const fetchNow = async () => {
		set({ loading: true });
		const ent = await getEntitlement();
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
