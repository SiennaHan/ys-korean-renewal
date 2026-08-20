import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/**
 * 연습 목록 — 지금 문항 아래에 이 과에서 연습할 낱말이 다 깔린다.
 *
 * 문제를 순서대로만 풀게 하지 않고 아무거나 골라 가게 두는 자리다.
 * 발음·따라 말하기·읽고 쓰기 세 화면이 같은 것을 쓴다.
 */
export function PracticeBrowser({
	tabs,
	current,
	onTab,
	children,
}: {
	/** 묶음 이름. 목업은 1·2·3 처럼 짧은 것을 쓴다 */
	tabs: string[];
	current: string;
	onTab?: (tab: string) => void;
	children: ReactNode;
}) {
	const { t } = useTranslation();
	return (
		<div className="practice-browser">
			<div className="practice-nav">
				<span className="practice-label">{t("activity.practiceList")}</span>
				<div className="jamo-tabs" aria-label={t("activity.practiceSet")}>
					{tabs.map((tab) => (
						<button
							type="button"
							key={tab}
							className={tab === current ? "on" : ""}
							data-action="practiceSet"
							data-value={tab}
							onClick={() => onTab?.(tab)}
						>
							{tab}
						</button>
					))}
				</div>
			</div>
			{children}
		</div>
	);
}

/** 글자만 있는 칸 — 자모 발음 화면. 5열로 깔린다 */
export function WordCards({
	words,
	current,
	done,
	onPick,
}: {
	words: string[];
	current: string;
	/** 이미 해 본 낱말 */
	done: (word: string) => boolean;
	onPick?: (word: string) => void;
}) {
	return (
		<div className="word-cards">
			{words.map((word) => (
				<button
					type="button"
					key={word}
					className={`${word === current ? "on" : ""} ${done(word) ? "done" : ""}`}
					data-action="speakTarget"
					data-value={word}
					onClick={() => onPick?.(word)}
				>
					{word}
					<b />
				</button>
			))}
		</div>
	);
}

export interface ThumbCard {
	word: string;
	/** 교재 삽화 */
	image: string;
	done: boolean;
}

/** 그림이 붙는 칸 — 단어 따라 말하기·읽고 쓰기. 낱말을 그림으로 먼저 잡는다 */
export function ThumbWordCards({
	cards,
	current,
	onPick,
}: {
	cards: ThumbCard[];
	current: string;
	onPick?: (word: string) => void;
}) {
	return (
		<div className="wcards">
			{cards.map((card) => (
				<button
					type="button"
					key={card.word}
					className={`${card.done ? "done" : ""} ${card.word === current ? "on" : ""}`}
					aria-pressed={card.word === current}
					onClick={() => onPick?.(card.word)}
				>
					<span className="status-dot">{card.done ? "✓" : ""}</span>
					<span className="thumb">
						<img src={card.image} alt="" />
					</span>
					<span className="lab">{card.word}</span>
				</button>
			))}
		</div>
	);
}
