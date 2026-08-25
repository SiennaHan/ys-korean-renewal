import { getSeoulPuzzleContent } from "@/api/game-content";
import { getGameProgress, saveGameProgress } from "@/api/game-progress";
import {
	type CompleteSnap,
	SpCompleteView,
	SpEntryView,
	SpMapView,
	SpPuzzleView,
	SpTravelHeader,
} from "@/components/main/game/seoul-puzzle-view";
import { useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect, useRef, useMemo } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
type Screen = "name" | "map" | "entry" | "puzzle" | "complete";
export type NavDir = "forward" | "back";

export interface EntryMessage {
	type: "friend" | "self";
	text: string;
}
export interface Location {
	id: string;
	name: string;
	num: number;
	x: number;
	y: number;
	unit: string;
	desc: string;
	grammar: string[];
	entryMessages: EntryMessage[];
}
export interface Puzzle {
	friendMsg: string;
	friendMsgT: string;
	selfMsg: string | null;
	selfMsgT: string | null;
	friendMsg2: string | null;
	friendMsg2T: string | null;
	hintText: string;
	answer: string[];
	distractors: string[];
	grammar: string;
	tip: string;
}
interface SavedState {
	playerName: string;
	completed: string[];
	totalXp: number;
	currentLoc: string | null;
}

/*
 * 화면들이 공유하는 색 토큰 — seoul-puzzle-view.tsx 의 SpMapView·SpEntryView·
 * SpPuzzleView·SpTravelHeader 가 그대로 가져다 쓴다. 원래 컴포넌트 안의 지역
 * 상수였는데, 화면을 갈라내면서 모듈 스코프로 옮겼다(값은 바뀐 것이 없다).
 */
export const C = {
	navy: "#16213e",
	teal: "#0f9b82",
	tealL: "#e2f5f1",
	red: "#e03e3e",
	redL: "#fdf0f0",
	amber: "#f59e0b",
	amberL: "#fef3c7",
	bg: "#f2f4f7",
	surf: "#ffffff",
	text: "#111827",
	text2: "#6b7280",
	text3: "#adb5c4",
	bdr: "#e5e7eb",
};

/** ux-seoul 안에 늘 심던 keyframes — 화면마다 반복해 심는다(particle-sniper 의
 * game-frame 과 달리 이 CSS 는 앱 전역 스타일시트에 없고 컴포넌트가 인라인으로 낸다). */
export const SP_KEYFRAMES_CSS = `
        @keyframes sp-slideUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sp-slideDown { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sp-fadeUp    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sp-chipBounce{ 0%{transform:scale(1)} 40%{transform:scale(1.15)} 70%{transform:scale(.95)} 100%{transform:scale(1)} }
        @keyframes sp-chipShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes sp-chipPop   { 0%{transform:scale(1)} 50%{transform:scale(1.2)} 100%{transform:scale(1)} }
        @keyframes sp-toastIn   { from{opacity:0;transform:translateX(-50%) translateY(-12px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes sp-confetti  { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(600px) rotate(720deg);opacity:0} }
        @keyframes sp-pinPop    { 0%{transform:scale(1)} 50%{transform:scale(1.4)} 100%{transform:scale(1)} }
        @keyframes sp-streakPop { 0%,100%{transform:scale(1)} 50%{transform:scale(1.25)} }
        .sp-chip-tray { background:#fff; color:#111827; border:1.5px solid #e5e7eb; box-shadow:0 2px 0 #e5e7eb; }
        .sp-chip-tray:active { transform:scale(.94); }
        .sp-chip-tray.used { opacity:.25; pointer-events:none; box-shadow:none; }
        .sp-chip-slot { background:#16213e; color:#fff; border:1.5px solid transparent; }
        .sp-chip-slot:active { transform:scale(.94); }
        .sp-chip-slot.cor { background:#0f9b82; cursor:default; }
        .sp-chip-slot.wrg { background:#fdf0f0; color:#e03e3e; border-color:#f0a8a8; text-decoration:line-through; cursor:default; }
        .sp-loc-card { text-align:left; font:inherit; color:inherit; background:#fff; border-radius:14px; border:1px solid #e5e7eb; padding:14px 16px; display:flex; align-items:center; gap:14px; cursor:pointer; transition:transform .12s, box-shadow .12s; }
        .sp-loc-card:active { transform:scale(.98); }
        .sp-loc-card.locked { opacity:.45; cursor:default; pointer-events:none; }
        .sp-loc-card.done { border-color:#7ecfc3; }
        .sp-loc-card.active { border-color:#f0a8a8; border-width:1.5px; }
      `;

// ── Helpers ──────────────────────────────────────────────────────────────────
const LS_KEY = "seoul-puzzle-v1";
const GAME_NAME = "seoul-puzzle";
const META_STAGE = "_meta";

function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function endsWithBatchim(str: string): boolean {
	if (!str) return false;
	const code = str.charCodeAt(str.length - 1) - 0xac00;
	return code >= 0 && code <= 11171 && code % 28 !== 0;
}

export function resolveToken(token: string, name: string): string {
	if (!name) return token;
	const b = endsWithBatchim(name);
	return token
		.replace(/\[이름\]이에요\./g, b ? `${name}이에요.` : `${name}예요.`)
		.replace(/\[이름\]예요\./g, b ? `${name}예요.` : `${name}이에요.`)
		.replace(/\[이름\]예요\?/g, b ? `${name}예요?` : `${name}이에요?`)
		.replace(/\[이름\]/g, name);
}

export function isUnlocked(
	locations: Location[],
	locId: string,
	completed: Set<string>,
): boolean {
	const idx = locations.findIndex((l) => l.id === locId);
	return idx === 0 || completed.has(locations[idx - 1]?.id);
}

// ── Sound (Web Audio API) ────────────────────────────────────────────────────
let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
	if (!_audioCtx) {
		_audioCtx = new (
			window.AudioContext || (window as any).webkitAudioContext
		)();
	}
	if (_audioCtx.state === "suspended") _audioCtx.resume();
	return _audioCtx;
}
function playNote(
	ctx: AudioContext,
	freq: number,
	start: number,
	dur: number,
	gain: number,
	type: OscillatorType = "sine",
) {
	const osc = ctx.createOscillator();
	const g = ctx.createGain();
	osc.connect(g);
	g.connect(ctx.destination);
	osc.type = type;
	osc.frequency.setValueAtTime(freq, start);
	g.gain.setValueAtTime(gain, start);
	g.gain.exponentialRampToValueAtTime(0.001, start + dur);
	osc.start(start);
	osc.stop(start + dur + 0.01);
}
function playTap() {
	try {
		const c = getAudioCtx();
		playNote(c, 600, c.currentTime, 0.06, 0.15);
	} catch {}
}
function playWrong() {
	try {
		const c = getAudioCtx();
		playNote(c, 260, c.currentTime, 0.18, 0.22, "sawtooth");
	} catch {}
}
function playCorrect() {
	try {
		const c = getAudioCtx();
		const t = c.currentTime;
		playNote(c, 523, t, 0.1, 0.2);
		playNote(c, 659, t + 0.1, 0.12, 0.2);
	} catch {}
}
function playXp() {
	try {
		const c = getAudioCtx();
		const t = c.currentTime;
		[392, 523, 659, 784].forEach((f, i) =>
			playNote(c, f, t + i * 0.07, 0.1, 0.15),
		);
	} catch {}
}
function playComplete() {
	try {
		const c = getAudioCtx();
		const t = c.currentTime;
		[523, 659, 784, 1047].forEach((f, i) =>
			playNote(c, f, t + i * 0.13, i === 3 ? 0.3 : 0.15, 0.25),
		);
	} catch {}
}
function vibrate(p: number | number[]) {
	try {
		if ("vibrate" in navigator) navigator.vibrate(p);
	} catch {}
}

// ── SVG Map Component ─────────────────────────────────────────────────────────
interface MapSvgProps {
	viewBox: string;
	height: number;
	completed: Set<string>;
	currentLoc: string | null;
	onPinTap?: (locId: string) => void;
	riverPath: string;
	showAllLines?: boolean;
	locations: Location[];
}

/* ══════════════════════════
   확정 목업(screens_uiux 의 게임 절 · sp_*)의 지도 좌표
   ──────────────────────────
   목업은 캡처한 SVG 의 핀과 라벨을 런타임에 옮겼다. 앱에서는 옮길 것이 아니라
   처음부터 이 자리에 그린다. 표는 목업 소스에서 그대로 뽑았다.
══════════════════════════ */

/** 전체 지도(viewBox 높이 ≥150)의 핀 자리 */
const PIN_FULL: Record<string, [number, number]> = {
	북한산: [174, 38],
	북촌한옥마을: [190, 75],
	경복궁: [174, 82],
	광장시장: [226, 94],
	DDP: [244, 96],
	명동: [183, 105],
	홍대: [112, 114],
	성수동: [276, 125],
	국립중앙박물관: [184, 145],
	한강공원: [130, 148],
};

/** 전체 지도의 라벨 상자 자리 */
const LABEL_FULL: Record<string, [number, number]> = {
	북한산: [174, 48],
	북촌한옥마을: [222, 63],
	경복궁: [144, 75],
	광장시장: [258, 85],
	DDP: [272, 98],
	명동: [180, 114],
	홍대: [84, 105],
	성수동: [304, 117],
	국립중앙박물관: [218, 137],
	한강공원: [100, 137],
};

/** 좁은 지도(높이 <150)의 핀 자리 */
const PIN_COMPACT: Record<string, [number, number]> = {
	북한산: [174, 20],
	북촌한옥마을: [190, 45],
	경복궁: [174, 52],
	광장시장: [226, 58],
	DDP: [244, 62],
	명동: [183, 68],
	홍대: [112, 74],
	성수동: [276, 79],
	국립중앙박물관: [184, 88],
	한강공원: [130, 91],
};

/** 좁은 지도의 라벨 자리. 없으면 핀 위로 올린다 */
const LABEL_COMPACT: Record<string, [number, number]> = {
	북한산: [160, 30],
	경복궁: [143, 45],
	광장시장: [226, 37],
	명동: [204, 68],
	홍대: [86, 66],
	성수동: [302, 71],
	국립중앙박물관: [222, 83],
};

/**
 * 좁은 지도에서 라벨을 계속 보여 줄 장소.
 * 현재 장소와 완료한 장소는 이 목록과 무관하게 항상 보인다.
 */
const COMPACT_CONTEXT = new Set([
	"북한산",
	"경복궁",
	"광장시장",
	"명동",
	"성수동",
	"국립중앙박물관",
]);

/** 라벨 상자 규격 — 목업과 같은 계산 */
const LABEL_H = 13;
const labelWidth = (name: string) => Math.max(28, name.length * 7 + 10);
const clamp = (v: number, lo: number, hi: number) =>
	Math.max(lo, Math.min(hi, v));

export function MapSvg({
	viewBox,
	height,
	completed,
	currentLoc,
	onPinTap,
	riverPath,
	showAllLines,
	locations,
}: MapSvgProps) {
	// 목업이 쓰던 판정 그대로 — viewBox 높이로 전체/좁은 지도를 가른다
	const [viewX, viewY, viewW, viewH] = viewBox.split(/\s+/).map(Number);
	const isCompact = viewH < 150;
	const pinTable = isCompact ? PIN_COMPACT : PIN_FULL;

	/** 이 장소의 핀 자리. 표에 없으면 데이터의 좌표를 쓴다 */
	const pinOf = (l: Location): [number, number] =>
		pinTable[l.name] ?? [l.x, l.y - 17];

	// Compute route points through completed + active locs
	const routeLocs = locations.filter(
		(l) => completed.has(l.id) || l.id === currentLoc,
	);
	const routePoints =
		routeLocs.length >= 2
			? routeLocs
					.map((l) => {
						const [px, py] = pinOf(l);
						return `${px},${py}`;
					})
					.join(" ")
			: "";

	return (
		/*
		 * aria-hidden 을 붙였다가 되돌렸다. 이 지도는 장식이 아니다 —
		 * 안의 <g> 핀에 onPinTap 이 걸려 **눌린다**. 누를 수 있는 것을 감싸서
		 * 보조기술에서 숨기는 것은 ARIA 안티패턴이고, 지도의 <text> 장소 이름도
		 * 같이 사라진다. noSvgWithoutTitle 을 없애려고 붙였던 것인데 그 대가가
		 * 크다. 대신 재우고 이유를 적는다.
		 *
		 * 핀은 **마우스 전용 중복 경로**다. SVG <g> 는 초점을 못 받으므로 예전에도
		 * 키보드로는 닿지 않았고, 지도 아래 장소 카드가 같은 일을 하는 진짜
		 * <button> 이다(sp_map). 그러니 지금 상태가 접근성 손해는 아니다.
		 * <title> 로 이름을 주는 것이 더 낫지만 그러면 목업 셋을 갈라야 한다 —
		 * 그때 같이 하는 것이 맞다. BLOCKERS §3-b 에 남겼다.
		 */
		// biome-ignore lint/a11y/noSvgWithoutTitle: 이 지도는 장식이 아니다 — 위 주석 참고
		<svg
			viewBox={viewBox}
			xmlns="http://www.w3.org/2000/svg"
			preserveAspectRatio="xMidYMid slice"
			style={{ width: "100%", height: "100%", display: "block" }}
		>
			<rect width="390" height={height} fill="#e4eef6" />
			<ellipse cx="170" cy="26" rx="62" ry="26" fill="#c4d9a8" opacity=".75" />
			<ellipse cx="78" cy="44" rx="38" ry="22" fill="#c4d9a8" opacity=".65" />
			<ellipse cx="320" cy="58" rx="32" ry="18" fill="#c4d9a8" opacity=".55" />
			<ellipse cx="42" cy="190" rx="26" ry="16" fill="#c4d9a8" opacity=".5" />
			<ellipse cx="348" cy="210" rx="30" ry="16" fill="#c4d9a8" opacity=".5" />
			{/* 목업: viewBox 높이가 105 미만이면 강을 16 내린다. <g> 로 감싸지 않고
          transform 을 각 <path> 에 직접 준다 — 목업 마크업 그대로다 */}
			<path
				d={riverPath}
				fill="none"
				stroke="#a0c4e0"
				strokeWidth="18"
				strokeLinecap="round"
				transform={viewH < 105 ? "translate(0 16)" : undefined}
			/>
			<path
				d={riverPath
					.replace(/C/g, "C")
					.replace(/178,/g, "178,")
					.replace(/178 /g, "178 ")}
				fill="none"
				stroke="#bdd8f0"
				strokeWidth="6"
				strokeLinecap="round"
				opacity=".6"
				transform={viewH < 105 ? "translate(0 16)" : undefined}
			/>
			{showAllLines && (
				<>
					<line
						x1="0"
						y1="52"
						x2="390"
						y2="52"
						stroke="#fff"
						strokeWidth="1.2"
						opacity=".45"
					/>
					<line
						x1="0"
						y1="80"
						x2="390"
						y2="80"
						stroke="#fff"
						strokeWidth="2"
						opacity=".65"
					/>
					<line
						x1="0"
						y1="112"
						x2="390"
						y2="112"
						stroke="#fff"
						strokeWidth="3"
						opacity=".8"
					/>
					<line
						x1="0"
						y1="140"
						x2="390"
						y2="140"
						stroke="#fff"
						strokeWidth="1.5"
						opacity=".55"
					/>
					<line
						x1="0"
						y1="196"
						x2="390"
						y2="196"
						stroke="#fff"
						strokeWidth="2"
						opacity=".6"
					/>
					<line
						x1="52"
						y1="0"
						x2="52"
						y2="240"
						stroke="#fff"
						strokeWidth="1.2"
						opacity=".45"
					/>
					<line
						x1="100"
						y1="0"
						x2="100"
						y2="240"
						stroke="#fff"
						strokeWidth="1.8"
						opacity=".6"
					/>
					<line
						x1="148"
						y1="0"
						x2="148"
						y2="240"
						stroke="#fff"
						strokeWidth="1.2"
						opacity=".45"
					/>
					<line
						x1="178"
						y1="0"
						x2="178"
						y2="240"
						stroke="#fff"
						strokeWidth="3"
						opacity=".8"
					/>
					<line
						x1="220"
						y1="0"
						x2="220"
						y2="240"
						stroke="#fff"
						strokeWidth="1.5"
						opacity=".55"
					/>
					<line
						x1="258"
						y1="0"
						x2="258"
						y2="240"
						stroke="#fff"
						strokeWidth="2"
						opacity=".65"
					/>
					<line
						x1="318"
						y1="0"
						x2="318"
						y2="240"
						stroke="#fff"
						strokeWidth="1.5"
						opacity=".5"
					/>
					<rect
						x="104"
						y="84"
						width="70"
						height="24"
						rx="3"
						fill="#d0dce8"
						opacity=".55"
					/>
					<rect
						x="182"
						y="84"
						width="70"
						height="24"
						rx="3"
						fill="#d0dce8"
						opacity=".55"
					/>
					<rect
						x="104"
						y="116"
						width="70"
						height="21"
						rx="3"
						fill="#d0dce8"
						opacity=".5"
					/>
					<rect
						x="182"
						y="116"
						width="70"
						height="21"
						rx="3"
						fill="#d0dce8"
						opacity=".5"
					/>
					<rect
						x="262"
						y="84"
						width="52"
						height="24"
						rx="3"
						fill="#d0dce8"
						opacity=".5"
					/>
					<rect
						x="56"
						y="84"
						width="40"
						height="24"
						rx="3"
						fill="#d0dce8"
						opacity=".5"
					/>
					<ellipse
						cx="128"
						cy="172"
						rx="22"
						ry="8"
						fill="#cce0b4"
						opacity=".85"
					/>
				</>
			)}
			{!showAllLines && (
				<>
					<line
						x1="0"
						y1="52"
						x2="390"
						y2="52"
						stroke="#fff"
						strokeWidth="2"
						opacity=".6"
					/>
					<line
						x1="0"
						y1="80"
						x2="390"
						y2="80"
						stroke="#fff"
						strokeWidth="2.5"
						opacity=".75"
					/>
					<line
						x1="178"
						y1="0"
						x2="178"
						y2={height}
						stroke="#fff"
						strokeWidth="2.5"
						opacity=".75"
					/>
					<line
						x1="258"
						y1="0"
						x2="258"
						y2={height}
						stroke="#fff"
						strokeWidth="1.8"
						opacity=".6"
					/>
				</>
			)}
			{routePoints && (
				<polyline
					points={routePoints}
					fill="none"
					stroke="#0f9b82"
					strokeWidth="2.5"
					strokeDasharray="6,4"
					opacity=".8"
				/>
			)}
			{locations.map((l) => {
				const isDone = completed.has(l.id);
				const isActive = l.id === currentLoc;
				const locked =
					!isDone && !isActive && !isUnlocked(locations, l.id, completed);
				const x = l.x;
				const y = l.y;

				// 통합 핀: 상태에 따라 속성만 변경 (SVG 구조 유지로 전환 시 점프 방지)
				const pinColor = isDone ? "#0f9b82" : isActive ? "#e03e3e" : "#adb5c4";
				const pinR = isDone ? 9 : isActive ? 11 : 7;
				const dotR = isDone ? 3.5 : isActive ? 4.5 : 2.5;
				const textColor = isDone ? "#0a6b58" : isActive ? "#c02020" : "#7a8494";
				const pinOpacity = locked ? 0.35 : !isDone && !isActive ? 0.55 : 1;

				// ── 목업의 배치 계산을 그대로 옮긴 것 ──────────────────────
				const [pinX, pinY] = pinOf(l);
				const width = labelWidth(l.name);
				const target = isCompact
					? (LABEL_COMPACT[l.name] ?? [pinX, pinY - LABEL_H - 10])
					: (LABEL_FULL[l.name] ?? [pinX, pinY - LABEL_H - 10]);
				const centerX = clamp(
					target[0],
					viewX + width / 2 + 3,
					viewX + viewW - width / 2 - 3,
				);
				const topY = clamp(target[1], viewY + 3, viewY + viewH - LABEL_H - 3);
				// 리더선은 핀에서 라벨 상자의 가까운 쪽 변으로 뻗는다
				const leadY1 = pinY + 3;
				const leadY2 = topY + LABEL_H < leadY1 ? topY + LABEL_H + 1 : topY - 1;
				// 좁은 지도에서 현재·완료·context 밖의 라벨을 숨기는 일은 여기서 하지 않는다 —
				// 목업(game__sp_entry·sp_puzzle)은 라벨 마크업을 늘 낸다. 숨기는 것은
				// game.css 624행의 :not(.is-active):not(.is-done):not(.is-context) 규칙이다.

				return (
					// biome-ignore lint/a11y/useKeyWithClickEvents: 지도 아래 장소 카드가 같은 일을 하고 초점을 받는다 — SVG <g> 는 tabIndex 가 브라우저마다 달라 여기서 받지 않는다
					<g
						key={l.id}
						className={[
							"ux-map-place",
							isActive ? "is-active" : "",
							isDone ? "is-done" : "",
							// game.css 605행: .is-locked 는 클릭 가능 여부(locked)가 아니라
							// "아직 활성도 완료도 아님" 을 가리키는 흐림 상태 클래스다 — 목업은
							// 이제 막 열린(첫) 장소에도 이 클래스를 붙인다(opacity·cursor 는
							// locked 로 그대로 가린다. 클래스는 스타일용, locked 는 동작용)
							!isActive && !isDone ? "is-locked" : "",
							isCompact && COMPACT_CONTEXT.has(l.name) ? "is-context" : "",
						]
							.filter(Boolean)
							.join(" ")}
						opacity={pinOpacity}
						style={{
							cursor: onPinTap && !locked ? "pointer" : "default",
							transition: "opacity .4s",
						}}
						onPointerDown={
							onPinTap && !locked ? () => onPinTap(l.id) : undefined
						}
						onClick={
							onPinTap && !locked
								? (e) => {
										if (e.detail === 0) onPinTap(l.id);
									}
								: undefined
						}
					>
						<line
							className="ux-pin-leader"
							x1={pinX}
							y1={leadY1}
							x2={centerX}
							y2={leadY2}
							stroke={pinColor}
							strokeWidth={isActive ? 2 : 1.5}
							style={{ transition: "stroke .4s" }}
						/>
						<circle
							cx={pinX}
							cy={pinY}
							r={pinR}
							fill={pinColor}
							stroke="#fff"
							strokeWidth={isActive ? 2 : 1.8}
							style={{ transition: "r .4s, fill .4s" }}
						/>
						<circle
							cx={pinX}
							cy={pinY}
							r={dotR}
							fill="#fff"
							style={{ transition: "r .4s" }}
						/>
						{isActive && (
							<circle
								cx={pinX}
								cy={pinY}
								r={16}
								fill="none"
								stroke="#e03e3e"
								strokeWidth="1.5"
								opacity=".3"
							>
								<animate
									attributeName="r"
									values="11;19;11"
									dur="2s"
									repeatCount="indefinite"
								/>
								<animate
									attributeName="opacity"
									values=".3;0;.3"
									dur="2s"
									repeatCount="indefinite"
								/>
							</circle>
						)}
						<rect
							className="ux-map-label-bg"
							x={centerX - width / 2}
							y={topY}
							width={width}
							height={LABEL_H}
							rx={5}
							fill="rgba(255,255,255,.95)"
						/>
						<text
							className="ux-map-label"
							x={centerX}
							y={topY + 9.25}
							textAnchor="middle"
							fontSize={7}
							fontWeight={700}
							fill={textColor}
							fontFamily="'Noto Sans KR',sans-serif"
							style={{ transition: "fill .4s" }}
						>
							{l.name}
						</text>
						{onPinTap && !locked && (
							<circle cx={pinX} cy={pinY} r={20} fill="transparent" />
						)}
					</g>
				);
			})}
		</svg>
	);
}

// ── Confetti Component ────────────────────────────────────────────────────────
const CONFETTI_COLORS = [
	"#f59e0b",
	"#0f9b82",
	"#e03e3e",
	"#60a5fa",
	"#a78bfa",
	"#fb923c",
	"#34d399",
	"#f472b6",
];

function Confetti({ show }: { show: boolean }) {
	const particles = useMemo(
		() =>
			Array.from({ length: 40 }, (_, i) => ({
				id: i,
				left: Math.random() * 100,
				size: 6 + Math.random() * 8,
				color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
				delay: Math.random() * 0.6,
				duration: 1.4 + Math.random() * 0.8,
			})),
		[],
	);

	if (!show) return null;
	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: "100%",
				height: "100%",
				pointerEvents: "none",
				zIndex: 9998,
				overflow: "hidden",
			}}
		>
			{particles.map((p) => (
				<div
					key={p.id}
					style={{
						position: "absolute",
						top: -20,
						left: `${p.left}%`,
						width: p.size,
						height: p.size,
						background: p.color,
						borderRadius: 2,
						animation: `sp-confetti ${p.duration}s ${p.delay}s ease-in forwards`,
					}}
				/>
			))}
		</div>
	);
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SeoulPuzzle() {
	const nav = useNavigate();
	const [screen, setScreen] = useState<Screen>("name");

	const frameRef = useRef<HTMLDivElement>(null);
	/*
	 * 화면이 바뀌면 초점을 프레임으로 옮긴다 — SPA 라 아무도 안 옮겨 준다.
	 * 누른 버튼이 사라지면 초점이 <body> 로 떨어져서, 스크린리더는 화면이 바뀐 줄
	 * 모르고 다음 Tab 은 문서 맨 처음으로 간다.
	 * 프레임에 붙이는 것은 목업 대조 때문이다 — tabIndex 는 비교기가 무시하지
	 * 않는데, 게임 캡처의 껍데기(프레임 포함)는 비교 전에 벗겨진다.
	 */
	useEffect(() => {
		frameRef.current?.focus();
	}, [screen]);

	const [navDir, setNavDir] = useState<NavDir>("forward");
	const [playerName, setPlayerName] = useState("");
	const [nameInput, setNameInput] = useState("");
	const [completed, setCompleted] = useState<Set<string>>(new Set());
	const [totalXp, setTotalXp] = useState(0);
	const [currentLoc, setCurrentLoc] = useState<string | null>(null);
	const [puzzleIdx, setPuzzleIdx] = useState(0);
	const [slotWords, setSlotWords] = useState<string[]>([]);
	const [trayUsed, setTrayUsed] = useState<Set<number>>(new Set());
	const [shuffledChips, setShuffledChips] = useState<string[]>([]);
	const [hintsLeft, setHintsLeft] = useState(3);
	const [hintUsed, setHintUsed] = useState(false);
	const [answered, setAnswered] = useState<"correct" | "wrong" | null>(null);
	const [sessionXp, setSessionXp] = useState(0);
	const [sessionCorrect, setSessionCorrect] = useState(0);
	const [sessionHints, setSessionHints] = useState(0);
	const [xpToast, setXpToast] = useState<{ text: string; key: number } | null>(
		null,
	);
	const [grammarOpen, setGrammarOpen] = useState(false);
	const [streak, setStreak] = useState(0);
	const [showConfetti, setShowConfetti] = useState(false);
	const [transVisible, setTransVisible] = useState<Set<number>>(new Set());

	const [locations, setLocations] = useState<Location[]>([]);
	const [puzzlesMap, setPuzzlesMap] = useState<Record<string, Puzzle[]>>({});
	const [contentLoading, setContentLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const content = await getSeoulPuzzleContent();
			if (cancelled) return;
			setLocations(content.locations as Location[]);
			setPuzzlesMap(content.puzzles as Record<string, Puzzle[]>);
			setContentLoading(false);
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	// Saved complete-screen snapshot (avoid stale state issues)
	const [completeSnap, setCompleteSnap] = useState<CompleteSnap | null>(null);

	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// ── Navigation ──
	function navigate(to: Screen, dir: NavDir = "forward") {
		setNavDir(dir);
		setScreen(to);
	}

	// ── Persistence: load on mount (server first, localStorage fallback) ──
	const hydratedRef = useRef(false);
	useEffect(() => {
		let cancelled = false;
		(async () => {
			let loaded: SavedState | null = null;
			try {
				const records = await getGameProgress(GAME_NAME);
				if (records.length) {
					const meta = records.find((r) => r.stage_id === META_STAGE);
					const completedIds = records
						.filter((r) => r.stage_id !== META_STAGE && r.completed_at)
						.map((r) => r.stage_id);
					const xp = records
						.filter((r) => r.stage_id !== META_STAGE)
						.reduce((sum, r) => sum + (r.score ?? 0), 0);
					const extra = (meta?.extra ?? {}) as Partial<SavedState>;
					if (extra.playerName) {
						loaded = {
							playerName: extra.playerName,
							completed: completedIds,
							totalXp: xp,
							currentLoc: extra.currentLoc ?? null,
						};
					}
				}
			} catch {}
			if (!loaded) {
				try {
					const raw = localStorage.getItem(LS_KEY);
					if (raw) loaded = JSON.parse(raw) as SavedState;
				} catch {}
			}
			if (cancelled) return;
			if (loaded?.playerName) {
				setPlayerName(loaded.playerName);
				setNameInput(loaded.playerName);
				setCompleted(new Set(loaded.completed));
				setTotalXp(loaded.totalXp);
				setCurrentLoc(loaded.currentLoc);
				setScreen("map");
			}
			hydratedRef.current = true;
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	// ── Persistence: save on change ──
	const lastCompletedRef = useRef<Set<string>>(new Set());
	// biome-ignore lint/correctness/useExhaustiveDependencies: 이 효과는 "사용자 상태가 바뀌면 저장" 이다 — 방아쇠는 playerName·completed·totalXp·currentLoc 뿐이다. locations·puzzlesMap 은 마운트에 한 번 받는 콘텐츠라 넣어도 새로 저장할 것이 없다(아래 루프가 lastCompletedRef 로 이미 보낸 과를 건너뛴다). 대신 콘텐츠가 도착할 때 META_STAGE 쓰기가 한 번 더 날아간다
	useEffect(() => {
		if (!playerName || !hydratedRef.current) return;
		try {
			localStorage.setItem(
				LS_KEY,
				JSON.stringify({
					playerName,
					completed: [...completed],
					totalXp,
					currentLoc,
				}),
			);
		} catch {}
		saveGameProgress({
			gameName: GAME_NAME,
			stageId: META_STAGE,
			extra: { playerName, currentLoc },
		});
		for (const id of completed) {
			if (lastCompletedRef.current.has(id)) continue;
			const loc = locations.find((l) => l.id === id);
			const stageScore = loc ? (puzzlesMap[id]?.length ?? 0) * 10 : 0;
			saveGameProgress({
				gameName: GAME_NAME,
				stageId: id,
				score: stageScore,
				completed: true,
			});
		}
		lastCompletedRef.current = new Set(completed);
	}, [playerName, completed, totalXp, currentLoc]);

	// ── XP toast auto-dismiss ──
	useEffect(() => {
		if (!xpToast) return;
		if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
		toastTimerRef.current = setTimeout(() => setXpToast(null), 1400);
		return () => {
			if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
		};
	}, [xpToast]);

	// ── Confetti auto-clear ──
	useEffect(() => {
		if (!showConfetti) return;
		if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
		confettiTimerRef.current = setTimeout(() => setShowConfetti(false), 3000);
		return () => {
			if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
		};
	}, [showConfetti]);

	// ── Resolved puzzle (memoized) ──
	const resolvedPuzzle = useMemo(() => {
		if (!currentLoc) return null;
		const raw = puzzlesMap[currentLoc]?.[puzzleIdx];
		if (!raw) return null;
		const rt = (s: string) => resolveToken(s, playerName);
		return {
			...raw,
			friendMsg: rt(raw.friendMsg),
			friendMsg2: raw.friendMsg2 ? rt(raw.friendMsg2) : null,
			selfMsg: raw.selfMsg ? rt(raw.selfMsg) : null,
			hintText: rt(raw.hintText),
			answer: raw.answer.map(rt),
			distractors: raw.distractors.map(rt),
		};
	}, [currentLoc, puzzleIdx, playerName, puzzlesMap]);

	// ── Puzzle loading ──
	function loadPuzzle(i: number) {
		if (!currentLoc) return;
		const raw = puzzlesMap[currentLoc]?.[i];
		if (!raw) return;
		const rt = (s: string) => resolveToken(s, playerName);
		const answer = raw.answer.map(rt);
		const distractors = raw.distractors.map(rt);
		setPuzzleIdx(i);
		setSlotWords([]);
		setTrayUsed(new Set());
		setShuffledChips(shuffle([...answer, ...distractors]));
		setHintUsed(false);
		setAnswered(null);
		setGrammarOpen(false);
		setTransVisible(new Set());
	}

	// ── Scroll to bottom of puzzle area ──
	function scrollBot() {
		setTimeout(() => {
			if (scrollAreaRef.current) {
				scrollAreaRef.current.scrollTo({
					top: scrollAreaRef.current.scrollHeight,
					behavior: "smooth",
				});
			}
		}, 80);
	}

	// ── Tray interaction ──
	function tapTray(index: number) {
		if (answered || trayUsed.has(index)) return;
		playTap();
		vibrate(10);
		setTrayUsed((prev) => new Set([...prev, index]));
		setSlotWords((prev) => [...prev, shuffledChips[index]]);
	}

	function removeSlot(i: number) {
		if (answered) return;
		const word = slotWords[i];
		setSlotWords((prev) => prev.filter((_, idx) => idx !== i));
		// Find the chip in the tray and un-use it
		const chipIdx = shuffledChips.findIndex(
			(c, ci) => c === word && trayUsed.has(ci),
		);
		if (chipIdx >= 0) {
			setTrayUsed((prev) => {
				const s = new Set(prev);
				s.delete(chipIdx);
				return s;
			});
		}
	}

	// ── Check answer ──
	function checkAnswer() {
		if (answered || !resolvedPuzzle) return;
		const ok =
			JSON.stringify(slotWords) === JSON.stringify(resolvedPuzzle.answer);
		setAnswered(ok ? "correct" : "wrong");
		if (ok) {
			playCorrect();
			vibrate([15, 50, 15]);
			const xp = hintUsed ? 10 : 20;
			const newStreak = streak + 1;
			setStreak(newStreak);
			setTotalXp((prev) => prev + xp);
			setSessionXp((prev) => prev + xp);
			setSessionCorrect((prev) => prev + 1);
			const toastText =
				newStreak >= 2 ? `⭐ +${xp} XP! 🔥${newStreak}연속` : `⭐ +${xp} XP!`;
			setXpToast({ text: toastText, key: Date.now() });
			setTimeout(() => playXp(), 200);
		} else {
			playWrong();
			vibrate([30, 20, 30]);
			setStreak(0);
			const xp = 5;
			setTotalXp((prev) => prev + xp);
			setSessionXp((prev) => prev + xp);
			setXpToast({ text: `+${xp} XP`, key: Date.now() });
		}
		setTimeout(() => scrollBot(), 100);
	}

	// ── Hint ──
	function useHint() {
		if (!resolvedPuzzle || hintsLeft <= 0 || answered) return;
		const nextIdx = slotWords.length;
		if (nextIdx >= resolvedPuzzle.answer.length) return;
		const nextWord = resolvedPuzzle.answer[nextIdx];
		const chipIdx = shuffledChips.findIndex(
			(c, ci) => c === nextWord && !trayUsed.has(ci),
		);
		if (chipIdx < 0) return;
		setHintsLeft((prev) => prev - 1);
		setHintUsed(true);
		setSessionHints((prev) => prev + 1);
		setTrayUsed((prev) => new Set([...prev, chipIdx]));
		setSlotWords((prev) => [...prev, nextWord]);
	}

	// ── Next puzzle / finish ──
	function nextPuzzle() {
		if (!currentLoc) return;
		const puzzles = puzzlesMap[currentLoc];
		if (puzzleIdx + 1 < puzzles.length) {
			loadPuzzle(puzzleIdx + 1);
		} else {
			finishLocation();
		}
	}

	function finishLocation() {
		if (!currentLoc) return;
		const loc = locations.find((l) => l.id === currentLoc)!;
		const puzzles = puzzlesMap[currentLoc];
		const grammars = [...new Set(puzzles.map((p) => p.grammar))];
		const nextIdx = locations.findIndex((l) => l.id === currentLoc) + 1;
		const nextLocId = nextIdx < locations.length ? locations[nextIdx].id : null;

		// Capture snapshot for complete screen before state updates
		setCompleteSnap({
			locName: loc.name,
			sx: sessionXp + (answered === "correct" ? (hintUsed ? 10 : 20) : 5),
			sc: sessionCorrect + (answered === "correct" ? 1 : 0),
			sh: sessionHints,
			tx: totalXp,
			puzzleCount: puzzles.length,
			grammars,
		});

		// 상태를 한번에 업데이트하여 핀이 중간 상태로 렌더링되지 않도록 함
		const locToComplete = currentLoc;
		setCompleted((prev) => new Set([...prev, locToComplete]));
		setCurrentLoc(nextLocId);
		setShowConfetti(true);
		playComplete();
		vibrate([50, 100, 50, 100, 100]);
		navigate("complete");
	}

	function retryPuzzle() {
		loadPuzzle(puzzleIdx);
	}

	// ── Complete 화면의 "다시 풀기" — 막 완료한 장소를 다시 연다 ──
	function replayLastCompleted() {
		const justCompleted = locations.find(
			(l) => completed.has(l.id) && l.id !== currentLoc,
		);
		const replayId = justCompleted?.id;
		if (!replayId) return;
		setCurrentLoc(replayId);
		setCompleted((prev) => {
			const s = new Set(prev);
			s.delete(replayId);
			return s;
		});
		setSessionXp(0);
		setSessionCorrect(0);
		setSessionHints(0);
		setHintsLeft(3);
		setStreak(0);
		loadPuzzle(0);
		navigate("puzzle");
	}

	// ── Start location ──
	function startLocation(locId: string) {
		setCurrentLoc(locId);
		setSessionXp(0);
		setSessionCorrect(0);
		setSessionHints(0);
		setHintsLeft(3);
		setStreak(0);
		navigate("entry");
	}

	function startPuzzles() {
		loadPuzzle(0);
		navigate("puzzle");
	}

	// ── Submit name ──
	function submitName() {
		const val = nameInput.trim();
		if (!val) return;
		setPlayerName(val);
		// Set first location as current if new player
		if (completed.size === 0 && !currentLoc) {
			setCurrentLoc(null);
		}
		navigate("map");
	}

	// ── Toggle translation ──
	function toggleTrans(idx: number) {
		setTransVisible((prev) => {
			const s = new Set(prev);
			if (s.has(idx)) s.delete(idx);
			else s.add(idx);
			return s;
		});
	}

	// ── Render helpers ──
	const loc = currentLoc ? locations.find((l) => l.id === currentLoc) : null;

	// ── RENDER ── (C · SP_KEYFRAMES_CSS 는 모듈 스코프로 옮겼다 — 위 import 참고)
	if (contentLoading) {
		return (
			<div
				style={{
					width: "100%",
					maxWidth: 390,
					height: "100%",
					background: C.bg,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					margin: "0 auto",
					fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
					color: C.text2,
				}}
			>
				로딩 중...
			</div>
		);
	}

	// 이관한 게임 CSS 는 화면을 data-screen 으로 가른다
	const screenId =
		screen === "map"
			? "sp_map"
			: screen === "entry"
				? "sp_entry"
				: screen === "complete"
					? "sp_complete"
					: "sp_puzzle";

	return (
		// 목업이 max-width:390 인 div 에 ux-seoul 을 붙였다. .game-frame 은 그 바깥이다.
		// complete 화면은 예외다 — 목업(game__sp_complete)엔 ux-seoul·헤더가 전혀 없다.
		// 장소 하나를 다 끝낸 순간의 독립된 전면 화면이라 그대로 따랐다(particle-sniper 의
		// ps_result 도 같은 이유로 자기 화면의 shell 없이 혼자 선다).
		<div
			ref={frameRef}
			tabIndex={-1}
			aria-label="서울 여행 퍼즐"
			className="game-frame"
			data-screen={screenId}
		>
			{/* XP Toast */}
			{xpToast && (
				<div
					key={xpToast.key}
					style={{
						position: "fixed",
						top: 210,
						left: "50%",
						background: C.navy,
						color: C.amber,
						fontSize: 16,
						fontWeight: 700,
						padding: "10px 22px",
						borderRadius: 24,
						pointerEvents: "none",
						zIndex: 9999,
						whiteSpace: "nowrap",
						animation: "sp-toastIn 0.2s ease forwards",
					}}
				>
					{xpToast.text}
				</div>
			)}

			<Confetti show={showConfetti} />

			{screen === "complete" && completeSnap ? (
				<SpCompleteView
					completeSnap={completeSnap}
					onBackToMap={() => navigate("map", "back")}
					onRetry={replayLastCompleted}
				/>
			) : (
				<div
					className="ux-seoul"
					style={{
						width: "100%",
						maxWidth: 390,
						height: "100%",
						background: C.bg,
						display: "flex",
						flexDirection: "column",
						overflow: "hidden",
						position: "relative",
						margin: "0px auto",
						fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif",
					}}
				>
					{/* CSS Keyframes */}
					<style>{SP_KEYFRAMES_CSS}</style>

					{/* Status Bar */}
					<SpTravelHeader
						totalXp={totalXp}
						onBack={() => nav({ to: "/main/game" })}
					/>

					{/* ── NAME SCREEN (목업 대응 화면 없음 — 건드리지 않는다) ── */}
					{screen === "name" && (
						<div
							style={{
								flex: 1,
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
								background: C.navy,
								animation:
									navDir === "forward"
										? "sp-slideUp .28s ease both"
										: "sp-slideDown .28s ease both",
							}}
						>
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									padding: "40px 32px",
									gap: 28,
									width: "100%",
								}}
							>
								<div style={{ fontSize: 52, lineHeight: 1 }}>🗺️</div>
								<div
									style={{
										color: "#fff",
										fontSize: 24,
										fontWeight: 700,
										textAlign: "center",
										letterSpacing: "-.4px",
										lineHeight: 1.3,
									}}
								>
									서울 여행에
									<br />
									오신 것을 환영해요!
								</div>
								<div
									style={{
										color: "rgba(255,255,255,.5)",
										fontSize: 13.5,
										textAlign: "center",
										lineHeight: 1.55,
										marginTop: -12,
									}}
								>
									한국어로 서울을 여행하며
									<br />
									새로운 표현을 익혀보세요.
								</div>
								<div
									style={{
										width: "100%",
										display: "flex",
										flexDirection: "column",
										gap: 8,
									}}
								>
									<div
										style={{
											color: "rgba(255,255,255,.6)",
											fontSize: 11,
											fontWeight: 600,
											letterSpacing: ".6px",
											textTransform: "uppercase",
										}}
									>
										이름 (Korean or English)
									</div>
									<input
										type="text"
										value={nameInput}
										onChange={(e) => setNameInput(e.target.value)}
										onKeyDown={(e) => e.key === "Enter" && submitName()}
										placeholder="예: 유리, Emily…"
										maxLength={20}
										style={{
											width: "100%",
											background: "rgba(255,255,255,.08)",
											border: "1.5px solid rgba(255,255,255,.15)",
											borderRadius: 14,
											padding: "14px 18px",
											fontSize: 18,
											fontWeight: 600,
											color: "#fff",
											fontFamily: "inherit",
											outline: "none",
											textAlign: "center",
											letterSpacing: ".5px",
											boxSizing: "border-box",
										}}
									/>
								</div>
								<button
									type="button"
									disabled={!nameInput.trim()}
									onPointerDown={submitName}
									onClick={(e) => {
										if (e.detail === 0) submitName();
									}}
									style={{
										width: "100%",
										background: nameInput.trim()
											? C.teal
											: "rgba(15,155,130,.35)",
										color: "#fff",
										fontSize: 16,
										fontWeight: 700,
										border: "none",
										borderRadius: 14,
										padding: 15,
										cursor: nameInput.trim() ? "pointer" : "default",
										fontFamily: "inherit",
										transition: "opacity .15s",
									}}
								>
									서울 여행 시작하기 →
								</button>
								<div
									style={{
										color: "rgba(255,255,255,.35)",
										fontSize: 12,
										textAlign: "center",
									}}
								>
									이름은 게임 내 대화에서 사용됩니다.
								</div>
							</div>
						</div>
					)}

					{/* ── MAP SCREEN ── */}
					{screen === "map" && (
						<SpMapView
							playerName={playerName}
							totalXp={totalXp}
							completed={completed}
							currentLoc={currentLoc}
							locations={locations}
							navDir={navDir}
							onSelectLocation={(locId) => {
								if (
									isUnlocked(locations, locId, completed) ||
									completed.has(locId)
								)
									startLocation(locId);
							}}
						/>
					)}

					{/* ── ENTRY SCREEN ── */}
					{screen === "entry" && loc && (
						<SpEntryView
							loc={loc}
							playerName={playerName}
							completed={completed}
							currentLoc={currentLoc}
							locations={locations}
							grammars={[...new Set(puzzlesMap[loc.id].map((p) => p.grammar))]}
							navDir={navDir}
							onMapBack={() => navigate("map", "back")}
							onStart={startPuzzles}
						/>
					)}

					{/* ── PUZZLE SCREEN ── */}
					{screen === "puzzle" && loc && resolvedPuzzle && (
						<SpPuzzleView
							loc={loc}
							totalXp={totalXp}
							streak={streak}
							puzzleIdx={puzzleIdx}
							totalPuzzles={puzzlesMap[loc.id].length}
							resolvedPuzzle={resolvedPuzzle}
							slotWords={slotWords}
							shuffledChips={shuffledChips}
							trayUsed={trayUsed}
							answered={answered}
							hintsLeft={hintsLeft}
							grammarOpen={grammarOpen}
							transVisible={transVisible}
							completed={completed}
							currentLoc={currentLoc}
							locations={locations}
							navDir={navDir}
							scrollAreaRef={scrollAreaRef}
							onMapBack={() => navigate("entry", "back")}
							onToggleGrammar={() => setGrammarOpen((o) => !o)}
							onToggleTrans={toggleTrans}
							onTapTray={tapTray}
							onRemoveSlot={removeSlot}
							onUseHint={useHint}
							onCheckAnswer={checkAnswer}
							onRetry={retryPuzzle}
							onNext={nextPuzzle}
						/>
					)}
				</div>
			)}
		</div>
	);
}
