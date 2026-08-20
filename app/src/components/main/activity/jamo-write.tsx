import { useTranslation } from "react-i18next";

/**
 * 자모 조합과 쓰기.
 *
 * 두 단계로 나뉜다 — 자모를 골라 글자를 만들고(select), 그 글자를 따라 쓴다(trace).
 * 받침이 있는 3단 글자는 고르는 줄이 하나 더 붙을 뿐 구조가 같다.
 */

export type JamoSlot = "consonant" | "vowel" | "final";

/** 자리마다 번호가 붙는다 — 순서가 곧 글자를 만드는 순서다 */
export function JamoSection({
	step,
	slot,
	options,
	picked,
	onPick,
}: {
	/** 01 · 02 · 03 */
	step: number;
	slot: JamoSlot;
	options: string[];
	picked: string;
	onPick?: (jamo: string) => void;
}) {
	const { t } = useTranslation();
	const label =
		slot === "consonant"
			? t("activity.jamoInitial")
			: slot === "vowel"
				? t("activity.jamoMedial")
				: t("activity.jamoFinal");
	return (
		<div className="jamo-section">
			<div className="jamo-label">
				<i>{String(step).padStart(2, "0")}</i>
				<b>{label}</b>
			</div>
			<div className="jamo-grid">
				{options.map((jamo) => (
					<button
						type="button"
						key={jamo}
						className={jamo === picked ? "on" : ""}
						data-action="jamo"
						data-type={slot}
						data-value={jamo}
						onClick={() => onPick?.(jamo)}
					>
						{jamo}
					</button>
				))}
			</div>
		</div>
	);
}

/**
 * 따라 쓰기 판.
 *
 * 밑그림은 배경으로 깔고 학생의 획은 그 위 SVG 로 얹는다 —
 * 되돌리기가 획 단위라 획을 따로 쥐고 있어야 한다.
 */
export function WriteCanvas({
	guide,
	/** 지금까지 그린 획. path 의 d 값이다 */
	strokes,
	judge,
	onDraw,
	onUndo,
	onClear,
}: {
	guide: string;
	strokes?: string[];
	judge?: "" | "correct" | "wrong";
	onDraw?: () => void;
	onUndo?: () => void;
	onClear?: () => void;
}) {
	const { t } = useTranslation();
	return (
		<div className="response-area">
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: 손가락으로 긋는 판이라 키보드로 대신할 수 없다 */}
			<div
				className={`canvas ${judge ?? ""}`}
				data-action="draw"
				aria-label={t("activity.canvasLabel")}
				onPointerDown={onDraw}
			>
				<div className="guide" style={{ backgroundImage: `url('${guide}')` }} />
				{strokes && strokes.length > 0 && (
					<svg className="ink" viewBox="0 0 918 918" aria-hidden="true">
						{strokes.map((d) => (
							<path key={d} d={d} />
						))}
					</svg>
				)}
			</div>
			<div className="tools">
				<button
					type="button"
					className="tool"
					data-action="undo"
					onClick={onUndo}
				>
					{t("player.undo")}
				</button>
				<button
					type="button"
					className="tool"
					data-action="clear"
					onClick={onClear}
				>
					{t("player.eraseAll")}
				</button>
			</div>
		</div>
	);
}
