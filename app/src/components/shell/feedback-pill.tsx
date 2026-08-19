import { useTranslation } from "react-i18next";
import type { ChoiceVerdict } from "./choice-group";

/**
 * 피드백 pill — 구현 사양 §7
 *
 * 문항마다 토스트를 따로 띄우지 않는다. 복습 큐 집계는 결과 화면에서 한 번만 알린다.
 *
 * 정오답이 색이 아니라 이 문구로 전달된다 (§13) — 진행바는 얇아 아이콘이 없고,
 * 의미색이 초록–빨강이라 색만으로는 색각이상 학습자가 구별할 수 없기 때문이다.
 */
export interface FeedbackPillProps {
	verdict: ChoiceVerdict | null;
	/** 같은 문구를 다시 고지해야 할 때 올린다 — 같은 오답을 또 눌렀을 때 */
	nonce?: number;
	/** 발음·쓰기처럼 그때그때 참고할 안내를 직접 넣는 경우 */
	message?: string;
}

export function FeedbackPill({ verdict, nonce, message }: FeedbackPillProps) {
	const { t } = useTranslation();

	if (!verdict && !message) return null;

	const label =
		message ??
		(verdict === "correct" ? t("player.wellDone") : t("player.tryAgain"));

	return (
		<div className="pointer-events-none flex justify-center">
			<div className="flex h-9 items-center gap-2 rounded-full bg-black/70 px-3">
				{verdict && (
					<span
						aria-hidden
						className={`text-[20px] ${
							verdict === "correct" ? "text-fill-correct" : "text-fill-wrong"
						}`}
					>
						{verdict === "correct" ? "✓" : "✕"}
					</span>
				)}
				{/* 텍스트가 같으면 다시 읽지 않는 스크린리더가 있다. 영역을 새로 만들어
				    반복 고지되게 한다 (§13) — textContent 를 직접 비우면 React 와 충돌한다 */}
				<div
					key={nonce}
					aria-live="polite"
					className="text-sm text-text-inverse"
				>
					{label}
				</div>
			</div>
		</div>
	);
}
