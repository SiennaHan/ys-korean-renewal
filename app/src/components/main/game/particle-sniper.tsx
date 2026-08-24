import {
	getParticleSniperLevels,
	getParticleSniperSentences,
} from "@/api/game-content";
import { getGameProgress, saveGameProgress } from "@/api/game-progress";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

type GameState =
	| "level-select"
	| "lesson-select"
	| "countdown"
	| "playing"
	| "result";
type Verdict = "GOOD" | "GREAT!" | "PERFECT!!" | "MISS" | null;

import {
	ParticleSniperLessonView,
	ParticleSniperLevelView,
	ParticleSniperPlayView,
	ParticleSniperResultView,
} from "@/components/main/game/particle-sniper-view";

interface Question {
	sentence: string;
	blank: string;
	answer: string;
	choices: string[];
	sourceLesson: string;
}

interface LessonEntry {
	new_particles: string[];
	cumulative_particles: string[];
	questions: Question[];
}

type LevelData = Record<string, LessonEntry>;

interface GameStats {
	score: number;
	combo: number;
	maxCombo: number;
	hp: number;
	mistakes: Array<{ sentence: string; correct: string; userAnswer: string }>;
	answered: number;
	correct: number;
}

type LevelMeta = { summary: string; color: string; accent: string };

const QUESTION_DURATION_SECONDS = 12;
// 한 판은 하트 0 · 후보 소진 · MAX 중 먼저 오는 것에서 끝난다.
// 8이면 1급 7과부터 후보가 잘려 나갔다(1급 누적 64문항). 20은 거의 안 자른다.
const GAME_NAME = "particle-sniper";
/** 앞서 정한 규칙 — 게임 안의 단계를 {급}_{과} 로 가른다 */
const stageIdOf = (level: string, lesson: string) => `${level}_${lesson}`;

const MAX_QUESTIONS_PER_GAME = 20;
// 현재 과를 먼저 채우고 나머지를 이전 과로 메운다. 현재 과가 이 수에 못 미치면
// 있는 만큼만 쓰고 이전 과가 더 들어온다 — 한 판은 min(MAX, 누적 후보 수)가 된다.
const CURRENT_LESSON_QUESTION_COUNT = MAX_QUESTIONS_PER_GAME / 2;

const shuffle = <T,>(items: T[]): T[] => {
	const shuffled = [...items];
	for (let i = shuffled.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
};

const sortLessonKeys = (lessons: LevelData): string[] =>
	Object.keys(lessons).sort((a, b) => {
		const aNumber = Number.parseInt(a, 10);
		const bNumber = Number.parseInt(b, 10);
		if (Number.isNaN(aNumber) || Number.isNaN(bNumber))
			return a.localeCompare(b, "ko");
		return aNumber - bNumber;
	});

const buildQuestionSet = (lessons: LevelData, lesson: string): Question[] => {
	const lessonKeys = sortLessonKeys(lessons);
	const lessonIndex = lessonKeys.indexOf(lesson);
	if (lessonIndex < 0) return [];

	const currentQuestions = lessons[lesson]?.questions ?? [];
	const reviewQuestions = lessonKeys
		.slice(0, lessonIndex)
		.flatMap((lessonKey) => lessons[lessonKey]?.questions ?? []);

	const currentLimit =
		reviewQuestions.length > 0
			? CURRENT_LESSON_QUESTION_COUNT
			: MAX_QUESTIONS_PER_GAME;
	const selectedCurrent = shuffle(currentQuestions).slice(0, currentLimit);
	const selectedReview = shuffle(reviewQuestions).slice(
		0,
		MAX_QUESTIONS_PER_GAME - selectedCurrent.length,
	);
	const selected = [...selectedCurrent, ...selectedReview];

	if (selected.length < MAX_QUESTIONS_PER_GAME) {
		const selectedSet = new Set(selected);
		const remaining = shuffle([...currentQuestions, ...reviewQuestions])
			.filter((question) => !selectedSet.has(question))
			.slice(0, MAX_QUESTIONS_PER_GAME - selected.length);
		selected.push(...remaining);
	}

	return shuffle(selected);
};

// ── 컴포넌트 ──────────────────────────────────────────────────────────
const ParticleSniper: React.FC = () => {
	const nav = useNavigate();
	const sound = useSoundEffects();
	const rootRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const animationFrameRef = useRef<number>();
	const timerIntervalRef = useRef<NodeJS.Timeout>();
	const scanlineIntervalRef = useRef<NodeJS.Timeout>();
	const questionResolvedRef = useRef(false);

	const [gameState, setGameState] = useState<GameState>("level-select");
	const [selectedLevel, setSelectedLevel] = useState<string>("");
	const [selectedLesson, setSelectedLesson] = useState<string>("");
	const [countdownValue, setCountdownValue] = useState(3);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [stats, setStats] = useState<GameStats>({
		score: 0,
		combo: 0,
		maxCombo: 0,
		hp: 5,
		mistakes: [],
		answered: 0,
		correct: 0,
	});
	const [timerProgress, setTimerProgress] = useState(100);
	// 과녁에 꽂힌 답과 그 결과. 목업의 ps-blank-value · is-hit · is-miss 가 이 둘로 갈린다.
	// 시간 초과에는 고른 답이 없으므로 picked 는 null 이고 shotResult 만 miss 가 된다.
	const [picked, setPicked] = useState<string | null>(null);
	const [shotResult, setShotResult] = useState<"hit" | "miss" | null>(null);
	const [verdict, setVerdict] = useState<Verdict>(null);
	const [verdictKey, setVerdictKey] = useState(0);
	const [scanlinePos, setScanlinePos] = useState(0);
	const [flashColor, setFlashColor] = useState<"yellow" | "red" | null>(null);
	const [levelMeta, setLevelMeta] = useState<Record<string, LevelMeta>>({});
	const [levelData, setLevelData] = useState<Record<string, LevelData>>({});
	const [contentLoading, setContentLoading] = useState(true);
	// 이 급·과의 최고 점수. 목업 결과 화면에 자리가 있다.
	const [bestScore, setBestScore] = useState<number | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const [meta, sentences] = await Promise.all([
				getParticleSniperLevels(),
				getParticleSniperSentences(),
			]);
			if (cancelled) return;
			setLevelMeta(meta);
			setLevelData(sentences as Record<string, LevelData>);
			setContentLoading(false);
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	// ── Canvas background ──────────────────────────────────────────────
	useEffect(() => {
		const canvas = canvasRef.current;
		const root = rootRef.current;
		if (!canvas || !root) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const getSize = () => ({ w: root.clientWidth, h: root.clientHeight });
		const { w: initW, h: initH } = getSize();
		canvas.width = initW;
		canvas.height = initH;

		const particles = Array.from({ length: 30 }, () => ({
			x: Math.random() * initW,
			y: Math.random() * initH,
			vx: (Math.random() - 0.5) * 0.5,
			vy: (Math.random() - 0.5) * 0.5,
		}));

		const drawFrame = () => {
			ctx.fillStyle = "#060612";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.strokeStyle = "rgba(255,229,0,0.04)";
			ctx.lineWidth = 1;
			const g = 40;
			for (let x = 0; x < canvas.width; x += g) {
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, canvas.height);
				ctx.stroke();
			}
			for (let y = 0; y < canvas.height; y += g) {
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(canvas.width, y);
				ctx.stroke();
			}
			particles.forEach((p) => {
				p.x += p.vx;
				p.y += p.vy;
				if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
				if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
				ctx.fillStyle = "rgba(255,229,0,0.3)";
				ctx.beginPath();
				ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
				ctx.fill();
			});
			animationFrameRef.current = requestAnimationFrame(drawFrame);
		};
		animationFrameRef.current = requestAnimationFrame(drawFrame);
		const onResize = () => {
			const { w, h } = getSize();
			canvas.width = w;
			canvas.height = h;
		};
		window.addEventListener("resize", onResize);
		return () => {
			if (animationFrameRef.current)
				cancelAnimationFrame(animationFrameRef.current);
			window.removeEventListener("resize", onResize);
		};
	}, []);

	// ── Timer ──────────────────────────────────────────────────────────
	useEffect(() => {
		if (gameState !== "playing") return;
		setTimerProgress(100);
		timerIntervalRef.current = setInterval(() => {
			setTimerProgress((prev) => {
				const next = prev - 100 / (QUESTION_DURATION_SECONDS * 10);
				if (next <= 0) {
					if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
					handleTimeOut();
					return 0;
				}
				return next;
			});
		}, 100);
		return () => {
			if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
		};
	}, [gameState, currentQuestionIndex]); // eslint-disable-line

	// ── Scanline ───────────────────────────────────────────────────────
	useEffect(() => {
		if (gameState !== "playing") return;
		scanlineIntervalRef.current = setInterval(
			() => setScanlinePos((p) => (p + 5) % 100),
			50,
		);
		return () => {
			if (scanlineIntervalRef.current)
				clearInterval(scanlineIntervalRef.current);
		};
	}, [gameState]);

	// ── Flash / verdict timeouts ───────────────────────────────────────
	useEffect(() => {
		if (!flashColor) return;
		const t = setTimeout(() => setFlashColor(null), 300);
		return () => clearTimeout(t);
	}, [flashColor, verdictKey]);

	useEffect(() => {
		if (!verdict) return;
		const t = setTimeout(() => setVerdict(null), 1000);
		return () => clearTimeout(t);
	}, [verdict, verdictKey]);

	// ── Countdown ─────────────────────────────────────────────────────
	useEffect(() => {
		if (gameState !== "countdown") return;
		const iv = setInterval(() => {
			setCountdownValue((prev) => {
				if (prev <= 1) {
					setGameState("playing");
					return 3;
				}
				return prev - 1;
			});
		}, 1000);
		return () => clearInterval(iv);
	}, [gameState]);

	// ── Handlers ──────────────────────────────────────────────────────
	const startGame = (level: string, lesson: string) => {
		const lessons = levelData[level];
		if (!lessons) return;

		const questionSet = buildQuestionSet(lessons, lesson);
		if (questionSet.length === 0) return;

		setSelectedLevel(level);
		setSelectedLesson(lesson);
		setQuestions(questionSet);
		setCurrentQuestionIndex(0);
		setStats({
			score: 0,
			combo: 0,
			maxCombo: 0,
			hp: 5,
			mistakes: [],
			answered: 0,
			correct: 0,
		});
		questionResolvedRef.current = false;
		setCountdownValue(3);
		setGameState("countdown");
	};

	const handleTimeOut = () => {
		if (questionResolvedRef.current || gameState !== "playing") return;
		const question = questions[currentQuestionIndex];
		if (!question) return;

		questionResolvedRef.current = true;
		const isGameOver = stats.hp <= 1;
		setStats((prev) => ({
			...prev,
			hp: Math.max(0, prev.hp - 1),
			combo: 0,
			answered: prev.answered + 1,
			mistakes: [
				...prev.mistakes,
				{
					sentence: question.sentence,
					correct: question.answer,
					userAnswer: "선택 안 함",
				},
			],
		}));
		sound.playIncorrect();
		setFlashColor("red");
		setShotResult("miss");
		setVerdict("MISS");
		setVerdictKey((k) => k + 1);
		setTimeout(() => {
			if (isGameOver) setGameState("result");
			else nextQuestion();
		}, 1000);
	};

	const handleAnswer = (choice: string) => {
		if (
			gameState !== "playing" ||
			questionResolvedRef.current ||
			!questions[currentQuestionIndex]
		)
			return;

		questionResolvedRef.current = true;
		if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
		setPicked(choice);
		const q = questions[currentQuestionIndex];
		const isCorrect = choice === q.answer;
		setShotResult(isCorrect ? "hit" : "miss");
		const isGameOver = !isCorrect && stats.hp <= 1;

		let gained = 0;
		let newCombo = 0;

		setStats((prev) => {
			newCombo = isCorrect ? prev.combo + 1 : 0;
			const mult =
				newCombo >= 8 ? 3.0 : newCombo >= 5 ? 2.0 : newCombo >= 3 ? 1.5 : 1.0;
			// ≤2s → 50, 2~4s → linear 50→0, >4s → 0.
			const elapsed = ((100 - timerProgress) * QUESTION_DURATION_SECONDS) / 100;
			const speedBonus =
				elapsed <= 2
					? 50
					: elapsed >= 4
						? 0
						: Math.floor((50 * (4 - elapsed)) / 2);
			gained = isCorrect ? Math.floor((100 + speedBonus) * mult) : 0;

			return {
				...prev,
				score: prev.score + gained,
				combo: newCombo,
				maxCombo: Math.max(prev.maxCombo, newCombo),
				hp: isCorrect ? prev.hp : Math.max(0, prev.hp - 1),
				answered: prev.answered + 1,
				correct: prev.correct + (isCorrect ? 1 : 0),
				mistakes: isCorrect
					? prev.mistakes
					: [
							...prev.mistakes,
							{ sentence: q.sentence, correct: q.answer, userAnswer: choice },
						],
			};
		});

		if (isCorrect) {
			sound.playCorrectWithConfetti();
		} else {
			sound.playIncorrect();
			setVerdict("MISS");
			setVerdictKey((k) => k + 1);
			setFlashColor("red");
		}

		setTimeout(() => {
			if (isGameOver) setGameState("result");
			else nextQuestion();
		}, 800);
	};

	// 판이 끝나면 점수를 보낸다. 서버가 upsert 에서 max() 로 최고 점수를 유지하므로
	// 클라이언트에서 비교할 필요가 없다 — 그냥 보내고 되돌려받은 값을 쓴다.
	const persistScore = async (level: string, lesson: string, score: number) => {
		if (!level || !lesson) return;
		const stageId = stageIdOf(level, lesson);
		await saveGameProgress({
			gameName: GAME_NAME,
			stageId,
			score,
			completed: true,
		});
		const rows = await getGameProgress(GAME_NAME);
		const row = rows.find((r) => r.stage_id === stageId);
		setBestScore(row?.score ?? score);
	};

	// 결과 화면에 들어갈 때 한 번만 보낸다. 세 곳에서 result 로 넘어가므로
	// 각 자리에 넣는 대신 상태 전이를 보고 처리한다.
	useEffect(() => {
		if (gameState !== "result") return;
		void persistScore(selectedLevel, selectedLesson, stats.score);
		// 판 하나에 한 번만 보내야 하므로 gameState 만 본다
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [gameState]);

	const nextQuestion = () => {
		setCurrentQuestionIndex((prev) => {
			if (prev + 1 >= questions.length) {
				setGameState("result");
				return prev;
			}
			questionResolvedRef.current = false;
			setPicked(null);
			setShotResult(null);
			return prev + 1;
		});
	};

	// ── Render: Level Select ───────────────────────────────────────────
	// 목업(ps_level)이 주입하던 클래스를 그대로 심는다 — ux-dark-stage 가 무대,
	// ps-level-* 가 이 화면의 배치, ux-level-card 가 급 카드다.
	const renderLevelSelect = () => (
		<ParticleSniperLevelView
			levelMeta={levelMeta}
			onPick={(level) => {
				setSelectedLevel(level);
				setGameState("lesson-select");
			}}
			onBack={() => nav({ to: "/main/game" })}
		/>
	);

	// ── Render: Lesson Select ──────────────────────────────────────────
	const renderLessonSelect = () => {
		const meta = levelMeta[selectedLevel];
		if (!meta) return null;
		return (
			<ParticleSniperLessonView
				level={selectedLevel}
				meta={meta}
				lessons={levelData[selectedLevel] ?? {}}
				maxPerGame={MAX_QUESTIONS_PER_GAME}
				onPick={(lesson) => startGame(selectedLevel, lesson)}
				onBack={() => setGameState("level-select")}
			/>
		);
	};

	// ── Render: Countdown ─────────────────────────────────────────────
	const renderCountdown = () => (
		<div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
			<div
				className="font-bold text-8xl text-[#FFE500]"
				style={{ fontFamily: "Exo 2, sans-serif" }}
			>
				{countdownValue}
			</div>
		</div>
	);

	// ── Render: Gameplay ───────────────────────────────────────────────
	// ── Render: Gameplay ───────────────────────────────────────────────
	// 확정 목업(screens_uiux 의 게임 절 · ps_play)의 과녁 구조다. 예전 판은 문항이
	// 위에서 아래로 떨어지고 바닥에 GROUND 선이 있었는데, 낙하는 남은 시간을
	// 그리는 한 가지 방법일 뿐이었다. 지금은 ps-timer 가 그 일을 하고,
	// 조준·명중·빗나감이 과녁에서 일어난다.
	const renderGameplay = () => {
		const q = questions[currentQuestionIndex];
		if (!q) return null;
		return (
			<ParticleSniperPlayView
				question={q}
				questionIndex={currentQuestionIndex}
				totalQuestions={questions.length}
				hp={stats.hp}
				combo={stats.combo}
				score={stats.score}
				timerProgress={timerProgress}
				picked={picked}
				shotResult={shotResult}
				onAnswer={handleAnswer}
				onBack={() => setGameState("lesson-select")}
			/>
		);
	};

	// ── Render: Result ─────────────────────────────────────────────────
	// ── Render: Result ─────────────────────────────────────────────────
	// 확정 목업(ps_result)의 구조다. 등급은 목업이 표본으로 박아 두었지만
	// 정확도에서 파생시킨다 — 두 값을 따로 두면 어긋난다.
	const renderResult = () => (
		<ParticleSniperResultView
			level={selectedLevel}
			lesson={selectedLesson}
			score={stats.score}
			best={bestScore}
			correct={stats.correct}
			answered={stats.answered}
			maxCombo={stats.maxCombo}
			mistakes={stats.mistakes}
			onRetry={() => startGame(selectedLevel, selectedLesson)}
			onLesson={() => setGameState("lesson-select")}
			onLevel={() => setGameState("level-select")}
		/>
	);

	// ── Root ───────────────────────────────────────────────────────────
	if (contentLoading) {
		return (
			<div
				ref={rootRef}
				className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#060612] text-white"
			>
				<div style={{ color: "#7878A0", fontFamily: "Pretendard, sans-serif" }}>
					로딩 중...
				</div>
			</div>
		);
	}

	// 이관한 게임 디자인(game.css)은 화면을 data-screen 으로 가른다 —
	// 목업이 body[data-screen] 으로 하던 것을 래퍼로 옮긴 것이다.
	const screenId =
		gameState === "level-select"
			? "ps_level"
			: gameState === "lesson-select"
				? "ps_lesson"
				: gameState === "result"
					? "ps_result"
					: "ps_play";

	return (
		<div
			ref={rootRef}
			// ps-stage 는 목업이 이 루트에 주입하던 클래스다 — 무대의 어두운 배경과
			// 스캔 그라디언트가 여기 걸린다. game-frame 만 붙이면 흰 화면이 된다.
			className="game-frame relative h-full w-full overflow-hidden ps-stage"
			data-screen={screenId}
		>
			<link
				href="https://fonts.googleapis.com/css2?family=Exo+2:wght@700;800;900&display=swap"
				rel="stylesheet"
			/>
			<canvas ref={canvasRef} className="absolute inset-0" />
			{gameState === "level-select" && renderLevelSelect()}
			{gameState === "lesson-select" && renderLessonSelect()}
			{gameState === "countdown" && renderCountdown()}
			{gameState === "playing" && renderGameplay()}
			{gameState === "result" && renderResult()}
		</div>
	);
};

export default ParticleSniper;
