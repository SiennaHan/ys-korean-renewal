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
		<div className="vocashot-frame" data-screen="vs_start">
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
	return (
		<div className="vocashot-frame" data-screen="vs_play">
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

				<div className="sky">
					{meteor && (
						<div
							className="meteor"
							// 낙하 시간은 점수에 따라 달라진다 — 목업의 fallSec 그대로
							style={{ animationDuration: `${meteor.dur}s` }}
						>
							<div className="meteor-shell">
								<MeteorArt />
								<div className="meteor-question">
									<div className="txt">{meteor.meaning}</div>
								</div>
							</div>
						</div>
					)}
					<EarthSurface />
					<div className="defense-emitter" aria-hidden="true" />
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
							className="typed"
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
							<button type="submit" className="g-go">
								쏘기
							</button>
						</form>
					)}
				</div>
			</div>
		</div>
	);
}

/* ── 결과 ─────────────────────────────────────────────── */

export interface ResultViewProps {
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
		<div className="vocashot-frame" data-screen="vs_result">
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
						<p className="r-prev">
							최고 점수 {(best ?? 0).toLocaleString("ko-KR")}
						</p>
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
						<div className="r-missed">
							<div className="r-k">놓친 단어</div>
							{missed.map((m) => (
								<div key={m.w} className={`r-miss${m.got ? " got" : ""}`}>
									<b>{m.w}</b>
									<span>{m.m}</span>
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
