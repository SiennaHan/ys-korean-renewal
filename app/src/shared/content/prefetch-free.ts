/**
 * 무료 범위를 미리 받아 캐시에 채운다 — 오프라인 회귀를 메운다 (DEV-05)
 *
 * 콘텐츠를 서버로 옮기면서 **지하철에서 안 풀리게** 됐다. 전에는 번들이라
 * 네트워크가 없어도 됐다. 학습자가 유학생이라 데이터 요금도 걸린다.
 *
 * DEV-05 카드는 「무료 범위는 번들에 남긴다」고 적었는데, 실제로는 무료 과도
 * 서버에서 받게 됐다. 번들에 남기는 대신 **앱을 열 때 유휴 시간에 미리 받아**
 * 같은 결과를 만든다 — 번들에 남기면 앱을 여는 모든 사람이 그 무게를 지고,
 * 미리 받으면 캐시가 없는 첫 실행에만 든다.
 *
 * ## 무료 경계를 앱에 다시 적지 않는다
 *
 * **`/entitlement` 응답이 곧 답이다.** `free_scope.py` 머리말이 「값이 두 곳에
 * 있으면 반드시 갈라진다」고 적어 둔 그 자리다. 그래서 여기에는 급도 과 번호도
 * 없다 — 서버가 열어 준 과를 그대로 받는다.
 *
 * ## `books` 는 절대 안 본다
 *
 * `entitlement` 에는 `chapters`(예외로 열린 과)와 `books`(통째로 열린 급)가 있다.
 * **구독자와 계약 학교는 `books` 에 전 급이 들어 있어** 그것까지 받으려 들면
 * 120과 × 활동 일곱을 훑는다. 여기서 보는 것은 `chapters` 뿐이고, 그 위에
 * 과 수 상한도 둔다 — 마케팅이 무료 과를 늘려도 여기가 폭주하지 않게.
 *
 * ## 자모는 없다
 *
 * 자모는 아직 번들에 있다(`n8_jamo`). 이미 오프라인이라 받을 것이 없다.
 */
import type { MenuType } from "@/api/content";
import { useEntitlementStore } from "@/shared/store/entitlement-store";
import { useManifestStore } from "@/shared/store/manifest-store";
import { useEffect } from "react";
import { read, syncStamp, write } from "./cache";
import { fetchOnce } from "./use-chapter-content";

/** 미리 받을 활동. **자모는 번들에 있어 뺀다** */
const MENUS: MenuType[] = [
	"word",
	"roleplay",
	"listen-answer",
	"fill-blank",
	"read-answer",
	"flashcard",
	"mission-chat",
];

/**
 * 과 수 상한. 지금 무료는 3과지만(1급 4과 · 2급 1과 · 3급 1과) 그 값은 서버가
 * 쥐고 있고 늘어날 수 있다. **앱이 무료 범위를 아는 것이 아니라, 폭주만 막는다.**
 */
const MAX_CHAPTERS = 5;

/** 한 번에 몇 개까지 나가나 — 유휴 시간에 도는 일이라 앞길을 막으면 안 된다 */
const CONCURRENCY = 3;

/** 이번 실행에서 이미 훑은 범위. 같은 범위를 두 번 훑지 않는다 */
let doneFor: string | null = null;

function onIdle(run: () => void): () => void {
	const w = window as typeof window & {
		requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
		cancelIdleCallback?: (id: number) => void;
	};
	if (w.requestIdleCallback) {
		const id = w.requestIdleCallback(run, { timeout: 5000 });
		return () => w.cancelIdleCallback?.(id);
	}
	// 사파리에는 없다. 첫 그리기를 비켜 갈 만큼만 미룬다
	const id = window.setTimeout(run, 2000);
	return () => window.clearTimeout(id);
}

/** 앞에서부터 몇 개씩 — 서버에 한꺼번에 몰지 않는다 */
async function drain(jobs: (() => Promise<void>)[]): Promise<void> {
	let next = 0;
	const worker = async () => {
		while (next < jobs.length) {
			const job = jobs[next++];
			try {
				await job();
			} catch {
				// 미리 받는 일이다. 하나 실패해도 나머지는 계속하고, 화면은 모른다
			}
		}
	};
	await Promise.all(
		Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker),
	);
}

/**
 * 앱 셸에 하나 둔다. 그리는 것은 없다.
 *
 * 권한이 바뀌면(로그인 · 로그아웃 · 학기 종료) 다시 돈다 — 열린 범위가 달라지기
 * 때문이다. 이미 캐시에 있는 것은 건너뛰므로 두 번째부터는 요청이 0이다.
 */
export function useFreeContentPrefetch(): void {
	const entitlement = useEntitlementStore((s) => s.entitlement);
	const counts = useManifestStore((s) => s.counts);
	const version = useManifestStore((s) => s.version);
	const manifestAsked = useManifestStore((s) => s.asked);

	// 권한과 매니페스트를 **여기서 부른다.** 이 훅이 앱 셸에 있어서, 학습자가
	// 아직 아무 화면도 안 열었을 때 미리 받으려면 그 둘이 먼저 있어야 한다.
	// 둘 다 `load()` 가 스스로 한 번만 나간다 — 화면들이 또 불러도 왕복은 그대로다
	useEffect(() => {
		void useEntitlementStore.getState().load();
		void useManifestStore.getState().load();
	}, []);

	useEffect(() => {
		if (!entitlement || !manifestAsked) return;

		// **`chapters` 만 본다.** `books` 는 위 머리말의 이유로 안 본다
		const targets: { bookId: number; seq: number }[] = [];
		for (const [book, seqs] of Object.entries(entitlement.chapters)) {
			for (const seq of seqs) {
				targets.push({ bookId: Number(book), seq });
			}
		}
		targets.sort((a, b) => a.bookId - b.bookId || a.seq - b.seq);
		const scope = targets.slice(0, MAX_CHAPTERS);
		const key = scope.map((t) => `${t.bookId}:${t.seq}`).join(",");
		if (!key || doneFor === key) return;
		doneFor = key;

		// **채우기 전에 도장을 맞춘다.** 미리받기는 활동 화면을 거치지 않으므로
		// 여기서 안 찍으면 도장 없는 캐시가 남는다 — 나중에 권한이 줄어도
		// 견줄 옛 값이 없어 안 버려진다. 활동 화면과 **같은 함수**를 쓴다
		const parts: Record<string, string> = { ent: JSON.stringify(entitlement) };
		if (version) parts.ver = version;
		syncStamp(parts);

		const jobs: (() => Promise<void>)[] = [];
		for (const { bookId, seq } of scope) {
			const has = counts.get(`${bookId}:${seq}`);
			for (const menu of MENUS) {
				// 매니페스트가 0이라 한 활동은 부르지 않는다 — 빈 요청이 나가지 않게
				if (!has?.[menu]) continue;
				if (read(bookId, seq, menu)) continue;
				jobs.push(async () => {
					write(bookId, seq, menu, await fetchOnce(bookId, seq, menu));
				});
			}
		}
		if (jobs.length === 0) return;

		let alive = true;
		const cancel = onIdle(() => {
			if (alive) void drain(jobs);
		});
		return () => {
			alive = false;
			cancel();
		};
	}, [entitlement, counts, version, manifestAsked]);
}
