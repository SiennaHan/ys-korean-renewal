import {
	type ActivityState,
	completeActivity,
	enterActivity,
	saveActivityProgress,
} from "@/api/activity";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 활동 상태를 서버와 맞춘다 — 진입 · 이동 저장 · 완료.
 *
 * 화면 넷(fill-blank · listen-answer · read-answer · word-learning)이 같은 무늬라
 * 여기 모았다.
 *
 * **startIndex 가 null 인 동안 화면은 기다려야 한다.** 0 으로 시작해 버리면
 * 서버가 준 위치가 도착할 때 문항이 튄다. null 은 "아직 모른다" 이고 숫자는
 * "여기서 시작" 이다. 서버가 죽어 있으면 0 이 온다 — 그때는 예전처럼 처음부터다.
 *
 * `retry` 가 참이면 진입을 부르지 않는다. 결과 화면의 [다시 풀기] 는 문항 집합이
 * 다른 별개 세션이므로(shell_spec §3.3) 저장된 위치를 쓰면 엉뚱한 데서 시작한다.
 */
export function useActivityState(opts: {
	bookId: number | undefined;
	chapterSeq: number | undefined;
	menuType: string;
	sub?: number;
	totalItems: number | null;
	retry?: boolean;
}) {
	const { bookId, chapterSeq, menuType, sub = 0, totalItems, retry } = opts;

	const [startIndex, setStartIndex] = useState<number | null>(null);
	const [practice, setPractice] = useState(false);

	/** 마지막으로 보낸 위치. 같은 값을 두 번 보내지 않는다 */
	const sentIndex = useRef<number | null>(null);

	useEffect(() => {
		if (!bookId || !chapterSeq) return;
		if (retry) {
			// 다시 풀기 세션 — 처음부터. 서버 위치를 쓰지 않는다
			setStartIndex(0);
			return;
		}
		let alive = true;
		enterActivity({ bookId, chapterSeq, menuType, sub }, totalItems).then(
			(res: ActivityState | null) => {
				if (!alive) return;
				setStartIndex(res?.currentItemIndex ?? 0);
				setPractice(res?.practice ?? false);
				sentIndex.current = res?.currentItemIndex ?? 0;
			},
		);
		return () => {
			alive = false;
		};
	}, [bookId, chapterSeq, menuType, sub, totalItems, retry]);

	const saveProgress = useCallback(
		(index: number) => {
			if (!bookId || !chapterSeq || retry) return;
			/*
			 * **진입 응답이 오기 전에는 보내지 않는다.**
			 *
			 * 안 막았을 때 이렇게 됐다 — 마운트 시점의 currentIndex 는 0 이라
			 * saveProgress(0) 이 먼저 나가고, 그다음 enter 가 1 을 주고 sentIndex 를
			 * 1 로 맞춘다. 화면은 1 로 옮겨지지만 그 저장은 "같은 값" 이라 건너뛰어져서
			 * 서버에는 0 이 남는다. 즉 **새로고침이 저장된 위치를 0 으로 되돌렸다.**
			 * 브라우저에서 실제로 그렇게 나왔다.
			 */
			if (startIndex === null) return;
			if (sentIndex.current === index) return;
			sentIndex.current = index;
			void saveActivityProgress({ bookId, chapterSeq, menuType, sub }, index);
		},
		[bookId, chapterSeq, menuType, sub, retry, startIndex],
	);

	const complete = useCallback(
		async (counts: {
			answeredCount: number;
			gradedCount: number;
			correctCount: number;
		}) => {
			if (!bookId || !chapterSeq || retry) return null;
			return completeActivity({ bookId, chapterSeq, menuType, sub }, counts);
		},
		[bookId, chapterSeq, menuType, sub, retry],
	);

	return { startIndex, practice, saveProgress, complete };
}
