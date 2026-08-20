import { useTranslation } from "react-i18next";

/**
 * 피드백 알약. 자리(feedback-slot)는 늘 잡혀 있고 내용만 들고 난다 —
 * 정답 문구가 떠도 위 문제가 밀리지 않는다.
 */
export function FeedbackMessage({ kind }: { kind: "correct" | "wrong" }) {
	const { t } = useTranslation();
	return (
		<div className={`feedback-message ${kind}`}>
			<i>{kind === "correct" ? "✓" : "✕"}</i>
			{t(kind === "correct" ? "player.wellDone" : "player.tryAgain")}
		</div>
	);
}
