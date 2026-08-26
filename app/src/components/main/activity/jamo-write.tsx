import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AudioRow } from "./audio";
import { ProblemCard } from "./problem-card";
import {
	ActivityAppBar,
	ActivityBody,
	ActivityFooter,
	ActivityFrame,
	ActivityProgress,
	Dock,
	PrimaryButton,
} from "./shell";
import { ComboTarget } from "./stimulus";

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
 * 따라 쓰기 판 **하나만**. 목업의 정적 판이다.
 *
 * `JamoTraceView` 가 이 자리를 슬롯으로 받는데, 제품은 여기에 진짜
 * `HangulTracingCanvas` 를 넣고 대조는 이 정적 판을 넣는다.
 */
export function WriteCanvasPane({
	guide,
	strokes,
	judge,
	onDraw,
}: {
	guide: string;
	strokes?: string[];
	judge?: "" | "correct" | "wrong";
	onDraw?: () => void;
}) {
	const { t } = useTranslation();
	return (
		// 손가락으로 긋는 판이라 키보드로 대신할 수 없다
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
			<WriteCanvasPane
				guide={guide}
				strokes={strokes}
				judge={judge}
				onDraw={onDraw}
			/>
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

/**
 * 자모 조합 — 고르는 단계의 골격. 목업 activity__write · write3 자리다.
 *
 * `sections` 가 둘이면 2단(자음+모음), 셋이면 3단(받침까지)이다.
 */
export function JamoCombineSelectView({
	lesson,
	onExit,
	onSkip,
	current,
	total,
	onJump,
	instruction,
	audioLabel,
	audioSub,
	onPlay,
	target,
	sections,
	primary,
	after,
}: {
	lesson: string;
	onExit?: () => void;
	onSkip?: () => void;
	current: number;
	total: number;
	onJump?: (index: number) => void;
	instruction: ReactNode;
	audioLabel: string;
	audioSub: string;
	onPlay?: () => void;
	target: {
		syllable: string;
		parts: string;
		onHint?: () => void;
		hintOn?: boolean;
	};
	sections: {
		step: number;
		slot: "consonant" | "vowel" | "final";
		options: string[];
		picked: string;
		onPick?: (value: string) => void;
	}[];
	primary: {
		label: string;
		on: boolean;
		action?: string;
		onClick?: () => void;
	};
	after?: ReactNode;
}) {
	return (
		<ActivityFrame>
			{/* 건너뛰기 — 목업 모든 활동 화면에 있는데 실제 자모 화면엔 없었다 */}
			<ActivityAppBar lesson={lesson} onExit={onExit} onSkip={onSkip} />
			<ActivityProgress current={current} total={total} onJump={onJump} />

			{/* 목업이 이 칸에 aria-live 를 단다 — 읽어 줄 것이 생기는 화면이다 */}
			<ActivityBody feedback={null}>
				<ProblemCard instruction={instruction}>
					<AudioRow label={audioLabel} sub={audioSub} onPlay={onPlay} />
					<ComboTarget
						syllable={target.syllable}
						parts={target.parts}
						onHint={target.onHint}
						hintOn={target.hintOn}
					/>
				</ProblemCard>
				{sections.map((s) => (
					<JamoSection
						key={s.slot}
						step={s.step}
						slot={s.slot}
						options={s.options}
						picked={s.picked}
						onPick={s.onPick}
					/>
				))}
			</ActivityBody>

			<ActivityFooter>
				<Dock>
					<PrimaryButton
						label={primary.label}
						on={primary.on}
						action={primary.action ?? "next"}
						onClick={primary.onClick}
					/>
				</Dock>
			</ActivityFooter>
			{after}
		</ActivityFrame>
	);
}

/**
 * 자모 조합 — 따라 쓰는 단계의 골격. 목업 activity__write_canvas · write3_canvas 자리다.
 *
 * **판 자체는 대조하지 않는다.** 목업은 안내 그림을 깐 정적 `.canvas` 이고 제품은
 * 획을 판정하는 진짜 `HangulTracingCanvas` 라, 안쪽 마크업이 같아질 수 없다
 * (fa3000c — ".canvas-host only gives it the mockup's frame"). 그래서 판을 슬롯으로
 * 받고 **그 바깥(상단 바·진행바·지시문·도구·하단)은 전부 대조**한다.
 */
export function JamoTraceView({
	lesson,
	onExit,
	onSkip,
	current,
	total,
	onJump,
	instruction,
	canvas,
	onUndo,
	onClear,
	toolsDisabled,
	primary,
	after,
}: {
	lesson: string;
	onExit?: () => void;
	onSkip?: () => void;
	current: number;
	total: number;
	onJump?: (index: number) => void;
	instruction: ReactNode;
	canvas: ReactNode;
	onUndo?: () => void;
	onClear?: () => void;
	toolsDisabled?: boolean;
	primary: {
		label: string;
		on: boolean;
		action?: string;
		onClick?: () => void;
	};
	after?: ReactNode;
}) {
	const { t } = useTranslation();
	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={onExit} onSkip={onSkip} />
			<ActivityProgress current={current} total={total} onJump={onJump} />

			<ActivityBody feedback={null}>
				<ProblemCard instruction={instruction} />
				<div className="response-area">
					{canvas}
					<div className="tools">
						<button
							type="button"
							className="tool"
							data-action="undo"
							onClick={onUndo}
							disabled={toolsDisabled}
						>
							{t("player.undo")}
						</button>
						<button
							type="button"
							className="tool"
							data-action="clear"
							onClick={onClear}
							disabled={toolsDisabled}
						>
							{t("player.eraseAll")}
						</button>
					</div>
				</div>
			</ActivityBody>

			<ActivityFooter>
				<Dock>
					<PrimaryButton
						label={primary.label}
						on={primary.on}
						action={primary.action ?? "next"}
						onClick={primary.onClick}
					/>
				</Dock>
			</ActivityFooter>
			{after}
		</ActivityFrame>
	);
}
