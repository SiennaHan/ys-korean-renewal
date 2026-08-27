/**
 * 어휘 카드 마스터 — TCG 테마 어휘 분류 타임어택 게임
 * 급/과별 레벨 선택 → 카드 등장 → 덱 슬롯 탭으로 분류
 */

import {
	type CardSortRare,
	type CardSortVocab,
	getCardSortCategories,
	getCardSortRare,
	getCardSortVocab,
} from "@/api/game-content";
import { getGameProgress, saveGameProgress } from "@/api/game-progress";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import {
	type CardSortCard,
	CardSortIntroView,
	CardSortLevelView,
	CardSortPlayView,
	CardSortResultView,
	type Grade,
	getCumulativeCategories,
} from "@/components/main/game/card-sort-view";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useScreenFocus } from "./use-screen-focus";

// ─── 타입 ──────────────────────────────────────────────
type GameState = "level-select" | "intro" | "playing" | "result";
type Card = CardSortCard;

interface GameStats {
	score: number;
	combo: number;
	maxCombo: number;
	hp: number;
	correct: number;
	total: number;
	rareCorrect: number;
	rareTotal: number;
}

// ─── 데이터 유틸 ────────────────────────────────────────
// getCumulativeCategories 는 card-sort-view.tsx 로 옮겼다 — 레벨 선택의
// 미리보기와 여기 덱 구성이 같은 기준(4단어 이상)을 써야 하므로 한 곳에만 둔다.

function buildDeck(
	vocab: CardSortVocab,
	rareWords: Set<string>,
	grade: Grade,
	upToLesson: number,
	categories: string[],
): Card[] {
	const gradeData = vocab[grade];
	const deck: Card[] = [];
	if (!gradeData) return deck;
	for (let i = 1; i <= upToLesson; i++) {
		const lessonKey = `${i}과`;
		const lesson = gradeData[lessonKey];
		if (!lesson) continue;
		for (const catName of lesson.new_categories) {
			if (!categories.includes(catName)) continue;
			const words = lesson[catName] as string[] | undefined;
			if (!words) continue;
			for (const word of words) {
				deck.push({
					word,
					category: catName,
					grade,
					lesson: lessonKey,
					isRare: rareWords.has(word),
				});
			}
		}
	}
	return deck.sort(() => Math.random() - 0.5);
}

function pickCategories(allCategories: Record<string, string[]>): string[] {
	const keys = Object.keys(allCategories);
	if (keys.length <= 4) return keys;
	const shuffled = keys.sort(() => Math.random() - 0.5);
	return shuffled.slice(0, 4);
}

function comboMultiplier(combo: number): number {
	if (combo >= 8) return 3.0;
	if (combo >= 5) return 2.0;
	if (combo >= 3) return 1.5;
	return 1.0;
}

// gradeLabel 도 card-sort-view.tsx 로 옮겼다 — 결과 화면 전용이라 거기서만 쓴다.

// ─── 메인 컴포넌트 ──────────────────────────────────────
export default function CardSort() {
	const { t } = useTranslation();
	const nav = useNavigate();
	const sound = useSoundEffects();

	// 이 급·과의 최고 점수. 목업 결과 화면에 자리가 있다.
	const [bestScore, setBestScore] = useState<number | null>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const animRef = useRef<number>(0);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const cardTimerRef = useRef<number>(Date.now());

	const [gameState, setGameState] = useState<GameState>("level-select");

	const [selectedGrade, setSelectedGrade] = useState<Grade>("2급");
	const [selectedLesson, setSelectedLesson] = useState<number>(5);

	const [categoryColors, setCategoryColors] = useState<Record<string, string>>(
		{},
	);
	const [vocab, setVocab] = useState<CardSortVocab>({});
	const [rare, setRare] = useState<CardSortRare>({ examples: [] });
	const [contentLoading, setContentLoading] = useState(true);
	/*
	 * 화면이 바뀌면 초점을 프레임으로 옮긴다. 왜 필요한지·왜 첫 마운트에도
	 * 옮기는지·왜 프레임에 붙이는지는 `use-screen-focus.ts` 에 적어 뒀다.
	 * 콘텐츠를 받는 동안은 참는다 — 로딩 칸에 줬다가 도로 잃는다.
	 */
	const rootRef = useScreenFocus(gameState, !contentLoading);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const [cats, voc, rr] = await Promise.all([
				getCardSortCategories(),
				getCardSortVocab(),
				getCardSortRare(),
			]);
			if (cancelled) return;
			setCategoryColors(cats);
			setVocab(voc);
			setRare(rr);
			setContentLoading(false);
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const rareWords = useRef<Set<string>>(new Set());
	useEffect(() => {
		rareWords.current = new Set(rare.examples.map((e) => e.word));
	}, [rare]);

	const [activeCategories, setActiveCategories] = useState<string[]>([]);
	const [deck, setDeck] = useState<Card[]>([]);
	const [cardIndex, setCardIndex] = useState(0);
	const [timeLeft, setTimeLeft] = useState(60);
	const [stats, setStats] = useState<GameStats>({
		score: 0,
		combo: 0,
		maxCombo: 0,
		hp: 5,
		correct: 0,
		total: 0,
		rareCorrect: 0,
		rareTotal: 0,
	});
	const [introCountdown, setIntroCountdown] = useState(0);

	// 피드백 애니메이션
	// 피드백 애니메이션
	const [flashColor, setFlashColor] = useState<string | null>(null);
	const [scorePopup, setScorePopup] = useState<{
		text: string;
		color: string;
		key: number;
	} | null>(null);
	const [cardShake, setCardShake] = useState(false);
	const [cardDismiss, setCardDismiss] = useState(false);
	const [slotFlash, setSlotFlash] = useState<string | null>(null);
	const [activeSlot, setActiveSlot] = useState<string | null>(null);

	// ─── 캔버스 배경 ──────────────────────────────────────
	useEffect(() => {
		const canvas = canvasRef.current;
		const root = rootRef.current;
		if (!canvas || !root) return;
		const ctx = canvas.getContext("2d")!;

		const getSize = () => ({ w: root.clientWidth, h: root.clientHeight });

		const { w: initW, h: initH } = getSize();
		const particles = Array.from({ length: 18 }, () => ({
			x: Math.random() * initW,
			y: Math.random() * initH,
			vx: (Math.random() - 0.5) * 0.6,
			vy: (Math.random() - 0.5) * 0.6,
			size: 6 + Math.random() * 10,
			opacity: 0.04 + Math.random() * 0.08,
		}));

		const resize = () => {
			const { w, h } = getSize();
			canvas.width = w;
			canvas.height = h;
		};
		resize();
		window.addEventListener("resize", resize);

		const draw = () => {
			const w = canvas.width;
			const h = canvas.height;
			ctx.clearRect(0, 0, w, h);

			// 그리드
			ctx.strokeStyle = "rgba(255,229,0,0.04)";
			ctx.lineWidth = 1;
			for (let x = 0; x < w; x += 40) {
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, h);
				ctx.stroke();
			}
			for (let y = 0; y < h; y += 40) {
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(w, y);
				ctx.stroke();
			}

			// 미니 카드 파티클
			for (const p of particles) {
				p.x += p.vx;
				p.y += p.vy;
				if (p.x < -20) p.x = w + 20;
				if (p.x > w + 20) p.x = -20;
				if (p.y < -20) p.y = h + 20;
				if (p.y > h + 20) p.y = -20;

				ctx.save();
				ctx.globalAlpha = p.opacity;
				ctx.strokeStyle = "#FFE500";
				ctx.lineWidth = 1;
				const s = p.size;
				ctx.beginPath();
				ctx.roundRect(p.x - s / 2, p.y - s * 0.7, s, s * 1.4, 2);
				ctx.stroke();
				ctx.restore();
			}

			animRef.current = requestAnimationFrame(draw);
		};
		draw();

		return () => {
			window.removeEventListener("resize", resize);
			cancelAnimationFrame(animRef.current);
		};
	}, []);

	// ─── 게임 타이머 ──────────────────────────────────────
	useEffect(() => {
		if (gameState !== "playing") return;
		timerRef.current = setInterval(() => {
			setTimeLeft((t) => {
				if (t <= 1) {
					clearInterval(timerRef.current!);
					setGameState("result");
					return 0;
				}
				return t - 1;
			});
		}, 1000);
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [gameState]);

	// ─── 인트로 카운트다운 ────────────────────────────────
	useEffect(() => {
		if (gameState !== "intro") return;
		setIntroCountdown(2);
		const id = setInterval(() => {
			setIntroCountdown((c) => {
				if (c <= 1) {
					clearInterval(id);
					setGameState("playing");
					return 0;
				}
				return c - 1;
			});
		}, 750);
		return () => clearInterval(id);
	}, [gameState]);

	// 판이 끝나면 점수를 보낸다. 서버가 upsert 에서 max() 로 최고 점수를 유지하므로
	// 클라이언트에서 비교하지 않는다. stage_id 규칙은 조사 스나이퍼와 같다.
	// biome-ignore lint/correctness/useExhaustiveDependencies: 판 하나에 한 번만 보내야 하므로 gameState 전이만 본다. grade·lesson·stats.score 는 result 로 넘어간 뒤 바뀌지 않으니 전이 시점의 값이 맞고, 넣으면 판마다 저장이 여러 번 날아갈 수 있다
	useEffect(() => {
		if (gameState !== "result") return;
		const stageId = `${selectedGrade}_${selectedLesson}과`;
		void (async () => {
			await saveGameProgress({
				gameName: "card-sort",
				stageId,
				score: stats.score,
				completed: true,
			});
			const rows = await getGameProgress("card-sort");
			setBestScore(
				rows.find((r) => r.stage_id === stageId)?.score ?? stats.score,
			);
		})();
		// 판 하나에 한 번만 보내야 하므로 gameState 만 본다
	}, [gameState]);

	// ─── 게임 시작 ────────────────────────────────────────
	const startGame = useCallback(() => {
		const allCats = getCumulativeCategories(
			vocab,
			selectedGrade,
			selectedLesson,
		);
		const chosen = pickCategories(allCats);
		const newDeck = buildDeck(
			vocab,
			rareWords.current,
			selectedGrade,
			selectedLesson,
			chosen,
		);

		setActiveCategories(chosen);
		setDeck(newDeck);
		setCardIndex(0);
		setTimeLeft(60);
		setStats({
			score: 0,
			combo: 0,
			maxCombo: 0,
			hp: 5,
			correct: 0,
			total: 0,
			rareCorrect: 0,
			rareTotal: 0,
		});
		setFlashColor(null);
		setScorePopup(null);
		setCardShake(false);
		setCardDismiss(false);
		setSlotFlash(null);
		setActiveSlot(null);
		cardTimerRef.current = Date.now();
		setGameState("intro");
		// vocab 이 빠져 있으면 어휘가 늦게 도착한 판이 빈 덱으로 시작한다
	}, [vocab, selectedGrade, selectedLesson]);

	// ─── 카드 선택 처리 ───────────────────────────────────
	// biome-ignore lint/correctness/useExhaustiveDependencies: useSoundEffects() 는 안에 memo 가 없어 매 렌더마다 새 객체·새 함수를 돌려준다. sound.* 를 넣으면 handleAnswer 가 매 렌더 새로 만들어져 useCallback 이 무의미해진다. 이 호출들은 소리만 내고 게임 상태를 읽지 않으므로 클로저가 낡아도 판정이 달라지지 않는다
	const handleAnswer = useCallback(
		(chosenCategory: string) => {
			if (gameState !== "playing" || cardIndex >= deck.length) return;
			const card = deck[cardIndex];
			const elapsed = (Date.now() - cardTimerRef.current) / 1000;
			cardTimerRef.current = Date.now();

			const isCorrect = chosenCategory === card.category;

			// P1: 속도 보너스 — 2초 이내 +50, 4초 이후 +0, 선형 감소
			const speedBonus = isCorrect
				? elapsed <= 2
					? 50
					: Math.max(0, Math.floor(50 - ((elapsed - 2) / 2) * 50))
				: 0;

			// 점수 계산을 updater 밖에서 미리 수행 (팝업 표시에도 사용)
			let gained = 0;
			let newComboCalc = 0;
			setStats((prev) => {
				newComboCalc = isCorrect ? prev.combo + 1 : 0;
				const maxCombo = Math.max(prev.maxCombo, newComboCalc);
				const mult = comboMultiplier(newComboCalc);
				const rareMult = card.isRare ? 1.5 : 1.0;
				gained = isCorrect
					? Math.floor((100 + speedBonus) * mult * rareMult)
					: 0;
				const newHp = Math.max(0, isCorrect ? prev.hp : prev.hp - 1);
				return {
					score: prev.score + gained,
					combo: newComboCalc,
					maxCombo,
					hp: newHp,
					correct: prev.correct + (isCorrect ? 1 : 0),
					total: prev.total + 1,
					rareCorrect: prev.rareCorrect + (isCorrect && card.isRare ? 1 : 0),
					rareTotal: prev.rareTotal + (card.isRare ? 1 : 0),
				};
			});

			if (isCorrect) {
				sound.playCorrectWithConfetti();
				setSlotFlash(card.category);
				setCardDismiss(true);
				setTimeout(() => {
					setCardDismiss(false);
					setSlotFlash(null);
					setCardIndex((i) => i + 1);
				}, 350);
			} else {
				sound.playIncorrect();
				setStats((prev) => {
					if (prev.hp <= 0) setTimeout(() => setGameState("result"), 400);
					return prev;
				});
				setCardShake(true);
				setFlashColor("#FF406033");
				// P1: MISS 텍스트 팝업
				setScorePopup({ text: "MISS", color: "#FF4060", key: Date.now() });
				setTimeout(() => {
					setCardShake(false);
					setFlashColor(null);
					setScorePopup(null);
					setCardIndex((i) => i + 1);
				}, 400);
			}
		},
		[gameState, cardIndex, deck],
	);

	// 급별 카테고리 미리보기는 CardSortLevelView 가 vocab 을 받아 직접 계산한다
	// (getCumulativeCategories 는 거기서 export 한다 — 위 startGame 과 같은 기준).

	const currentCard = deck[cardIndex];

	// ─── RENDER ───────────────────────────────────────────
	if (contentLoading) {
		return (
			<div
				style={{
					width: "100%",
					height: "100%",
					background: "#060612",
					color: "#7878A0",
					fontFamily: "'Pretendard', sans-serif",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{t("game.common.loading")}
			</div>
		);
	}

	// 이관한 게임 CSS 는 화면을 data-screen 으로 가른다.
	// ux-dark-stage 는 목업이 bg-[#060612] 인 div 에 붙이던 클래스다 — 이 루트가 그것이다.
	const screenId =
		gameState === "level-select"
			? "cs_level"
			: gameState === "intro"
				? "cs_intro"
				: gameState === "result"
					? "cs_result"
					: "cs_play";

	return (
		<div
			ref={rootRef}
			tabIndex={-1}
			aria-label={t("game.cardSort.title")}
			className="game-frame ux-dark-stage"
			data-screen={screenId}
			style={{
				width: "100%",
				height: "100%",
				background: "#060612",
				color: "#fff",
				fontFamily: "'Pretendard', sans-serif",
				overflow: "hidden",
				position: "relative",
			}}
		>
			{/* 폰트 로드 */}
			<style>{`
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@700;900&display=swap');
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');

        @keyframes cardSlideIn {
          from { transform: translateY(-40px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes cardFloat {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-4px); }
        }
        @keyframes cardShake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
        @keyframes cardDismiss {
          0%   { transform: translateY(0) scale(1);    opacity: 1; }
          100% { transform: translateY(30px) scale(0.88); opacity: 0; }
        }
        @keyframes scoreAscend {
          0%   { transform: translateY(0);    opacity: 1; }
          100% { transform: translateY(-55px); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
        @keyframes holographic {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes introScale {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>

			{/* 캔버스 배경 */}
			<canvas
				ref={canvasRef}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: "100%",
					zIndex: 0,
				}}
			/>

			{/* 플래시 오버레이 */}
			{flashColor && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						zIndex: 10,
						background: flashColor,
						pointerEvents: "none",
					}}
				/>
			)}

			{/* ── 레벨 선택 화면 ─────────────────────────────── */}
			{gameState === "level-select" && (
				<CardSortLevelView
					vocab={vocab}
					categoryColors={categoryColors}
					selectedGrade={selectedGrade}
					selectedLesson={selectedLesson}
					onGradeSelect={(g) => {
						setSelectedGrade(g);
						setSelectedLesson(1);
					}}
					onLessonSelect={(n) => setSelectedLesson(n)}
					onStart={startGame}
					onBack={() => nav({ to: "/main/game" })}
				/>
			)}

			{/* ── 인트로 ─────────────────────────────────────── */}
			{gameState === "intro" && (
				<CardSortIntroView
					activeCategories={activeCategories}
					categoryColors={categoryColors}
					introCountdown={introCountdown}
				/>
			)}

			{/* ── 게임플레이 ──────────────────────────────────── */}
			{gameState === "playing" && (
				<CardSortPlayView
					categoryColors={categoryColors}
					activeCategories={activeCategories}
					currentCard={currentCard}
					cardIndex={cardIndex}
					deckLength={deck.length}
					timeLeft={timeLeft}
					hp={stats.hp}
					combo={stats.combo}
					score={stats.score}
					scorePopup={scorePopup}
					cardShake={cardShake}
					cardDismiss={cardDismiss}
					slotFlash={slotFlash}
					activeSlot={activeSlot}
					onSlotDown={(cat) => setActiveSlot(cat)}
					onSlotUp={(cat) => {
						setActiveSlot(null);
						handleAnswer(cat);
					}}
					onSlotLeave={() => setActiveSlot(null)}
					onAnswer={handleAnswer}
					onFinish={() => {
						if (timerRef.current) clearInterval(timerRef.current);
						setGameState("result");
					}}
					onBack={() => nav({ to: "/main/game" })}
				/>
			)}

			{/* ── 결과 화면 ───────────────────────────────────── */}
			{gameState === "result" && (
				<CardSortResultView
					selectedGrade={selectedGrade}
					selectedLesson={selectedLesson}
					stats={stats}
					bestScore={bestScore}
					onRetry={startGame}
					onLevelSelect={() => setGameState("level-select")}
					onExit={() => nav({ to: "/main/game" })}
				/>
			)}
		</div>
	);
}
