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
 *
 * **그래서 권한이 오기 전에는 캐시를 읽지 않는다.** 도장을 맞출 수 없는 동안
 * 읽으면 도장이 아무 일도 하지 않는 것과 같다 — 아래 효과의 주석을 봐라.
 */
import {
	type ContentBundle,
	ContentLockedError,
	type MenuType,
	getChapterContent,
} from "@/api/content";
import { useEntitlementStore } from "@/shared/store/entitlement-store";
import { useManifestStore } from "@/shared/store/manifest-store";
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

export function fetchOnce(
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
	const asked = useEntitlementStore((s) => s.asked);
	const version = useManifestStore((s) => s.version);
	const [bundle, setBundle] = useState<ContentBundle | null>(null);
	const [state, setState] = useState<ContentState>("loading");

	useEffect(() => {
		if (bookId == null || chapterSeq == null) return;

		// **권한이 오기 전에는 캐시를 읽지 않는다.**
		//
		// 전에는 `if (entitlement) syncStamp(…)` 로 도장만 맞추고 읽기는 조건 없이
		// 했다. 그런데 `entitlement` 는 화면이 뜬 **뒤에** 오므로 첫 렌더에는 늘
		// null 이었다 — 즉 **도장을 한 번도 안 맞춘 채 옛 캐시를 그렸다.** 학기가
		// 끝난 학생이 새로고침 직후 유료 과를 한 번 볼 수 있었다(2026-08-31).
		//
		// 답이 온 뒤에 읽으면 그 구멍이 닫힌다. 효과는 entitlement 가 바뀔 때
		// 다시 도니 여기서 기다려도 화면이 멈추지 않는다.
		if (!asked) {
			// **여기서 직접 부른다.** 이 훅은 스토어 값만 읽지 스스로 받아 오지
			// 않았다 — 활동 화면에 `useEntitlement()` 를 쓰는 컴포넌트가 하나도
			// 없으면 asked 가 영영 거짓이라 화면이 로딩에 갇힌다. `load()` 는
			// asked·inFlight 를 스스로 보므로 여러 번 불러도 왕복은 한 번이다.
			void useEntitlementStore.getState().load();
			setState("loading");
			return;
		}
		// **아는 갈래만 도장에 넘긴다.**
		//
		// 물어봤는데 entitlement 가 null 이면 **서버에 못 간 것**이다
		// (`entitlement.ts` 는 실패를 null 로 낸다). 판본도 매니페스트가 실패하면
		// 빈 문자열이다. 모르는 값을 「달라졌다」로 넘기면 서버가 잠깐 죽은 사이
		// 오프라인 학습이 통째로 날아간다 — 오프라인에서 권한을 뺏을 수는 없다.
		const parts: Record<string, string> = {};
		if (entitlement) parts.ent = JSON.stringify(entitlement);
		if (version) parts.ver = version;
		syncStamp(parts);

		// 판본은 매니페스트에서 온다. 목록을 거치지 않고 활동으로 바로 들어오면
		// (옛 링크·새로고침) 아직 안 받았을 수 있어 여기서도 부른다 — `load()` 는
		// 스스로 한 번만 나간다. **기다리지는 않는다**: 받으면 위 효과가 다시 돌아
		// 그때 도장을 맞춘다. 여기서 기다리면 서버가 죽었을 때 오프라인이 막힌다.
		void useManifestStore.getState().load();

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
	}, [bookId, chapterSeq, menuType, entitlement, asked, version]);

	return { bundle, state };
}

/** 묶음에서 한 갈래를 꺼낸다 — 없으면 빈 배열. 화면이 `?.` 를 흩뿌리지 않게 */
export function rowsOf<T>(bundle: ContentBundle | null, name: string): T[] {
	const rows = bundle?.[name];
	return Array.isArray(rows) ? (rows as T[]) : [];
}
