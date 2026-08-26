import { api } from "./api";

/**
 * 활동 상태 — dev_spec_v1 §2.1 · §3
 *
 * 전에는 화면이 이어하기 위치와 완료를 **정답 기록에서 유추**했다
 * (`findIndex(q => !map[q.id]?.correct)`). 첫 시도만 기록하도록 서버를 고친 뒤
 * 그 유추가 어긋났다 — 재시도로 맞힌 문항이 영원히 "안 푼 것" 으로 남는다
 * (BLOCKERS.md §6-c-1). 정답률과 진행 위치는 다른 것이므로 여기서 갈라 놓는다.
 */

export type ActivityState = {
	bookId: number;
	chapterSeq: number;
	menuType: string;
	sub: number;
	state: "in_progress" | "completed";
	currentItemIndex: number;
	totalItems: number | null;
	answeredCount: number;
	gradedCount: number;
	correctCount: number;
	completedAt: string | null;
	/** 이 요청으로 행이 처음 생겼나 */
	created?: boolean;
	/** 이미 완료한 활동에 다시 들어온 것인가 — 연습 세션이다(G2 §6-1) */
	practice?: boolean;
	/** 완료 응답에만 있다. 결과 화면의 "다시 풀 문제 N개" */
	reviewRemaining?: number;
};

type Key = {
	bookId: number;
	chapterSeq: number;
	menuType: string;
	sub?: number;
};

/** 활동 진입. 실패하면 null — 화면은 0번 문항부터 시작하면 된다 */
export async function enterActivity(
	key: Key,
	totalItems: number | null,
): Promise<ActivityState | null> {
	try {
		const res = await api.post<ActivityState>("/activity/enter", {
			...key,
			sub: key.sub ?? 0,
			totalItems,
		});
		return res.result ? (res.data ?? null) : null;
	} catch {
		return null;
	}
}

/**
 * 문항을 옮길 때마다, 그리고 ✕ 로 나갈 때도 부른다(G2 §3.1 "저장 없이 나가기 없음").
 *
 * 실패를 삼킨다 — 위치 저장이 학습을 막아서는 안 된다. 다음 이동에서 다시 보낸다.
 */
export async function saveActivityProgress(
	key: Key,
	currentItemIndex: number,
): Promise<void> {
	try {
		await api.patch("/activity/progress", {
			...key,
			sub: key.sub ?? 0,
			currentItemIndex,
		});
	} catch {
		/* 무시 */
	}
}

/** 마지막 문항에 응답했을 때. 세 수는 화면이 아는 것이 더 정확하다 */
export async function completeActivity(
	key: Key,
	counts: { answeredCount: number; gradedCount: number; correctCount: number },
): Promise<ActivityState | null> {
	try {
		const res = await api.post<ActivityState>("/activity/complete", {
			...key,
			sub: key.sub ?? 0,
			...counts,
		});
		return res.result ? (res.data ?? null) : null;
	} catch {
		return null;
	}
}

/** 한 과의 활동 상태 전부. 교재학습 목록이 done 표시에 쓴다 */
export async function getChapterStates(
	bookId: number,
	chapterSeq: number,
): Promise<ActivityState[]> {
	try {
		const res = await api.get<ActivityState[]>(
			`/activity/chapter?bookId=${bookId}&chapterSeq=${chapterSeq}`,
		);
		return res.result && res.data ? res.data : [];
	} catch {
		return [];
	}
}
