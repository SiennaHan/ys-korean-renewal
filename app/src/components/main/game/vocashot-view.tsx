/**
 * VocaShot 혼자 하기 — **표시만** 담당한다. 판을 굴리는 일은 vocashot-solo.tsx 가 한다.
 *
 * 왜 갈랐나 — 목업 대조(scripts/activity-parity.tsx)가 세 화면을 다 검사할 수 있게
 * 하려고. 합쳐져 있으면 정적으로 그릴 때 시작 화면밖에 나오지 않는다.
 * home/view.tsx · game/list-view.tsx 와 같은 꼴이다.
 *
 * 가르면서 플레이·결과 마크업을 **목업에 맞췄다**. 이관한 vocashot.css 에는
 * meteor-art · earth-surface · defense-emitter · p-dock · r-dock · r-empty ·
 * r-again · r-exit · av 규칙이 다 들어와 있는데 컴포넌트가 그리지 않고 있었다 —
 * 운석 그림도 지구도 발사대도 없는 화면이었다. 대조에 넣으면서 드러났다.
 */
import type React from "react";
import { useEffect, useRef, useState } from "react";

export const LANGS = [
	{ code: "en", label: "English" },
	{ code: "ja", label: "日本語" },
	{ code: "zh", label: "中文" },
	{ code: "vi", label: "Tiếng Việt" },
] as const;

export type Mode = "easy" | "hard";

/** 놓친 단어 한 줄 */
export interface Missed {
	w: string;
	m: string;
	/** 다시 냈을 때 맞혔나 */
	got: boolean;
}

export interface StartViewProps {
	/**
	 * 화면이 바뀔 때 초점을 받을 자리. 프레임에 붙인다 —
	 * 목업 캡처는 프레임 안쪽만 담았고 대조가 이 껍데기를 벗기므로,
	 * 여기 붙는 `tabIndex`·`aria-label` 은 대조에 안 보인다.
	 * 만드는 쪽은 `vocashot-solo.tsx` 의 `useScreenFocus(view)` 다.
	 */
	frameRef?: React.Ref<HTMLDivElement>;
	level: number;
	lang: string;
	mode: Mode;
	best: number | null;
	onLevel: (n: number) => void;
	onLang: (code: string) => void;
	onMode: (m: Mode) => void;
	onStart: () => void;
	onBack: () => void;
}

export function VocashotStartView({
	frameRef,
	level,
	lang,
	mode,
	best,
	onLevel,
	onLang,
	onMode,
	onStart,
	onBack,
}: StartViewProps) {
	return (
		<div
			ref={frameRef}
			className="vocashot-frame"
			data-screen="vs_start"
			tabIndex={-1}
			aria-label="VocaShot — 시작"
		>
			<div
				className="g-dark"
				style={{ display: "flex", flexDirection: "column", height: "100%" }}
			>
				<div className="g-head">
					<div className="nm">
						<button type="button" className="back" onClick={() => onBack()}>
							<i>
								{/* 목업이 기준이다 — 글자 화살표가 아니라 svg 다
								    (src/mockups/vocashot__start.html) */}
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									aria-hidden="true"
								>
									<path d="M19 12H5M12 19l-7-7 7-7" />
								</svg>
							</i>
						</button>
						<div>
							<h1>VocaShot</h1>
							<div className="sub">혼자 하기</div>
						</div>
					</div>
				</div>

				<div className="g-body">
					<span className="g-lb">급</span>
					<div className="lv">
						{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
							<button
								key={n}
								type="button"
								className={n === level ? "on" : ""}
								onClick={() => onLevel(n)}
							>
								{n}급
							</button>
						))}
					</div>

					<span className="g-lb">뜻 언어</span>
					<div className="lv" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
						{LANGS.map((l) => (
							<button
								key={l.code}
								type="button"
								className={l.code === lang ? "on" : ""}
								style={{ fontSize: 12 }}
								onClick={() => onLang(l.code)}
							>
								{l.label}
							</button>
						))}
					</div>

					<span className="g-lb">입력 방식</span>
					<div className="seg">
						<button
							type="button"
							className={mode === "easy" ? "on" : ""}
							onClick={() => onMode("easy")}
						>
							4개 중 고르기
						</button>
						<button
							type="button"
							className={mode === "hard" ? "on" : ""}
							onClick={() => onMode("hard")}
						>
							직접 입력
						</button>
					</div>

					<div className={`best${best === null ? " none" : ""}`}>
						<span className="k">{level}급 최고 점수</span>
						<span className="v">
							{best === null
								? "아직 없음"
								: `${best.toLocaleString("ko-KR")}점`}
						</span>
					</div>
				</div>

				<div className="g-dock">
					<button type="button" className="g-go" onClick={onStart}>
						시작하기
					</button>
				</div>
			</div>
		</div>
	);
}

/* ── 플레이 ───────────────────────────────────────────────
 * 마크업은 목업(src/mockups/vocashot__play.html)을 그대로 따른다.
 * 운석 그림 · 지구 · 발사대는 vocashot.css 에 규칙이 있는데 그리지 않고
 * 있었다 — 대조에 넣으면서 드러났고 여기서 채웠다.
 */

/** 운석 그림. 목업의 svg 를 그대로 옮겼다 */
function MeteorArt() {
	return (
		<div className="meteor-art">
			<svg viewBox="0 0 72 72" aria-hidden="true">
				<defs>
					<linearGradient
						id="mt"
						x1="9"
						y1="7"
						x2="45"
						y2="51"
						gradientUnits="userSpaceOnUse"
					>
						<stop stopColor="#fef3c7" />
						<stop offset=".35" stopColor="#fb923c" />
						<stop offset="1" stopColor="#ea580c" stopOpacity="0" />
					</linearGradient>
					<radialGradient
						id="mr"
						cx="0"
						cy="0"
						r="1"
						gradientTransform="translate(39 37) rotate(53) scale(29)"
						gradientUnits="userSpaceOnUse"
					>
						<stop stopColor="#fdba74" />
						<stop offset=".45" stopColor="#c2410c" />
						<stop offset="1" stopColor="#431407" />
					</radialGradient>
				</defs>
				<path
					d="M7 7c15 7 27 12 38 28L32 47C23 31 16 20 7 7Z"
					fill="url(#mt)"
				/>
				<path
					d="M14 3c16 11 26 19 34 34l-7 5C32 27 23 16 14 3Z"
					fill="#fbbf24"
					opacity=".68"
				/>
				<path
					d="M57 34c8 10 5 25-6 32-11 7-26 3-31-9-5-11 1-24 13-28 9-3 18-1 24 5Z"
					fill="url(#mr)"
					stroke="#fdba74"
					strokeWidth="1.4"
				/>
				<ellipse cx="42" cy="44" rx="6" ry="5" fill="#7c2d12" opacity=".68" />
				<ellipse cx="53" cy="53" rx="4" ry="3" fill="#7c2d12" opacity=".7" />
				<ellipse
					cx="34"
					cy="56"
					rx="3.5"
					ry="2.7"
					fill="#ffedd5"
					opacity=".28"
				/>
				<path
					d="M31 34c5-4 11-5 17-2"
					fill="none"
					stroke="#ffedd5"
					strokeWidth="2"
					strokeLinecap="round"
					opacity=".45"
				/>
			</svg>
		</div>
	);
}

/** 지구 표면. 운석이 여기 닿으면 하트를 잃는다 */
function EarthSurface() {
	return (
		<div className="earth-surface" aria-hidden="true">
			<svg viewBox="0 0 390 98" preserveAspectRatio="none" aria-hidden="true">
				<defs>
					<linearGradient
						id="ocean"
						x1="195"
						y1="7"
						x2="195"
						y2="98"
						gradientUnits="userSpaceOnUse"
					>
						<stop stopColor="#0ea5e9" />
						<stop offset=".5" stopColor="#075985" />
						<stop offset="1" stopColor="#082f49" />
					</linearGradient>
					<linearGradient
						id="land"
						x1="90"
						y1="34"
						x2="112"
						y2="84"
						gradientUnits="userSpaceOnUse"
					>
						<stop stopColor="#4ade80" />
						<stop offset="1" stopColor="#15803d" />
					</linearGradient>
				</defs>
				<path d="M-20 103Q195-30 410 103Z" fill="url(#ocean)" />
				<path
					d="M45 70c17-19 34-26 54-29 15-2 31 1 46 8l-9 12-18 3-8 13-21 4-17-8-27-3Zm230-15c20-9 42-9 64 2l13 13-26 8-10-7-26 5-15-21Z"
					fill="url(#land)"
					opacity=".9"
				/>
				<path
					d="M-20 103Q195-30 410 103"
					fill="none"
					stroke="#67e8f9"
					strokeWidth="3"
					opacity=".82"
				/>
				<path
					d="M-20 96Q195-39 410 96"
					fill="none"
					stroke="#38bdf8"
					strokeWidth="8"
					opacity=".13"
				/>
			</svg>
		</div>
	);
}

export interface PlayViewProps {
	/**
	 * 화면이 바뀔 때 초점을 받을 자리. 프레임에 붙인다 —
	 * 목업 캡처는 프레임 안쪽만 담았고 대조가 이 껍데기를 벗기므로,
	 * 여기 붙는 `tabIndex`·`aria-label` 은 대조에 안 보인다.
	 * 만드는 쪽은 `vocashot-solo.tsx` 의 `useScreenFocus(view)` 다.
	 */
	frameRef?: React.Ref<HTMLDivElement>;
	level: number;
	mode: Mode;
	lang: string;
	/** 하트 총수와 남은 수 */
	hearts: number;
	heartsMax: number;
	score: number;
	/** 지금 떨어지는 운석. 없으면 하늘이 빈다 */
	meteor: { meaning: string; dur: number; choices: string[] } | null;
	feedback: { ok: boolean; text: string } | null;
	typed: string;
	onTyped: (v: string) => void;
	onResolve: (answer: string) => void;
}

export function VocashotPlayView({
	frameRef,
	level,
	mode,
	lang,
	hearts,
	heartsMax,
	score,
	meteor,
	feedback,
	typed,
	onTyped,
	onResolve,
}: PlayViewProps) {
	/*
	 * 요격 연출 — 정답을 맞히면 방어선에서 운석까지 광선이 뻗고, 맞은 자리에
	 * 불꽃이 터지고, 운석이 부서진다. 정본(`screens_uiux.html`)의 `playHitEffect()`
	 * 와 같은 계산이다. 광선은 **두 요소의 실제 좌표**를 이어야 해서 그릴 때
	 * 재 봐야 한다 — 화면 폭이나 낙하 위치가 달라도 같은 자리를 잇는다.
	 *
	 * 정본은 DOM 을 직접 만들어 붙이지만, 여기서는 잰 값을 상태로 두고 React 가
	 * 그리게 한다. 렌더러와 다투지 않는 쪽이 낫다.
	 */
	const skyRef = useRef<HTMLDivElement>(null);
	const meteorRef = useRef<HTMLDivElement>(null);
	const emitterRef = useRef<HTMLDivElement>(null);
	const fxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [hitFx, setHitFx] = useState<{
		x: number;
		y: number;
		len: number;
		angle: number;
		tx: number;
		ty: number;
	} | null>(null);

	useEffect(() => {
		if (!feedback?.ok) return;
		const sky = skyRef.current;
		const met = meteorRef.current;
		const emi = emitterRef.current;
		if (!sky || !met || !emi) return;
		const sr = sky.getBoundingClientRect();
		const mr = met.getBoundingClientRect();
		const er = emi.getBoundingClientRect();
		const x = er.left + er.width / 2 - sr.left;
		const y = er.top + 2 - sr.top;
		const tx = mr.left + mr.width / 2 - sr.left;
		const ty = mr.top + mr.height / 2 - sr.top;
		const dx = tx - x;
		const dy = ty - y;
		setHitFx({
			x,
			y,
			len: Math.hypot(dx, dy),
			angle: Math.atan2(dy, dx),
			tx,
			ty,
		});
		/*
		 * 타이머를 ref 에 둔다. 정리 함수에 두면 `feedback` 이 null 로 바뀔 때
		 * React 가 그것을 먼저 부르는데, 되먹임은 900ms 뒤에 지워지고 연출은
		 * 560ms 라 **먼저 끊길 수 있다.** 그러면 불꽃이 안 사라진다.
		 */
		if (fxTimer.current) clearTimeout(fxTimer.current);
		fxTimer.current = setTimeout(() => setHitFx(null), 560);
	}, [feedback]);

	useEffect(
		() => () => {
			if (fxTimer.current) clearTimeout(fxTimer.current);
		},
		[],
	);

	return (
		<div
			ref={frameRef}
			className="vocashot-frame"
			data-screen="vs_play"
			tabIndex={-1}
			aria-label="VocaShot — 문제"
		>
			<div
				className="g-dark"
				style={{ display: "flex", flexDirection: "column", height: "100%" }}
			>
				<div className="p-head">
					<div>
						<h1>VocaShot</h1>
						{/* 목업은 낙하 초를 보여 준다 — 점수가 오르면 짧아지는 값이다 */}
						<div className="sub">
							{level}급 · {mode === "easy" ? "4개 중 고르기" : "직접 입력"} ·{" "}
							{lang} · {meteor ? `${meteor.dur.toFixed(1)}초` : "-"}
						</div>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
						<div className="hearts">
							{Array.from({ length: heartsMax }, (_, i) => (
								<i key={i} className={i < hearts ? "" : "off"} />
							))}
						</div>
						<div style={{ textAlign: "right" }}>
							<div className="r-k">SCORE</div>
							<div className="r-v">{score.toLocaleString("ko-KR")}</div>
						</div>
					</div>
				</div>

				<div className="sky" ref={skyRef}>
					{meteor && (
						<div
							ref={meteorRef}
							className="meteor"
							// 낙하 시간은 점수에 따라 달라진다 — 목업의 fallSec 그대로
							style={{ animationDuration: `${meteor.dur}s` }}
						>
							<div className={`meteor-shell${hitFx ? " destroying" : ""}`}>
								<MeteorArt />
								<div className="meteor-question">
									<div className="txt">{meteor.meaning}</div>
								</div>
							</div>
						</div>
					)}
					<EarthSurface />
					<div
						ref={emitterRef}
						className="defense-emitter"
						aria-hidden="true"
					/>
					{hitFx && (
						<>
							<span
								className="laser-beam"
								style={
									{
										left: hitFx.x,
										top: hitFx.y,
										width: hitFx.len,
										"--laser-angle": `${hitFx.angle}rad`,
									} as React.CSSProperties
								}
							/>
							<span
								className="impact-burst"
								style={{ left: hitFx.tx, top: hitFx.ty }}
							>
								{[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
									<i
										key={deg}
										style={
											{ "--spark-angle": `${deg}deg` } as React.CSSProperties
										}
									/>
								))}
							</span>
						</>
					)}
				</div>

				{/* 목업은 이 자리를 늘 둔다 — 없을 때는 no 로 비운다 */}
				<div className={feedback ? `fb${feedback.ok ? " ok" : ""}` : "fb no"}>
					{feedback?.text ?? ""}
				</div>

				<div className="p-dock">
					{mode === "easy" ? (
						<div className="choices">
							{meteor?.choices.map((c) => (
								<button key={c} type="button" onClick={() => onResolve(c)}>
									{c}
								</button>
							))}
						</div>
					) : (
						<form
							/*
							 * 정본(`phase1/screens_uiux.html`)의 이름은 `typerow` 다.
							 * 전에 `typed` 라고 적어 두었는데 **그 이름의 규칙은 어디에도
							 * 없어서** 직접 입력 칸이 아무것도 안 입고 나왔다.
							 * `.r-row` 와 같은 부류다 — `css-class-check.py` 가 잡았다.
							 */
							className="typerow"
							onSubmit={(e) => {
								e.preventDefault();
								onResolve(typed);
							}}
						>
							<input
								value={typed}
								onChange={(e) => onTyped(e.target.value)}
								placeholder="한국어로 입력"
								autoComplete="off"
							/>
							{/*
							 * 클래스를 안 준다 — `.typerow button` 이 맡는다(정본도 그렇다).
							 * `g-go` 는 4지선다 쪽 전폭 버튼이라 `width:100%` 가 붙어 있어서,
							 * 여기 쓰면 입력 칸을 34px 로 찌그러뜨리고 줄이 넘쳤다.
							 */}
							<button type="submit">쏘기</button>
						</form>
					)}
				</div>
			</div>
		</div>
	);
}

/* ── 결과 ─────────────────────────────────────────────── */

export interface ResultViewProps {
	/** 이번 판이 신기록인가. 정본의 `G.score > prev` 와 같다 */
	isBest: boolean;
	/**
	 * 화면이 바뀔 때 초점을 받을 자리. 프레임에 붙인다 —
	 * 목업 캡처는 프레임 안쪽만 담았고 대조가 이 껍데기를 벗기므로,
	 * 여기 붙는 `tabIndex`·`aria-label` 은 대조에 안 보인다.
	 * 만드는 쪽은 `vocashot-solo.tsx` 의 `useScreenFocus(view)` 다.
	 */
	frameRef?: React.Ref<HTMLDivElement>;
	level: number;
	mode: Mode;
	best: number | null;
	score: number;
	correct: number;
	asked: number;
	hearts: number;
	missed: Missed[];
	onAgain: () => void;
	/** 목업의 "나가기" — 설정(시작) 화면으로 돌아간다 */
	onExit: () => void;
}

export function VocashotResultView({
	isBest,
	frameRef,
	level,
	mode,
	best,
	score,
	correct,
	asked,
	hearts,
	missed,
	onAgain,
	onExit,
}: ResultViewProps) {
	const cleared = hearts > 0;
	return (
		<div
			ref={frameRef}
			className="vocashot-frame"
			data-screen="vs_result"
			tabIndex={-1}
			aria-label="VocaShot — 결과"
		>
			<div
				className="g-dark"
				style={{ display: "flex", flexDirection: "column", height: "100%" }}
			>
				<div className="r-head">
					<div className="nm">
						<span className="av">
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
							>
								<circle cx="12" cy="8" r="4" />
								<path d="M4 21a8 8 0 0116 0" />
							</svg>
						</span>
						<div>
							<h1>VocaShot</h1>
							<div className="sub">
								{level}급 · {mode === "easy" ? "4개 중 고르기" : "직접 입력"}
							</div>
						</div>
					</div>
					<div style={{ textAlign: "right" }}>
						<div className="r-k">BEST</div>
						<div className="r-v" style={{ color: "#fbbf24" }}>
							{(best ?? 0).toLocaleString("ko-KR")}
						</div>
					</div>
				</div>

				<div className="r-body">
					<h2 className={`r-ttl${cleared ? " ok" : ""}`}>
						{cleared ? "완주" : "게임 오버"}
					</h2>
					<p className="r-desc">
						{asked}문항을 하트 {hearts}개 남기고 끝냈습니다.
					</p>

					<div className="r-score">
						<div className="r-k">내 점수</div>
						<p className="big">{score.toLocaleString("ko-KR")}</p>
						{/*
						 * 정본(`phase1/screens_uiux.html`)은 신기록이면 이전 최고 점수
						 * 대신 배지를 띄운다. 이 자리가 비어 있어서 `.r-new` 규칙이
						 * 아무도 안 쓰는 채로 남아 있었다(`pnpm check:css` 가 잡았다).
						 */}
						{isBest ? (
							<span className="r-new">최고 점수 경신</span>
						) : (
							<p className="r-prev">
								최고 점수 {(best ?? 0).toLocaleString("ko-KR")}
							</p>
						)}
					</div>

					{/* 목업은 둘만 둔다 — 남은 하트는 위 r-desc 가 이미 말한다 */}
					<div className="r-stats">
						<div className="r-stat">
							<div className="r-k">맞힘</div>
							<div className="v" style={{ color: "#34d399" }}>
								{correct}
							</div>
						</div>
						<div className="r-stat">
							<div className="r-k">낸 문항</div>
							<div className="v" style={{ color: "#e2e8f0" }}>
								{asked}
							</div>
						</div>
					</div>

					{missed.length > 0 ? (
						/*
						 * 정본은 `phase1/screens_uiux.html` 이다. 전에는 여기를
						 * `r-missed` · `r-miss` · `<b>` 로 적어 두었는데, **그 이름에는
						 * 규칙이 하나도 없어서** 단어와 뜻이 붙어 나왔다
						 * (`녹차green tea다시 맞힘`). 쓸 CSS 는 `.r-wrong` · `.r-row` ·
						 * `.w` · `.m` · `.re` 로 이미 다 이관돼 있었다.
						 * 목업 캡처가 **놓친 단어 없는 상태**만 담아서 대조가 못 봤다.
						 */
						<div className="r-wrong">
							<div className="r-k cap">
								놓친 단어 {missed.length}개 · 다시 맞힘{" "}
								{missed.filter((x) => x.got).length}
							</div>
							{missed.map((m) => (
								<div key={m.w} className={`r-row${m.got ? " got" : ""}`}>
									<span className="w">{m.w}</span>
									<span className="m">{m.m}</span>
									{m.got && <span className="re">다시 맞힘</span>}
								</div>
							))}
						</div>
					) : (
						<div className="r-empty">놓친 단어가 없습니다.</div>
					)}
				</div>

				<div className="r-dock">
					<button type="button" className="r-again" onClick={onAgain}>
						다시 하기
					</button>
					<button type="button" className="r-exit" onClick={onExit}>
						나가기
					</button>
				</div>
			</div>
		</div>
	);
}
