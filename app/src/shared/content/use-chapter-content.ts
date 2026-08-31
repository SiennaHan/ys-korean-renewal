/**
 * 한 과의 한 활동 콘텐츠를 받는다 — 캐시와 잠금까지 한자리에서 (DEV-05)
 *
 * 활동 화면은 이 훅 하나만 보면 된다. 어디서 오는지(번들 → 서버)가 바뀌어도
 * 쓰는 쪽 모양은 그대로다.
 *
 *     const { bundle, state } = useChapterContent(bookId, chapterSeq, "fill-blank");
 *     if (state === "loading") …
 *     if (state === "locked")  …   ← 402. 구독을 권하는 자리
 *     if (state === "failed")  …   ← 네트워크. 다시 시도를 권하는 자리
 *
 * **`locked` 와 `failed` 를 가르는 것이 요점이다.** 사용자에게 할 말이 다르다 —
 * 하나는 "구독하세요" 고 하나는 "잠시 뒤 다시" 다. 뭉뚱그리면 둘 다 틀린 말을 한다.
 *
 * ## 캐시 도장
 *
 * 권한이 바뀌면 기기에 남은 유료 과를 버려야 한다(PD-03). 도장은
 * `entitlement` 를 그대로 직렬화한 것이다 — 무엇이 어떻게 바뀌었는지 앱이
 * 따지지 않는다. 따지려면 판정을 한 벌 더 갖게 되고, 두 벌은 반드시 갈라진다.
 */
import {
	type ContentBundle,
	ContentLockedError,
	type MenuType,
	getChapterContent,
} from "@/api/content";
import { useEntitlementStore } from "@/shared/store/entitlement-store";
import { useEffect, useState } from "react";
import { read, syncStamp, write } from "./cache";

export type ContentState = "loading" | "ready" | "locked" | "failed";

/**
 * 같은 과를 **두 번 부르지 않는다.**
 *
 * 훅이 `entitlement` 에 기대는데 그 값은 화면이 뜬 뒤에 도착한다. 그래서 첫 방문에
 * 효과가 두 번 돌고(null → 값), 아직 캐시가 안 쓰인 사이라 **요청이 두 번 나갔다**
 * (2026-08-31 에 네트워크 탭에서 200 이 둘 찍히는 것으로 찾았다).
 *
 * 열쇠마다 진행 중인 약속을 붙들어 두면 두 번째 호출이 그것을 나눠 쓴다.
 */
const inFlight = new Map<string, Promise<ContentBundle>>();

function fetchOnce(
	bookId: number,
	chapterSeq: number,
	menuType: MenuType,
): Promise<ContentBundle> {
	const k = `${bookId}:${chapterSeq}:${menuType}`;
	const running = inFlight.get(k);
	if (running) return running;
	const p = getChapterContent(bookId, chapterSeq, menuType).finally(() => {
		inFlight.delete(k);
	});
	inFlight.set(k, p);
	return p;
}

export interface ChapterContent {
	bundle: ContentBundle | null;
	state: ContentState;
}

export function useChapterContent(
	bookId: number | null | undefined,
	chapterSeq: number | null | undefined,
	menuType: MenuType,
): ChapterContent {
	const entitlement = useEntitlementStore((s) => s.entitlement);
	const [bundle, setBundle] = useState<ContentBundle | null>(null);
	const [state, setState] = useState<ContentState>("loading");

	useEffect(() => {
		if (bookId == null || chapterSeq == null) return;

		// **도장을 먼저 맞춘다.** 권한이 바뀌었으면 옛 캐시를 여기서 버린다 —
		// 캐시를 읽고 나서 버리면 이미 잠긴 과를 한 번 그려 버린다.
		if (entitlement) syncStamp(JSON.stringify(entitlement));

		const cached = read(bookId, chapterSeq, menuType);
		if (cached) {
			setBundle(cached);
			setState("ready");
			return;
		}

		let alive = true;
		setState("loading");
		fetchOnce(bookId, chapterSeq, menuType)
			.then((data) => {
				if (!alive) return;
				write(bookId, chapterSeq, menuType, data);
				setBundle(data);
				setState("ready");
			})
			.catch((error) => {
				if (!alive) return;
				setBundle(null);
				setState(error instanceof ContentLockedError ? "locked" : "failed");
			});
		return () => {
			// 과를 빠르게 옮기면 늦게 온 응답이 새 화면을 덮어쓴다
			alive = false;
		};
	}, [bookId, chapterSeq, menuType, entitlement]);

	return { bundle, state };
}

/** 묶음에서 한 갈래를 꺼낸다 — 없으면 빈 배열. 화면이 `?.` 를 흩뿌리지 않게 */
export function rowsOf<T>(bundle: ContentBundle | null, name: string): T[] {
	const rows = bundle?.[name];
	return Array.isArray(rows) ? (rows as T[]) : [];
}
