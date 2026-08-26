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
 * 홈 목록 — `available_at` 이 지난 것만. 홈 카드의 수와 "어디로 보낼지" 를 같이 얻는다.
 */
export async function getHomeReviewQueue(): Promise<ReviewQueue> {
	try {
		const res = await api.get<ReviewQueue>("/review-queue?scope=home");
		return res.result && res.data ? res.data : EMPTY;
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
		return res.result && res.data ? res.data : EMPTY;
	} catch {
		return EMPTY;
	}
}
