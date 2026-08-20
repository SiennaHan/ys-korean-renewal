/**
 * 활동 화면 아이콘 — activity_mockups_uiux.html 의 icons 객체 그대로다.
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
		<svg viewBox="0 0 24 24" {...line} aria-hidden="true">
			<path d="M4 9v6h4l5 4V5L8 9H4zM17 9a4 4 0 010 6" />
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
