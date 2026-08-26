/**
 * 활동 화면 아이콘 — screens_SOT.html(활동 절) 의 icons 객체 그대로다.
 *
 * lucide 로 바꾸지 않는다. viewBox·획 두께·끝 처리가 달라지면
 * .icon-control svg { width:24px; height:24px } 안에서 눈에 띄게 다르게 보인다.
 */
const line = {
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 2,
	strokeLinecap: "round",
} as const;

export function IconClose() {
	return (
		<svg viewBox="0 0 24 24" {...line} aria-hidden="true">
			<path d="M6 6l12 12M18 6L6 18" />
		</svg>
	);
}

export function IconNext() {
	return (
		<svg viewBox="0 0 24 24" {...line} aria-hidden="true">
			<path d="M9 6l6 6-6 6" />
		</svg>
	);
}

export function IconPrev() {
	return (
		<svg viewBox="0 0 24 24" {...line} aria-hidden="true">
			<path d="M15 6l-6 6 6 6" />
		</svg>
	);
}

export function IconVolume() {
	return (
		<svg
			viewBox="0 0 24 24"
			{...line}
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M4.75 9.3v5.4c0 .72.58 1.3 1.3 1.3h2.52l3.96 3.13c.82.65 2.02.07 2.02-.97V5.84c0-1.04-1.2-1.62-2.02-.97L8.57 8H6.05c-.72 0-1.3.58-1.3 1.3Z" />
			<path d="M18.15 9.2c.8.72 1.2 1.65 1.2 2.8s-.4 2.08-1.2 2.8" />
		</svg>
	);
}

export function IconSpinner() {
	return (
		<svg className="record-spinner" viewBox="0 0 24 24" aria-hidden="true">
			<circle cx="12" cy="12" r="8" />
		</svg>
	);
}

export function IconMic() {
	return (
		<svg viewBox="0 0 24 24" {...line} aria-hidden="true">
			<rect x="9" y="3" width="6" height="11" rx="3" />
			<path d="M5 11a7 7 0 0014 0M12 18v3" />
		</svg>
	);
}

export function IconStop() {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<rect x="7" y="7" width="10" height="10" rx="2" />
		</svg>
	);
}

export function IconCheck() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2.4}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M5 12l4 4 10-10" />
		</svg>
	);
}

export function IconKeyboard() {
	return (
		<svg viewBox="0 0 24 24" {...line} aria-hidden="true">
			<rect x="2" y="6" width="20" height="12" rx="2" />
			<path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
		</svg>
	);
}

export function IconUp() {
	return (
		<svg viewBox="0 0 24 24" {...line} aria-hidden="true">
			<path d="M6 15l6-6 6 6" />
		</svg>
	);
}

export function IconDown() {
	return (
		<svg viewBox="0 0 24 24" {...line} aria-hidden="true">
			<path d="M6 9l6 6 6-6" />
		</svg>
	);
}

/** 상태 화면(로드 실패)의 54px 아이콘 — 목업 정본 activity__failed */
export function IconRetryLarge() {
	return (
		<svg
			viewBox="0 0 24 24"
			{...line}
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M19 8a7 7 0 10.5 7M19 4v4h-4" />
		</svg>
	);
}

/** 상태 화면(마이크 거부)의 54px 아이콘 — 목업 정본 activity__micdenied */
export function IconMicOffLarge() {
	return (
		<svg
			viewBox="0 0 24 24"
			{...line}
			strokeWidth={1.9}
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<rect x="9" y="3" width="6" height="11" rx="3" />
			<path d="M5 11a7 7 0 0011.8 5.1M12 18v3M4 3l16 18" />
		</svg>
	);
}
