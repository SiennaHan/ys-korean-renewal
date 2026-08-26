/**
 * 내비·홈 아이콘 — screens_SOT.html(홈·목록 절) 의 icons 객체 그대로다.
 *
 * 앞서 쓰던 lucide 로 되돌리지 않는다. 탭 바 아이콘은 22px 안에서
 * 획 두께 하나로 인상이 달라지고, 목업이 고른 모양이 정본이다.
 */
const line = {
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 2,
	strokeLinecap: "round",
	strokeLinejoin: "round",
} as const;

export function IconHome() {
	return (
		<svg viewBox="0 0 24 24" {...line} aria-hidden="true">
			<path d="M3 10l9-7 9 7v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
		</svg>
	);
}

export function IconTextbook() {
	return (
		<svg viewBox="0 0 24 24" {...line} aria-hidden="true">
			<path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
			<path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
		</svg>
	);
}

export function IconGame() {
	return (
		<svg viewBox="0 0 24 24" {...line} aria-hidden="true">
			<path d="M6 11h4M8 9v4M15 12h.01M18 10h.01" />
			<rect x="2" y="6" width="20" height="12" rx="4" />
		</svg>
	);
}

export function IconClip() {
	return (
		<svg viewBox="0 0 24 24" {...line} aria-hidden="true">
			<rect x="2" y="6" width="20" height="14" rx="2" />
			<path d="M4 6l3-4M10 6l3-4M16 6l3-4" />
		</svg>
	);
}

export function IconUser() {
	return (
		<svg viewBox="0 0 24 24" {...line} aria-hidden="true">
			<circle cx="12" cy="8" r="4" />
			<path d="M4 21a8 8 0 0116 0" />
		</svg>
	);
}

/** 오늘 할 일 — 이어서 학습하기 */
export function IconPlay() {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path d="M8 5l11 7-11 7z" />
		</svg>
	);
}

/** 오늘 할 일 — 다시 풀기 */
export function IconRedo() {
	return (
		<svg viewBox="0 0 24 24" {...line} aria-hidden="true">
			<path d="M20 12a8 8 0 11-2.3-5.6M20 4v4h-4" />
		</svg>
	);
}

/** 오늘 할 일 — 아직 시작 전 */
export function IconBook() {
	return (
		<svg viewBox="0 0 24 24" {...line} aria-hidden="true">
			<path d="M4 5a2 2 0 012-2h13v18H6a2 2 0 01-2-2z" />
			<path d="M9 3v18" />
		</svg>
	);
}

export function IconRight() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			aria-hidden="true"
		>
			<path d="M9 6l6 6-6 6" />
		</svg>
	);
}

/** 출석한 날 */
export function IconCheck() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={3}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M5 13l4 4L19 7" />
		</svg>
	);
}
