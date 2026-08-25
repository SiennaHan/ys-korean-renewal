import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Wave } from "./audio";
import { IconVolume } from "./icons";

/**
 * 문제 카드 안(.stimulus)에 들어가는 제시물들.
 *
 * 화면마다 다른 것이 여기고 그 바깥 골격은 다 같다 — 활동을 하나 더 만들 때
 * 손댈 곳이 여기로 좁혀지도록 모아 두었다.
 */

/** 낱말 하나를 크게. 어휘 문제가 한국어를 물을 때 */
export function WordFocus({
	word,
	onPlay,
}: {
	word: string;
	onPlay?: () => void;
}) {
	const { t } = useTranslation();
	return (
		<div className="word-focus">
			<strong>{word}</strong>
			<button
				type="button"
				className="sound-icon"
				data-action="audio"
				aria-label={t("player.playAudio")}
				onClick={onPlay}
			>
				<IconVolume />
			</button>
		</div>
	);
}

/** 뜻을 묻는 반대 방향. 소리가 없으므로 버튼도 없다 */
export function MeaningFocus({ children }: { children: ReactNode }) {
	return <div className="meaning-focus">{children}</div>;
}

/** 빈칸이 뚫린 문장. 고른 어미가 여기 들어가 문장째로 보인다 */
export function BlankCard({ children }: { children: ReactNode }) {
	return <div className="blank-card">{children}</div>;
}

export function Passage({ children }: { children: ReactNode }) {
	return <div className="passage">{children}</div>;
}

/** 지문 아래 실제 질문. 지시문(문제 카드)과 다른 층이다 */
export function QuestionText({ children }: { children: ReactNode }) {
	return <p className="q-text">{children}</p>;
}

/**
 * 들은 문장을 글로 같이 보여 준다.
 * 듣기만으로 못 따라온 학생이 여기서 붙잡을 수 있다.
 */
export function ListenCopy({
	label,
	statement,
}: {
	label: ReactNode;
	statement: ReactNode;
}) {
	return (
		<div className="listen-copy">
			<small>{label}</small>
			<p className="statement">{statement}</p>
		</div>
	);
}

/** 자모를 골라 만든 글자와 그 조합 */
/**
 * 조합 문제에서 **풀어야 할 것**을 담는 칸.
 *
 * 소리는 이 칸에 넣지 않는다 — 듣기는 다른 화면과 같은 `AudioRow` 가 맡고,
 * 이 칸은 "무엇을 만들어야 하나" 만 보여 준다. 둘을 한 줄에 붙여 놨더니
 * 소리 버튼이 다른 화면과 달라 보이고, 풀어야 할 문제가 어느 것인지도
 * 흐려졌다(2026-08-24 기획자 지적).
 *
 * 답은 힌트를 눌렀을 때만 잠깐 보인다. 그래서 이 칸의 기본값은 "?" 다.
 */
export function ComboTarget({
	syllable,
	parts,
	onHint,
	/** 힌트를 누른 직후 잠깐만 true — 그동안 정답이 보인다 */
	hintOn,
}: {
	syllable: string;
	/** "ㄱ + ㅏ" 처럼 */
	parts: string;
	onHint?: () => void;
	hintOn?: boolean;
}) {
	const { t } = useTranslation();
	return (
		<div className="combo-target">
			<span className="combo-target-label">{t("activity.comboTarget")}</span>
			<span className={`combo-left${hintOn ? " is-hint" : ""}`}>
				<strong>{syllable}</strong>
				<span>{parts}</span>
			</span>
			{onHint && (
				<button
					type="button"
					className="combo-hint"
					data-action="hint"
					aria-label={t("activity.hintPeekLabel")}
					onClick={onHint}
				>
					{t("activity.hintPeek")}
				</button>
			)}
		</div>
	);
}

/** 교재 삽화. 읽고 쓰기는 글자 칸에 자리를 내주려 작은 것을 쓴다 */
export function WordPicture({
	word,
	image,
	small,
}: {
	word: string;
	image: string;
	small?: boolean;
}) {
	return (
		<div className={small ? "word-pic sm" : "word-pic"}>
			<img src={image} alt={word} />
		</div>
	);
}

/** 폭을 다 쓰는 소리 막대 */
export function AudioBar({
	label,
	onPlay,
}: {
	label: string;
	onPlay?: () => void;
}) {
	return (
		<button
			type="button"
			className="audio-bar"
			data-action="audio"
			onClick={onPlay}
		>
			<i>
				<IconVolume />
			</i>
			<span>{label}</span>
			<i />
		</button>
	);
}

/**
 * 원본과 내 녹음을 나란히. 둘을 번갈아 들어야 차이가 잡힌다.
 * 내 쪽은 채점 결과에 따라 색이 붙는다.
 */
export function AudioPair({
	source,
	mine,
	onPlaySource,
	onPlayMine,
}: {
	source: string;
	/** 아직 녹음 전이면 "" */
	mine?: "" | "ok" | "no";
	onPlaySource?: () => void;
	onPlayMine?: () => void;
}) {
	const { t } = useTranslation();
	return (
		<div className="audio-pair">
			<button
				type="button"
				className="src"
				data-action="audio"
				onClick={onPlaySource}
			>
				<i>
					<IconVolume />
				</i>
				<span>{source}</span>
				<i />
			</button>
			<button
				type="button"
				className={`mine ${mine ?? ""}`}
				data-action="audio"
				onClick={onPlayMine}
			>
				<i>
					<IconVolume />
				</i>
				<span>{t("activity.myRecording")}</span>
				<i />
			</button>
		</div>
	);
}

/** 입모양 영상 자리 */
export function MouthVideo({ children }: { children: ReactNode }) {
	return <div className="mouth-video">{children}</div>;
}

/** 내 말이 이렇게 들렸다 — 발음 채점 결과 */
export function HeardRow({ heard, ok }: { heard: string; ok: boolean }) {
	const { t } = useTranslation();
	return (
		<div className="response-area">
			<div className={`heard-row ${ok ? "ok" : ""}`}>
				<span>{t("player.heard")}</span>
				<b>{heard}</b>
			</div>
		</div>
	);
}

/**
 * 낱말을 음절로 쪼갠 줄. 하나씩 눌러 쓰기 판을 연다 —
 * 낱말 전체를 한 판에 쓰게 하면 칸이 좁아 획이 뭉갠다.
 */
export function SyllableRow({
	syllables,
	/** 음절마다 지금까지 그린 획 */
	ink,
	onOpen,
}: {
	syllables: string[];
	ink?: (index: number) => string[];
	onOpen?: (index: number) => void;
}) {
	return (
		<div className="syl-row">
			{syllables.map((syllable, i) => {
				const strokes = ink?.(i) ?? [];
				return (
					<button
						type="button"
						key={`${syllable}-${i}`}
						className="syl"
						data-action="openCanvas"
						data-index={i}
						onClick={() => onOpen?.(i)}
					>
						<span>{syllable}</span>
						{strokes.length > 0 && (
							<svg viewBox="0 0 918 918" aria-hidden="true">
								{strokes.map((d) => (
									<path key={d} d={d} />
								))}
							</svg>
						)}
					</button>
				);
			})}
		</div>
	);
}
