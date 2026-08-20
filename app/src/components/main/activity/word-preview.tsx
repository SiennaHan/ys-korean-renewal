import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { IconVolume } from "./icons";

export interface PreviewWord {
	word: string;
	meaning: string;
}

/**
 * 낱말 한 줄 — 한국어 · 뜻 · 소리.
 *
 * 낱말 학습 화면은 이 줄을 눌러 펼치고 그 아래에 그림과 녹음을 붙인다.
 * 그래서 목록과 줄을 따로 내보낸다.
 */
export function PreviewRow({
	word,
	meaning,
	on,
	loading,
	onSelect,
	onPlay,
}: {
	word: string;
	meaning: string;
	/** 펼쳐진 줄 */
	on?: boolean;
	/** 소리를 받아 오는 중 */
	loading?: boolean;
	onSelect?: () => void;
	onPlay?: () => void;
}) {
	const { t } = useTranslation();
	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: 아래 소리 버튼이 초점을 받는다
		<div className={`preview-row ${on ? "on" : ""}`} onClick={onSelect}>
			<div className="preview-word">{word}</div>
			<div className="preview-meaning">{meaning}</div>
			<button
				type="button"
				className="preview-audio"
				data-action="audio"
				aria-label={t("activity.audioOf", { word })}
				disabled={loading}
				onClick={(e) => {
					e.stopPropagation();
					onPlay?.();
				}}
			>
				<IconVolume />
			</button>
		</div>
	);
}

/**
 * 어휘 미리보기 — 문제를 풀기 전에 이번 과 낱말을 한 번 훑는 자리.
 *
 * 채점이 없으므로 진행 막대가 한 칸이고 하단 버튼은 처음부터 켜져 있다.
 */
export function WordPreviewList({
	words,
	onPlay,
	children,
}: {
	words: PreviewWord[];
	onPlay?: (word: string) => void;
	/** 줄을 직접 조립할 때 */
	children?: ReactNode;
}) {
	return (
		<div className="response-area word-preview-list">
			{children ??
				words.map((w) => (
					<PreviewRow
						key={w.word}
						word={w.word}
						meaning={w.meaning}
						onPlay={() => onPlay?.(w.word)}
					/>
				))}
		</div>
	);
}
