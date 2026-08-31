/**
 * 과별로 어떤 활동이 몇 개인지 — 한 번만 받아 화면 여럿이 나눠 쓴다 (DEV-05)
 *
 * 전에는 `learn-data-check.ts` 가 **번들의 원장 JSON 다섯을 읽어** 답했다.
 * 그 다섯이 콘텐츠 8.9MB 의 큰 몫이라, 그것을 걷어내려면 이 물음부터 서버로 옮겨야 한다.
 *
 * **본문이 아니라 수만 받는다.** 목록 화면이 **잠긴 과에도** 자물쇠와 「몇 문항」을
 * 그려야 해서 권한을 안 본다 — 수만으로는 콘텐츠가 새지 않는다.
 *
 * `entitlement-store` 와 같은 꼴이다: 화면마다 부르면 같은 순간에 서로 다른 답을
 * 들고 있을 수 있고, 탭을 옮길 때마다 왕복이 는다.
 *
 * **실패하면 빈 채로 둔다.** 그러면 모든 활동이 「없음」으로 보여 전부 잠긴 것처럼
 * 되는데, 그것이 잘못된 문항 수를 보여 주는 것보다 낫다 — 눌러도 활동이 안 열리는
 * 것은 곧 드러나지만, 수가 틀린 것은 아무도 모른다.
 */
import {
	type ContentManifest,
	type MenuType,
	getContentManifest,
} from "@/api/content";
import { useEffect } from "react";
import { create } from "zustand";

/** `${bookId}:${chapterSeq}` → 활동별 개수 */
export type CountMap = Map<string, Partial<Record<MenuType, number>>>;

interface ManifestState {
	counts: CountMap;
	/**
	 * 콘텐츠 판본 — 서버 표의 `max(updated_at)`. **못 받았으면 빈 문자열**이고,
	 * 그때 캐시를 버려선 안 된다(`content/cache.ts` 의 `syncStamp`).
	 */
	version: string;
	/** 한 번 물어봤나. 실패해도 참이 된다 — 무한 재시도를 막는다 */
	asked: boolean;
	loading: boolean;
	load: () => Promise<void>;
}

let inFlight: Promise<void> | null = null;

export const useManifestStore = create<ManifestState>()((set) => ({
	counts: new Map(),
	version: "",
	asked: false,
	loading: false,
	load: async () => {
		if (inFlight) return inFlight;
		inFlight = (async () => {
			set({ loading: true });
			let got: ContentManifest = { version: "", chapters: [] };
			try {
				got = await getContentManifest();
			} catch {
				got = { version: "", chapters: [] };
			}
			const counts: CountMap = new Map();
			for (const r of got.chapters) {
				counts.set(`${r.bookId}:${r.chapterSeq}`, r.counts);
			}
			set({ counts, version: got.version, asked: true, loading: false });
			inFlight = null;
		})();
		return inFlight;
	},
}));

/** 화면에서 쓰는 자리. 처음 그릴 때 한 번 부른다 */
export function useManifest(): { counts: CountMap; ready: boolean } {
	const { counts, asked, load } = useManifestStore();
	useEffect(() => {
		if (!asked) void load();
	}, [asked, load]);
	return { counts, ready: asked };
}

/** 그 과에서 그 활동을 열 수 있나 */
export function hasActivity(
	counts: CountMap,
	bookId: number,
	chapterSeq: number,
	menuType: MenuType,
): boolean {
	return (counts.get(`${bookId}:${chapterSeq}`)?.[menuType] ?? 0) > 0;
}

/** 그 활동의 개수. 없으면 0 */
export function activityCount(
	counts: CountMap,
	bookId: number,
	chapterSeq: number,
	menuType: MenuType,
): number {
	return counts.get(`${bookId}:${chapterSeq}`)?.[menuType] ?? 0;
}
