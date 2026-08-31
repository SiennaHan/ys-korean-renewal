/**
 * 받은 과를 기기에 남긴다 — 그리고 권한을 잃으면 지운다 (PD-03 확정 2026-08-31)
 *
 * 콘텐츠가 서버로 가면서 **오프라인이 깨진다.** 지금까지는 번들이라 지하철에서도
 * 풀렸다. 학습자가 유학생이라 데이터 요금도 걸린다. 그래서 한 번 받은 과는 남긴다.
 *
 * ## 권한을 잃으면 지운다
 *
 * 학기가 끝나거나(`access_ended_at`) 탈퇴하면 그 기기에 남은 유료 과가 계속
 * 풀려선 안 된다. 캐시 열쇠에 **권한 도장**을 넣어 두고, 도장이 바뀌면 옛 항목을
 * 통째로 버린다 — 항목마다 지우려 들면 하나라도 빠뜨린다.
 *
 * ## 왜 localStorage 인가
 *
 * 이 앱이 이미 토큰·게스트 id·언어를 거기에 둔다(`api.ts`). IndexedDB 가 더
 * 맞지만 그것만으로 새 실패 갈래(버전 충돌·비동기 열기)가 생기고, 과 하나가
 * 수십 KB라 용량이 문제가 되지 않는다. **한계는 알고 쓴다** — 사파리 사생활
 * 모드처럼 쓰기가 던지는 자리가 있어서 실패해도 앱은 굴러가야 한다.
 */
import type { ContentBundle, MenuType } from "@/api/content";

const PREFIX = "koreanContent:";
const STAMP_KEY = "koreanContentStamp";

/** 메모리 캐시 — 같은 화면에서 오갈 때 localStorage 를 다시 파싱하지 않는다 */
const mem = new Map<string, ContentBundle>();

function key(bookId: number, chapterSeq: number, menuType: MenuType): string {
	return `${PREFIX}${bookId}:${chapterSeq}:${menuType}`;
}

/**
 * 권한 도장이 바뀌었으면 **캐시를 통째로 버린다.**
 *
 * 도장은 `/entitlement` 응답에서 만든다(호출하는 쪽이 넘긴다). 무엇이 바뀌었는지
 * 따지지 않는다 — 범위가 줄었는지 늘었는지 가리려면 판정을 앱이 한 벌 더 갖게 되고,
 * 두 벌은 반드시 갈라진다. 버리는 값은 다시 받으면 그만이다.
 */
export function syncStamp(stamp: string): void {
	try {
		if (localStorage.getItem(STAMP_KEY) === stamp) return;
		for (const k of Object.keys(localStorage)) {
			if (k.startsWith(PREFIX)) localStorage.removeItem(k);
		}
		localStorage.setItem(STAMP_KEY, stamp);
	} catch {
		// 저장소를 못 쓰는 기기가 있다. 캐시가 없을 뿐 앱은 돌아야 한다
	}
	mem.clear();
}

/** 탈퇴·로그아웃처럼 **남기면 안 되는** 때. 도장까지 지운다 */
export function clearAll(): void {
	try {
		for (const k of Object.keys(localStorage)) {
			if (k.startsWith(PREFIX)) localStorage.removeItem(k);
		}
		localStorage.removeItem(STAMP_KEY);
	} catch {
		/* 위와 같다 */
	}
	mem.clear();
}

export function read(
	bookId: number,
	chapterSeq: number,
	menuType: MenuType,
): ContentBundle | null {
	const k = key(bookId, chapterSeq, menuType);
	const hit = mem.get(k);
	if (hit) return hit;
	try {
		const raw = localStorage.getItem(k);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as ContentBundle;
		mem.set(k, parsed);
		return parsed;
	} catch {
		// 깨진 값이 남아 있으면 지운다. 남겨 두면 매번 같은 자리에서 실패한다
		try {
			localStorage.removeItem(k);
		} catch {
			/* 무시 */
		}
		return null;
	}
}

export function write(
	bookId: number,
	chapterSeq: number,
	menuType: MenuType,
	bundle: ContentBundle,
): void {
	const k = key(bookId, chapterSeq, menuType);
	mem.set(k, bundle);
	try {
		localStorage.setItem(k, JSON.stringify(bundle));
	} catch {
		// 용량이 찼거나 쓰기가 막힌 기기. 메모리 캐시만으로 이 세션은 돈다
	}
}
