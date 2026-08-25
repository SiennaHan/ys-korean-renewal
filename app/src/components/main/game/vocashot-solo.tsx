/**
 * VocaShot 혼자 하기
 *
 * 확정 목업(screens_uiux.html 의 VocaShot 절)의 화면과 규칙을 그대로 옮긴 것이다.
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
import {
	type Missed,
	type Mode,
	VocashotPlayView,
	VocashotResultView,
	VocashotStartView,
} from "@/components/main/game/vocashot-view";
import { VOCA_BANK, type VocaItem } from "@/shared/data/vocashot-bank";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useScreenFocus } from "./use-screen-focus";

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
	/*
	 * 화면이 바뀌면 초점을 새 화면으로 옮긴다. SPA 라 아무도 안 해 주면 초점이
	 * `<body>` 로 떨어져, 스크린리더는 화면이 바뀐 줄 모르고 다음 Tab 은 문서
	 * 맨 처음으로 간다. 붙는 자리는 세 화면이 각자 그리는 `.vocashot-frame` 이다.
	 */
	const frameRef = useScreenFocus(view);
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

	/* clearTimer 는 매 렌더마다 새로 만들어지지만 몸통이 timerRef(ref 객체) 하나만
	   읽고 쓴다 — 클로저에 낡을 값이 없으므로 어느 렌더의 것을 불러도 결과가 같다.
	   그래서 아래 훅 넷은 이것을 의존성에 넣지 않는다. 넣으면 운석 낙하 타이머를
	   쥔 endRun · serveNext · resolve 가 매 렌더 새로 만들어져 문항이 순간이동한다. */
	const clearTimer = () => {
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = null;
	};

	/** 지금 점수에서 운석이 떨어지는 데 걸리는 시간 */
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: clearTimer 는 timerRef 만 읽고 쓴다 — 위 clearTimer 정의 주석 참고
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: clearTimer 는 timerRef 만 읽고 쓴다 — 위 clearTimer 정의 주석 참고
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: clearTimer 는 timerRef 만 읽고 쓴다 — 위 clearTimer 정의 주석 참고
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: 언마운트 전용 정리다 — clearTimer 를 넣으면 렌더마다 타이머를 치워 낙하가 끊긴다. 몸통은 timerRef 만 만진다
	useEffect(() => clearTimer, []);

	// ── 시작 ────────────────────────────────────────────────────────
	if (view === "start") {
		return (
			<VocashotStartView
				frameRef={frameRef}
				level={level}
				lang={lang}
				mode={mode}
				best={best}
				onLevel={setLevel}
				onLang={setLang}
				onMode={setMode}
				onStart={startRun}
				onBack={() => nav({ to: "/main/game" })}
			/>
		);
	}

	if (view === "result") {
		return (
			<VocashotResultView
				frameRef={frameRef}
				level={level}
				mode={mode}
				best={best}
				score={score}
				correct={correct}
				asked={asked}
				hearts={hearts}
				missed={[...missed.values()]}
				onAgain={startRun}
				onExit={() => setView("start")}
			/>
		);
	}

	return (
		<VocashotPlayView
			frameRef={frameRef}
			level={level}
			mode={mode}
			lang={lang}
			hearts={hearts}
			heartsMax={TUNING.hearts}
			score={score}
			meteor={
				cur
					? {
							meaning: cur.q.m?.[lang] ?? cur.q.m?.en ?? "",
							dur: cur.dur,
							choices: cur.choices,
						}
					: null
			}
			feedback={feedback}
			typed={typed}
			onTyped={setTyped}
			onResolve={resolve}
		/>
	);
}
