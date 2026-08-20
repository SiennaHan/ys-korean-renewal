import type { ReactNode } from "react";

/**
 * 선택지는 두 종류다 (build_spec_uiux §5).
 *  · choice   — 목록형. 한 줄에 하나, 오른쪽 48 은 ✓/✕ 자리
 *  · chip-opt — 칩형. 내용폭. 문법 빈칸처럼 어미만 고를 때
 * 둘은 상태 이름도 다르다. 아래 ChipOption 주석을 보라.
 */

/** 고르면 바로 채점된다. 고르기만 하고 멈추는 중간 상태가 없다 */
export type ChoiceState = "" | "correct" | "wrong";

/**
 * 목록형 선택지.
 *
 * 목업은 **고른 것 하나만** 표시한다 — 틀렸을 때 정답을 같이 밝히지 않는다.
 * 그래서 상태는 선택지마다가 아니라 "내가 고른 것인가"에서 나온다.
 */
export function Choice({
	children,
	sub,
	state = "",
	action = "choice",
	index,
	onClick,
}: {
	children: ReactNode;
	/** 듣기 O/X 처럼 아래 한 줄이 더 붙는 경우 */
	sub?: ReactNode;
	state?: ChoiceState;
	/** 목업이 화면마다 다르게 붙여 둔 값. 읽기만 rpick 이다 */
	action?: string;
	/** 몇 번째 선택지인가. 목업이 붙여 둔 것이고 테스트가 집기에도 좋다 */
	index?: number;
	onClick?: () => void;
}) {
	return (
		<button
			type="button"
			className={`choice ${state}`}
			data-action={action}
			data-index={index}
			onClick={onClick}
		>
			<span>{children}</span>
			{sub !== undefined && <em>{sub}</em>}
			{state !== "" && (
				<span className="choice-mark">{state === "correct" ? "✓" : "✕"}</span>
			)}
		</button>
	);
}

/**
 * 선택지를 담는 칸. 목업이 쓰는 세 배치를 그대로 옮겼다.
 *  · list   — 세로 목록 (어휘 문제 · 읽기)
 *  · binary — 2열, O/X 듣기용. 글자가 23px 로 커지고 아래 설명이 붙는다
 *  · jamo   — 2열, 자모용. 24px 한 글자
 */
export function ChoiceList({
	variant = "list",
	inResponseArea = true,
	children,
}: {
	variant?: "list" | "binary" | "jamo" | "image";
	/**
	 * 보통은 응답 영역이 곧 선택지 목록이다. 읽기처럼 목록 위에 질문이 한 줄
	 * 더 붙는 화면만 false 로 두고 호출한 쪽이 응답 영역을 잡는다.
	 */
	inResponseArea?: boolean;
	children: ReactNode;
}) {
	const inner =
		variant === "binary"
			? "binary-grid listen-choices"
			: variant === "jamo"
				? "jamo-choices"
				: variant === "image"
					? "image-choices"
					: "choice-list";
	return (
		<div className={inResponseArea ? `response-area ${inner}` : inner}>
			{children}
		</div>
	);
}

/**
 * 칩형 선택지의 상태는 목록형과 다르다 — 세 가지이고 이름도 다르다.
 *  · on — 골랐지만 아직 채점 전. 목록형에는 없는 상태다
 *  · ok / no — 채점 결과
 * 문법 빈칸은 고른 어미를 문장에 끼워 보여 준 뒤에 채점하므로 중간 상태가 필요하다.
 */
export type ChipState = "" | "on" | "ok" | "no";

export function ChipOption({
	children,
	state = "",
	value,
	onClick,
}: {
	children: ReactNode;
	state?: ChipState;
	value?: string;
	onClick?: () => void;
}) {
	return (
		<button
			type="button"
			className={`chip-opt ${state}`}
			data-action="gpick"
			data-value={value}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

export function ChipWrap({ children }: { children: ReactNode }) {
	return (
		<div className="response-area">
			<div className="chip-wrap">{children}</div>
		</div>
	);
}
