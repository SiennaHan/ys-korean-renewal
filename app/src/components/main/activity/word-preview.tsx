import { useTranslation } from "react-i18next";
import { IconVolume } from "./icons";

export interface PreviewWord {
	word: string;
	meaning: string;
}

/**
 * 어휘 미리보기 — 문제를 풀기 전에 이번 과 낱말을 한 번 훑는 자리.
 *
 * 채점이 없으므로 진행 막대가 한 칸이고 하단 버튼은 처음부터 켜져 있다.
 */
export function WordPreviewList({
	words,
	onPlay,
}: {
	words: PreviewWord[];
	onPlay?: (word: string) => void;
}) {
	const { t } = useTranslation();
	return (
		<div className="response-area word-preview-list">
			{words.map((w) => (
				<div className="preview-row" key={w.word}>
					<div className="preview-word">{w.word}</div>
					<div className="preview-meaning">{w.meaning}</div>
					<button
						type="button"
						className="preview-audio"
						data-action="audio"
						aria-label={t("activity.audioOf", { word: w.word })}
						onClick={() => onPlay?.(w.word)}
					>
						<IconVolume />
					</button>
				</div>
			))}
		</div>
	);
}
