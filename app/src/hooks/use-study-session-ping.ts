import { pingStudySession } from "@/api/study-session";
import { useEffect } from "react";

const PING_INTERVAL_MS = 30_000; // 30초

/**
 * 학습 화면에서 사용 — 30초마다 학습 세션 핑 전송.
 * 탭이 숨겨진 동안에는 핑을 보내지 않음.
 */
export function useStudySessionPing(context?: string) {
	useEffect(() => {
		const doPing = () => {
			if (!document.hidden) {
				pingStudySession(context);
			}
		};

		// 즉시 1회 핑
		doPing();

		const id = setInterval(doPing, PING_INTERVAL_MS);
		return () => clearInterval(id);
	}, [context]);
}
