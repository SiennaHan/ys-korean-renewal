import { Fragment } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { IconClose, IconNext, IconPrev } from "./icons";

/**
 * 활동 화면의 공통 골격 — screens_uiux.html(활동 절) 의 gapFrame·gapAppbar·
 * gapProgress·gapDock·gapPrimary 를 컴포넌트로 옮긴 것이다.
 *
 * 클래스 이름은 목업 그대로 두고 수치는 activity.css 가 쥔다. 여기서
 * Tailwind 유틸리티로 다시 적으면 목업과 눈으로 대조할 수 없게 된다.
 */

/** activity.css 의 모든 규칙이 이 클래스 아래에 있다 */
export function ActivityFrame({
	children,
	className,
	style,
}: {
	children: ReactNode;
	className?: string;
	style?: CSSProperties;
}) {
	return (
		<div
			className={className ? `activity-frame ${className}` : "activity-frame"}
			style={style}
		>
			{children}
		</div>
	);
}

/**
 * 상단 바. 44 / 1fr / 44 그리드라 오른쪽이 비면 가운데 과 이름이 왼쪽으로 밀린다 —
 * 목업이 건너뛰기가 없는 화면에 44px 빈 칸을 두는 이유다.
 */
export function ActivityAppBar({
	lesson,
	onExit,
	onSkip,
}: {
	lesson: string;
	onExit?: () => void;
	onSkip?: () => void;
}) {
	const { t } = useTranslation();
	return (
		<div className="appbar">
			<button
				type="button"
				className="icon-control"
				aria-label={t("player.exit")}
				onClick={onExit}
			>
				<IconClose />
			</button>
			<div className="lesson">{lesson}</div>
			{onSkip ? (
				<button
					type="button"
					className="icon-control"
					data-action="skip"
					aria-label={t("player.skip")}
					onClick={onSkip}
				>
					<IconNext />
				</button>
			) : (
				<span style={{ width: 44 }} />
			)}
		</div>
	);
}

/**
 * 진행 막대. 16칸부터는 칸이 너무 얇아져 눈금을 포기하고
 * 연속 막대 + "n / total" 로 바뀐다 (목업 progressMarkup 의 기준).
 *
 * 한 칸짜리는 아예 그리지 않는다 — 늘 꽉 찬 줄이라 어디쯤인지를 말해 주지 못한다.
 * 어휘 미리보기처럼 문항이 하나뿐인 화면이 그렇다.
 */
export function ActivityProgress({
	current,
	total,
	onJump,
}: {
	current: number;
	total: number;
	/**
	 * 칸을 눌러 그 문항으로 간다. 넘기지 않으면 목업 그대로 장식이다.
	 * 하단에 이전 버튼을 두면 주 버튼이 좁아져 목업과 달라지므로,
	 * 뒤로 가는 길을 여기로 옮겼다.
	 */
	onJump?: (index: number) => void;
}) {
	const { t } = useTranslation();
	const continuous = total >= 16;
	if (total <= 1) return null;
	return (
		<div className={`progress-wrap ${continuous ? "continuous" : "segmented"}`}>
			<div className="progress">
				{Array.from({ length: total }, (_, i) => {
					const bar = (
						<i className={i < current ? "done" : i === current ? "now" : ""} />
					);
					return onJump ? (
						<button
							// biome-ignore lint/suspicious/noArrayIndexKey: 칸은 위치가 곧 정체성이다
							key={i}
							type="button"
							className="seg"
							aria-label={t("player.goToQuestion", { index: i + 1 })}
							aria-current={i === current || undefined}
							onClick={() => onJump(i)}
						>
							{bar}
						</button>
					) : (
						// biome-ignore lint/suspicious/noArrayIndexKey: 칸은 위치가 곧 정체성이다
						<Fragment key={i}>{bar}</Fragment>
					);
				})}
			</div>
			{continuous && (
				<div className="progress-meta">
					{t("player.progress", { current: current + 1, total })}
				</div>
			)}
		</div>
	);
}

/**
 * 본문. scroll-area 만 스크롤하고 피드백 칸은 바닥에 붙어 고정 높이(44)를 차지한다 —
 * 정답 문구가 떠도 레이아웃이 흔들리지 않게 하는 장치다.
 *
 * feedback 을 아예 넘기지 않으면 aria-live 없는 빈 칸이 된다. 로딩·실패처럼
 * 읽어 줄 것이 생기지 않는 화면이 그렇다 (목업 gapFrame 의 기본값).
 */
export function ActivityBody({
	children,
	feedback,
	contentStyle,
	scrollStyle,
}: {
	children: ReactNode;
	feedback?: ReactNode;
	contentStyle?: CSSProperties;
	scrollStyle?: CSSProperties;
}) {
	return (
		<main className="activity-content" style={contentStyle}>
			<div className="scroll-area" style={scrollStyle}>
				{children}
			</div>
			{feedback === undefined ? (
				<div className="feedback-slot" />
			) : (
				<div className="feedback-slot" aria-live="polite">
					{feedback}
				</div>
			)}
		</main>
	);
}

export function ActivityFooter({ children }: { children: ReactNode }) {
	return <div className="footer">{children}</div>;
}

/**
 * 하단 도크 — 가운데 주 조작, 오른쪽에 다음.
 * right 를 넘기지 않으면 오른쪽 칸 자체가 없다(주 조작이 폭을 다 쓴다).
 */
export function Dock({
	children,
	left,
	right,
	mainStyle,
}: {
	children: ReactNode;
	/** 왼쪽 칸. 목업 롤플레잉이 쓰는 자리다 — 오른쪽과 폭을 맞춰 주 조작을 가운데 세운다 */
	left?: { enabled: boolean; onClick?: () => void };
	right?: { enabled: boolean; onClick?: () => void };
	mainStyle?: CSSProperties;
}) {
	const { t } = useTranslation();
	return (
		<div className="dock">
			{left && (
				<button
					type="button"
					className="slot"
					aria-label={t("player.prev")}
					disabled={!left.enabled}
					onClick={left.onClick}
				>
					<IconPrev />
				</button>
			)}
			<div className="main" style={mainStyle}>
				{children}
			</div>
			{right && (
				<button
					type="button"
					className="slot"
					data-action="nextExtra"
					aria-label={t("player.next")}
					disabled={!right.enabled}
					onClick={right.onClick}
				>
					<IconNext />
				</button>
			)}
		</div>
	);
}

/** 꺼진 상태가 기본이다 — 답을 고르기 전에는 눌리지 않는다 */
export function PrimaryButton({
	label,
	on,
	action,
	onClick,
}: {
	label: string;
	on: boolean;
	action?: string;
	onClick?: () => void;
}) {
	return (
		<button
			type="button"
			className={`primary ${on ? "on" : ""}`}
			data-action={on ? action : undefined}
			disabled={!on}
			onClick={onClick}
		>
			{label}
		</button>
	);
}
