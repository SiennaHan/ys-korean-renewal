import { api } from "./api";

/**
 * 다시 풀기 목록 — dev_spec_v1 §2.3 · §3
 *
 * 홈 카드가 총계를 쓰고, 활동 화면이 자기 몫을 받아 다시 낸다.
 * **한 세션에 내보내는 상한은 서버가 10 으로 건다** — 60을 한 번에 내면 압도한다.
 */

export type ReviewItem = {
	id: number;
	bookId: number;
	chapterSeq: number;
	menuType: string;
	sub: number;
	questionId: number;
	reason: "wrong" | "skipped" | "unknown";
	attempts: number;
	availableAt: string;
};

export type ReviewQueue = {
	items: ReviewItem[];
	/** 보관 총계. 세션 상한 때문에 items 길이로는 알 수 없다 */
	total: number;
};

const EMPTY: ReviewQueue = { items: [], total: 0 };

/**
 * 응답의 모양을 믿지 않는다.
 *
 * `res.data` 가 `{}` 여도 truthy 라 그대로 돌려주면 받는 쪽에서 `items` 가
 * undefined 가 되고, 다섯 자리가 한꺼번에 `.map` 으로 터진다 — 실제로 그랬다
 * (2026-08-26, 로컬 목이 `data:{}` 를 준다). 화면은 조용히 죽고 콘솔에만 남는다.
 *
 * 같은 날 미션대화의 `feedbacks.map` 도 같은 꼴이었다. 계약은 **받는 자리 한 곳에서**
 * 지킨다 — 부르는 쪽마다 `?? []` 를 흩뿌리면 새로 부르는 곳이 또 빠뜨린다.
 */
function asQueue(data: unknown): ReviewQueue {
	if (!data || typeof data !== "object") return EMPTY;
	const d = data as Partial<ReviewQueue>;
	if (!Array.isArray(d.items)) return EMPTY;
	return { items: d.items, total: d.total ?? d.items.length };
}

/**
 * 홈 목록 — `available_at` 이 지난 것만. 홈 카드의 수와 "어디로 보낼지" 를 같이 얻는다.
 */
export async function getHomeReviewQueue(): Promise<ReviewQueue> {
	try {
		const res = await api.get<ReviewQueue>("/review-queue?scope=home");
		return res.result ? asQueue(res.data) : EMPTY;
	} catch {
		return EMPTY;
	}
}

/**
 * 한 활동 몫 — **`available_at` 을 보지 않는다.** 결과 화면의 [다시 풀기] 와 같은 규칙이다
 * (같은 날 재출제를 막는 것은 홈 쪽뿐이다).
 */
export async function getActivityReviewQueue(key: {
	bookId: number;
	chapterSeq: number;
	menuType: string;
	sub?: number;
}): Promise<ReviewQueue> {
	const q = new URLSearchParams({
		scope: "activity",
		bookId: String(key.bookId),
		chapterSeq: String(key.chapterSeq),
		menuType: key.menuType,
		sub: String(key.sub ?? 0),
	});
	try {
		const res = await api.get<ReviewQueue>(`/review-queue?${q}`);
		return res.result ? asQueue(res.data) : EMPTY;
	} catch {
		return EMPTY;
	}
}
