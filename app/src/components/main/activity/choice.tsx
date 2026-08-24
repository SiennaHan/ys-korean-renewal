import { type ReactNode, useEffect, useState } from "react";

/**
 * 오답 표시를 몇 ms 보여 주고 기본으로 되돌리나.
 *
 * shell_spec_v1 은 650ms 라고 적었는데 2000 으로 늘렸다(2026-08-24 기획 판단) —
 * 650 은 눈으로 좇기에 짧았다. 값 하나만 고치면 되게 여기 둔다.
 *
 * 왜 되돌리나: 명세가 "오답 표시는 순간 상태다. ✕와 빨간 표면은 탭이 처리됐음을
 * 알리는 피드백일 뿐, 소거법을 돕는 기록이 아니다" 라고 정했다. 전에는 틀린 것이
 * 계속 남아 있었다(BLOCKERS §5 의 의도적 이탈) — 그것을 명세 쪽으로 되돌린다.
 * 부모의 기록(wrongIndices 등)은 건드리지 않는다. 표시만 되돌린다.
 */
export const WRONG_VISIBLE_MS = 2000;

/**
 * 오답 표시가 켜질 때 쏘는 신호. 알약(FeedbackMessage)이 이걸 듣고 다시 뜬다.
 *
 * 왜 이벤트인가: 알약을 다시 띄우려면 "또 틀렸다" 를 알아야 하는데, 화면마다
 * 오답 기록의 모양이 다르다(Set · 단일 상태 · Record · boolean[] — 넷). 부모
 * 넷을 다 고치는 대신 선택지가 직접 알린다. 둘은 같은 폴더에 있고 시간값도
 * 공유하므로 결합이 새로 생기지 않는다.
 */
export const WRONG_FLASH_EVENT = "activity:wrong-flash";

/** 진동 길이. CSS 의 choice-shake 와 같아야 한다 */
const SHAKE_MS = 300;

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
	/*
	 * 오답은 순간 상태다. 부모가 계속 "wrong" 을 주더라도 표시는 여기서
	 * WRONG_VISIBLE_MS 뒤에 거둔다. 정답은 다음 문항 전까지 그대로 둔다.
	 *
	 * 진동을 다시 일으키는 방아쇠를 따로 센다. 같은 오답을 또 눌러도
	 * 매번 흔들려야 하는데(명세 §14.2), 부모의 state 는 "wrong" 에 머물러
	 * 있어서 그것만으로는 effect 가 다시 돌지 않는다.
	 */
	const [wrongShown, setWrongShown] = useState(state === "wrong");
	const [shaking, setShaking] = useState(false);
	const [shakeNo, setShakeNo] = useState(state === "wrong" ? 1 : 0);

	// 부모가 오답으로 바꾸면 방아쇠를 당긴다
	useEffect(() => {
		if (state === "wrong") setShakeNo((n) => n + 1);
		else setWrongShown(false);
	}, [state]);

	// 방아쇠가 당겨질 때마다 흔들고, WRONG_VISIBLE_MS 뒤에 표시를 거둔다
	useEffect(() => {
		if (shakeNo === 0) return;
		setWrongShown(true);
		setShaking(true);
		window.dispatchEvent(new Event(WRONG_FLASH_EVENT));
		const off = setTimeout(() => setShaking(false), SHAKE_MS);
		const hide = setTimeout(() => setWrongShown(false), WRONG_VISIBLE_MS);
		return () => {
			clearTimeout(off);
			clearTimeout(hide);
		};
	}, [shakeNo]);

	const shown: ChoiceState =
		state === "wrong" ? (wrongShown ? "wrong" : "") : state;

	return (
		<button
			type="button"
			className={`choice ${shown}${shaking ? " shake" : ""}`}
			data-action={action}
			data-index={index}
			onClick={() => {
				// 이미 오답인 것을 또 누르면 표시가 거둬져 있어도 다시 흔든다
				if (state === "wrong") setShakeNo((n) => n + 1);
				onClick?.();
			}}
		>
			<span>{children}</span>
			{sub !== undefined && <em>{sub}</em>}
			{shown !== "" && (
				<span className="choice-mark">{shown === "correct" ? "✓" : "✕"}</span>
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
