import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { WRONG_FLASH_EVENT, WRONG_VISIBLE_MS } from "./choice";

/**
 * 피드백 알약. 자리(feedback-slot)는 늘 잡혀 있고 내용만 들고 난다 —
 * 정답 문구가 떠도 위 문제가 밀리지 않는다.
 *
 * 오답 알약은 WRONG_VISIBLE_MS(2초) 뒤에 스스로 거둬진다. 명세는
 * "pill은 그대로 유지" 였는데 2026-08-24 에 기획이 줄이기로 정했다 —
 * 선택지 표시와 같은 시간에 같이 사라져야 둘이 한 신호로 읽힌다.
 * 정답 알약은 다음 문항으로 넘어갈 때까지 그대로 둔다.
 *
 * 같은 오답을 또 누르면 다시 뜬다. 선택지가 쏘는 WRONG_FLASH_EVENT 를 듣는다 —
 * 부모의 오답 기록 모양이 화면마다 달라서(Set · 단일 상태 · Record · boolean[])
 * 넷을 고치는 대신 선택지가 직접 알린다.
 *
 * 부모의 채점 기록은 건드리지 않는다. 여기서 거두는 것은 표시뿐이다.
 */
export function FeedbackMessage({ kind }: { kind: "correct" | "wrong" }) {
	const { t } = useTranslation();
	const [shown, setShown] = useState(true);
	const hideAt = useRef<number | undefined>(undefined);

	/** 띄우고 다시 센다. 이미 세던 것이 있으면 버린다 */
	const show = useCallback(() => {
		setShown(true);
		window.clearTimeout(hideAt.current);
		hideAt.current = window.setTimeout(() => setShown(false), WRONG_VISIBLE_MS);
	}, []);

	useEffect(() => {
		if (kind !== "wrong") {
			setShown(true);
			return;
		}
		show();
		window.addEventListener(WRONG_FLASH_EVENT, show);
		return () => {
			window.removeEventListener(WRONG_FLASH_EVENT, show);
			window.clearTimeout(hideAt.current);
		};
	}, [kind, show]);

	if (!shown) return null;

	return (
		<div className={`feedback-message ${kind}`}>
			<i>{kind === "correct" ? "✓" : "✕"}</i>
			{t(kind === "correct" ? "player.wellDone" : "player.tryAgain")}
		</div>
	);
}
