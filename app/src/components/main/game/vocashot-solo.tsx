/**
 * VocaShot 혼자 하기
 *
 * 확정 목업(vocashot_play_uiux.html)의 화면과 규칙을 그대로 옮긴 것이다.
 * 기존 VocaShot 은 선생님이 방을 열고 여럿이 붙는 형태였고, 이건 혼자 하는 판이다.
 *
 * 규칙 — 목업 TUNING 그대로
 *  · 하트 5. 틀리거나 놓치면 하나 잃고, 0 이 되면 끝난다
 *  · 정답 하나에 10점. 속도 보너스는 없다
 *  · 대신 점수가 10점 오를 때마다 낙하가 0.28초 짧아진다(7.8초 → 3.3초 하한)
 *  · 직접 입력은 2.2초를 더 준다
 *  · 틀린 문항은 3문항 뒤에 한 번 더 낸다. 다시 맞혀도 점수는 없다 — 하트를 이미 잃었다
 *  · 한 판은 30문항까지
 */
import { getGameProgress, saveGameProgress } from "@/api/game-progress";
import { VOCA_BANK, type VocaItem } from "@/shared/data/vocashot-bank";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

/** 목업 TUNING — 값을 바꾸면 체감이 달라지므로 한곳에 둔다 */
const TUNING = {
	fallFirstSec: 7.8,
	fallMinSec: 3.3,
	fallStepSec: 0.28,
	hardModeBonusSec: 2.2,
	/** 몇 점마다 낙하가 fallStepSec 만큼 줄어드나 */
	fallStepPoints: 10,
	/** 정답 하나 */
	scoreBase: 10,
	hearts: 5,
	/** 틀린 문항을 몇 문항 뒤에 다시 낼까 */
	retryAfterN: 3,
	/** 한 판 문항 상한 */
	maxQuestions: 30,
} as const;

/** 정답·오답을 보여 주는 시간 */
const FEEDBACK_MS = 900;

const LANGS = [
	{ code: "en", label: "English" },
	{ code: "ja", label: "日本語" },
	{ code: "zh", label: "中文" },
	{ code: "vi", label: "Tiếng Việt" },
] as const;

type Mode = "easy" | "hard";
type View = "start" | "play" | "result";

interface Served {
	q: VocaItem;
	/** 다시 낸 문항인가 */
	retry: boolean;
}

interface Current extends Served {
	dur: number;
	start: number;
	choices: string[];
}

interface Missed {
	w: string;
	m: string;
	got: boolean;
}

const shuffle = <T,>(xs: T[]): T[] => {
	const a = [...xs];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
};

/**
 * 그림이 없는 문항만 걸러내지 않는다 — 목업은 이미지가 준비됐는지로 갈랐지만
 * 앱에는 그림 파일이 없으므로 그림에 기대는 문항을 뺀다.
 */
const poolFor = (level: number) =>
	VOCA_BANK.filter((q) => q.l === level && !q.i);

export default function VocashotSolo() {
	const nav = useNavigate();

	const [view, setView] = useState<View>("start");
	const [level, setLevel] = useState(2);
	const [lang, setLang] = useState<string>("en");
	const [mode, setMode] = useState<Mode>("easy");
	const [best, setBest] = useState<number | null>(null);

	// ── 한 판의 상태 ────────────────────────────────────────────────
	const queueRef = useRef<Served[]>([]);
	const idxRef = useRef(0);
	const servedRef = useRef(0);
	const lockedRef = useRef(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [cur, setCur] = useState<Current | null>(null);
	const [score, setScore] = useState(0);
	const [hearts, setHearts] = useState<number>(TUNING.hearts);
	const [correct, setCorrect] = useState(0);
	const [asked, setAsked] = useState(0);
	const [missed, setMissed] = useState<Map<string, Missed>>(new Map());
	const [feedback, setFeedback] = useState<{
		text: string;
		ok: boolean;
	} | null>(null);
	const [typed, setTyped] = useState("");

	const stageId = `lv${level}`;

	// 최고 점수는 시작 화면과 결과 화면 양쪽에 나온다
	const loadBest = useCallback(async () => {
		const rows = await getGameProgress("vocashot");
		setBest(rows.find((r) => r.stage_id === `lv${level}`)?.score ?? null);
	}, [level]);

	useEffect(() => {
		void loadBest();
	}, [loadBest]);

	const clearTimer = () => {
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = null;
	};

	/** 지금 점수에서 유성이 떨어지는 데 걸리는 시간 */
	const fallSec = useCallback(
		(atScore: number) => {
			const steps = Math.floor(atScore / TUNING.fallStepPoints);
			const s = Math.max(
				TUNING.fallMinSec,
				TUNING.fallFirstSec - TUNING.fallStepSec * steps,
			);
			return mode === "hard" ? s + TUNING.hardModeBonusSec : s;
		},
		[mode],
	);

	const endRun = useCallback(async () => {
		clearTimer();
		setCur(null);
		setView("result");
		await saveGameProgress({
			gameName: "vocashot",
			stageId,
			score,
			completed: true,
		});
		const rows = await getGameProgress("vocashot");
		setBest(rows.find((r) => r.stage_id === stageId)?.score ?? score);
	}, [score, stageId]);

	const serveNext = useCallback(
		(atScore: number, atHearts: number) => {
			clearTimer();
			const capped = servedRef.current >= TUNING.maxQuestions;
			if (
				atHearts <= 0 ||
				capped ||
				idxRef.current >= queueRef.current.length
			) {
				void endRun();
				return;
			}
			const item = queueRef.current[idxRef.current];
			const dur = fallSec(atScore);
			lockedRef.current = false;
			servedRef.current += 1;
			setAsked((n) => n + 1);
			setTyped("");
			setCur({
				...item,
				dur,
				start: performance.now(),
				choices: shuffle([item.q.a, ...shuffle(item.q.w).slice(0, 3)]),
			});
			// 시간이 다 되면 놓친 것으로 친다
			timerRef.current = setTimeout(() => resolveRef.current(null), dur * 1000);
		},
		[endRun, fallSec],
	);

	// resolve 가 serveNext 를 부르고 serveNext 가 resolve 를 걸어야 해서 ref 로 잇는다
	const resolveRef = useRef<(picked: string | null) => void>(() => {});

	const resolve = useCallback(
		(picked: string | null) => {
			if (lockedRef.current || !cur) return;
			lockedRef.current = true;
			clearTimer();

			const right = picked !== null && picked.trim() === cur.q.a;
			let gained = 0;
			let nextScore = score;
			let nextHearts = hearts;

			if (right) {
				setCorrect((n) => n + 1);
				// 다시 낸 문항은 점수를 주지 않는다 — 하트를 이미 잃었다
				if (!cur.retry) gained = TUNING.scoreBase;
				nextScore = score + gained;
				setScore(nextScore);
				if (cur.retry) {
					setMissed((m) => {
						const next = new Map(m);
						const hit = next.get(cur.q.a);
						if (hit) next.set(cur.q.a, { ...hit, got: true });
						return next;
					});
				}
			} else {
				nextHearts = hearts - 1;
				setHearts(nextHearts);
				setMissed((m) => {
					if (m.has(cur.q.a)) return m;
					const next = new Map(m);
					next.set(cur.q.a, {
						w: cur.q.a,
						m: cur.q.m?.[lang] ?? cur.q.m?.en ?? "(그림)",
						got: false,
					});
					return next;
				});
				// 틀린 문항은 한 번만 다시 낸다
				if (!cur.retry) {
					queueRef.current.splice(idxRef.current + 1 + TUNING.retryAfterN, 0, {
						q: cur.q,
						retry: true,
					});
				}
			}

			setFeedback({
				text: right
					? gained
						? `정답 +${gained}`
						: "정답 · 다시 맞힘"
					: picked === null
						? "놓침"
						: "오답",
				ok: right,
			});

			idxRef.current += 1;
			timerRef.current = setTimeout(() => {
				setFeedback(null);
				serveNext(nextScore, nextHearts);
			}, FEEDBACK_MS);
		},
		[cur, hearts, lang, score, serveNext],
	);
	resolveRef.current = resolve;

	const startRun = () => {
		const pool = shuffle(poolFor(level));
		queueRef.current = pool.map((q) => ({ q, retry: false }));
		idxRef.current = 0;
		servedRef.current = 0;
		lockedRef.current = false;
		setScore(0);
		setHearts(TUNING.hearts);
		setCorrect(0);
		setAsked(0);
		setMissed(new Map());
		setFeedback(null);
		setView("play");
		serveNext(0, TUNING.hearts);
	};

	useEffect(() => clearTimer, []);

	// ── 시작 ────────────────────────────────────────────────────────
	if (view === "start") {
		return (
			<div className="vocashot-frame" data-screen="vs_start">
				<div
					className="g-dark"
					style={{ display: "flex", flexDirection: "column", height: "100%" }}
				>
					<div className="g-head">
						<div className="nm">
							<button
								type="button"
								className="back"
								onClick={() => nav({ to: "/main/game" })}
							>
								<i>←</i>
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
									onClick={() => setLevel(n)}
								>
									{n}급
								</button>
							))}
						</div>

						<span className="g-lb">뜻 언어</span>
						<div
							className="lv"
							style={{ gridTemplateColumns: "repeat(4,1fr)" }}
						>
							{LANGS.map((l) => (
								<button
									key={l.code}
									type="button"
									className={l.code === lang ? "on" : ""}
									style={{ fontSize: 12 }}
									onClick={() => setLang(l.code)}
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
								onClick={() => setMode("easy")}
							>
								4개 중 고르기
							</button>
							<button
								type="button"
								className={mode === "hard" ? "on" : ""}
								onClick={() => setMode("hard")}
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
						<button type="button" className="g-go" onClick={startRun}>
							시작하기
						</button>
					</div>
				</div>
			</div>
		);
	}

	// ── 결과 ────────────────────────────────────────────────────────
	if (view === "result") {
		const missedList = [...missed.values()];
		const cleared = hearts > 0;
		return (
			<div className="vocashot-frame" data-screen="vs_result">
				<div
					className="g-dark"
					style={{ display: "flex", flexDirection: "column", height: "100%" }}
				>
					<div className="r-head">
						<div className="nm">
							<div>
								<h1>VocaShot</h1>
								<div className="sub">
									{level}급 · {mode === "easy" ? "4개 중 고르기" : "직접 입력"}
								</div>
							</div>
						</div>
						<div>
							<div className="r-k">BEST</div>
							<div className="r-v">{(best ?? 0).toLocaleString("ko-KR")}</div>
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

						<div className="r-stats">
							<div className="r-stat">
								<div className="r-k">맞힘</div>
								<div className="v">{correct}</div>
							</div>
							<div className="r-stat">
								<div className="r-k">낸 문항</div>
								<div className="v">{asked}</div>
							</div>
							<div className="r-stat">
								<div className="r-k">남은 하트</div>
								<div className="v">{hearts}</div>
							</div>
						</div>

						{missedList.length > 0 && (
							<div className="r-missed">
								<div className="r-k">놓친 단어</div>
								{missedList.map((m) => (
									<div key={m.w} className={`r-miss${m.got ? " got" : ""}`}>
										<b>{m.w}</b>
										<span>{m.m}</span>
									</div>
								))}
							</div>
						)}
					</div>

					<div className="g-dock">
						<button type="button" className="g-go" onClick={startRun}>
							다시 하기
						</button>
						<button
							type="button"
							className="g-sub"
							onClick={() => setView("start")}
						>
							설정 바꾸기
						</button>
					</div>
				</div>
			</div>
		);
	}

	// ── 플레이 ──────────────────────────────────────────────────────
	const meaning = cur ? (cur.q.m?.[lang] ?? cur.q.m?.en ?? "") : "";
	return (
		<div className="vocashot-frame" data-screen="vs_play">
			<div
				className="g-dark"
				style={{ display: "flex", flexDirection: "column", height: "100%" }}
			>
				<div className="p-head">
					<div>
						<h1>VocaShot</h1>
						<div className="sub">
							{level}급 · {mode === "easy" ? "4개 중 고르기" : "직접 입력"} ·{" "}
							{lang} · {asked}
						</div>
					</div>
					<div>
						<div className="hearts">
							{Array.from({ length: TUNING.hearts }, (_, i) => (
								<i key={i} className={i < hearts ? "" : "off"} />
							))}
						</div>
					</div>
				</div>

				<div className="r-k">SCORE</div>
				<div className="r-v">{score.toLocaleString("ko-KR")}</div>

				<div className="sky">
					{cur && (
						<div
							className="meteor"
							// 낙하 시간은 점수에 따라 달라진다 — 목업의 fallSec 그대로
							style={{ animationDuration: `${cur.dur}s` }}
						>
							<div className="meteor-shell">
								<div className="meteor-question">{meaning}</div>
							</div>
						</div>
					)}
					{feedback && (
						<div className={`fb${feedback.ok ? " ok" : ""}`}>
							{feedback.text}
						</div>
					)}
				</div>

				<div className="g-dock">
					{mode === "easy" ? (
						<div className="choices">
							{cur?.choices.map((c) => (
								<button
									key={c}
									type="button"
									className="choice"
									onClick={() => resolve(c)}
								>
									{c}
								</button>
							))}
						</div>
					) : (
						<form
							className="typed"
							onSubmit={(e) => {
								e.preventDefault();
								resolve(typed);
							}}
						>
							<input
								value={typed}
								onChange={(e) => setTyped(e.target.value)}
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
