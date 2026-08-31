/**
 * 받은 과를 기기에 남긴다 — 그리고 권한을 잃으면 지운다 (PD-03 확정 2026-08-31)
 *
 * 콘텐츠가 서버로 가면서 **오프라인이 깨진다.** 지금까지는 번들이라 지하철에서도
 * 풀렸다. 학습자가 유학생이라 데이터 요금도 걸린다. 그래서 한 번 받은 과는 남긴다.
 *
 * ## 권한을 잃으면 지운다
 *
 * 학기가 끝나거나(`access_ended_at`) 탈퇴하면 그 기기에 남은 유료 과가 계속
 * 풀려선 안 된다. **도장**을 하나 두고, 도장이 바뀌면 옛 항목을 통째로 버린다 —
 * 항목마다 지우려 들면 하나라도 빠뜨린다. 도장에는 권한(`ent`)과 **콘텐츠 판본**
 * (`ver`)이 같이 들어간다 — 원장을 고쳤을 때도 기기가 따라와야 하기 때문이다.
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
 * 도장이 바뀌었으면 **캐시를 통째로 버린다.**
 *
 * 도장에는 갈래가 둘 있다 —
 *
 *   `ent`  `/entitlement` 응답 그대로. **권한이 줄면** 남은 유료 과를 버린다
 *   `ver`  콘텐츠 판본(서버 표의 `max(updated_at)`). **원장이 개정되면** 옛 본문을 버린다
 *
 * 어느 쪽이든 무엇이 어떻게 바뀌었는지는 **따지지 않는다.** 따지려면 판정을 앱이
 * 한 벌 더 갖게 되고, 두 벌은 반드시 갈라진다. 버린 값은 다시 받으면 그만이다.
 *
 * ## 모르는 갈래는 넘기지 않는다 — 그리고 여기서는 비교도 안 한다
 *
 * 권한과 판본은 **서로 다른 왕복으로 온다.** 하나가 실패하면 그 값은 빈 문자열인데,
 * 그것을 「달라졌다」로 읽으면 **서버가 잠깐 죽은 사이 오프라인 학습이 통째로 날아간다.**
 * 그래서 부르는 쪽이 **아는 갈래만 넘기고**, 여기서는 넘어온 갈래만 견준다.
 *
 * 갈래가 늘어도 **버리는 길은 이 함수 하나**다. 판본용 열쇠를 따로 두면 지우는 길이
 * 둘이 되고, 둘은 갈라진다.
 */
export function syncStamp(parts: Record<string, string>): void {
	const names = Object.keys(parts);
	if (names.length === 0) return;
	try {
		let stored: Record<string, string> = {};
		try {
			stored = JSON.parse(localStorage.getItem(STAMP_KEY) ?? "{}");
		} catch {
			// 읽을 수 없는 값이 남아 있으면 빈 것으로 본다. 아래에서 새 도장을 찍는다
			stored = {};
		}
		// 옛 판의 도장은 `JSON.stringify(entitlement)` 하나였다 — 파싱은 되지만
		// `ent`·`ver` 갈래가 없다. 그래서 새 판으로 넘어오는 기기는 **한 번은**
		// 캐시를 못 버리고 도장만 새로 찍는다. 그 다음부터 제대로 돈다
		// **`k in stored` 인 갈래만 견준다.** 처음 보는 갈래는 「달라졌다」가 아니다
		const changed = names.some((k) => k in stored && stored[k] !== parts[k]);
		if (changed) {
			for (const k of Object.keys(localStorage)) {
				if (k.startsWith(PREFIX)) localStorage.removeItem(k);
			}
			mem.clear();
		}
		localStorage.setItem(STAMP_KEY, JSON.stringify({ ...stored, ...parts }));
	} catch {
		// 저장소를 못 쓰는 기기가 있다. 캐시가 없을 뿐 앱은 돌아야 한다
	}
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
