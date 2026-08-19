/**
 * 어휘 카드 마스터 — TCG 테마 어휘 분류 타임어택 게임
 * 급/과별 레벨 선택 → 카드 등장 → 덱 슬롯 탭으로 분류
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import {
	getCardSortCategories,
	getCardSortVocab,
	getCardSortRare,
	type CardSortVocab,
	type CardSortRare,
} from "@/api/game-content";

// ─── 타입 ──────────────────────────────────────────────
type GameState = "level-select" | "intro" | "playing" | "result";
type Grade = "2급" | "3급" | "4급" | "5급";

interface Card {
  word: string;
  category: string;
  grade: Grade;
  lesson: string;
  isRare: boolean;
}

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
function getCumulativeCategories(
  vocab: CardSortVocab,
  grade: Grade,
  upToLesson: number
): Record<string, string[]> {
  const gradeData = vocab[grade];
  const result: Record<string, string[]> = {};
  if (!gradeData) return result;
  for (let i = 1; i <= upToLesson; i++) {
    const lessonKey = `${i}과`;
    const lesson = gradeData[lessonKey];
    if (!lesson) continue;
    for (const catName of lesson.new_categories) {
      const words = lesson[catName] as string[] | undefined;
      if (words && words.length >= 4) {
        result[catName] = words;
      }
    }
  }
  return result;
}

function buildDeck(
  vocab: CardSortVocab,
  rareWords: Set<string>,
  grade: Grade,
  upToLesson: number,
  categories: string[]
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

function pickCategories(
  allCategories: Record<string, string[]>
): string[] {
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

function gradeLabel(accuracy: number): string {
  if (accuracy >= 0.9) return "S";
  if (accuracy >= 0.75) return "A";
  if (accuracy >= 0.6) return "B";
  return "C";
}

// ─── 메인 컴포넌트 ──────────────────────────────────────
export default function CardSort() {
  const nav = useNavigate();
  const sound = useSoundEffects();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cardTimerRef = useRef<number>(Date.now());

  const [gameState, setGameState] = useState<GameState>("level-select");
  const [selectedGrade, setSelectedGrade] = useState<Grade>("2급");
  const [selectedLesson, setSelectedLesson] = useState<number>(5);

  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [vocab, setVocab] = useState<CardSortVocab>({});
  const [rare, setRare] = useState<CardSortRare>({ examples: [] });
  const [contentLoading, setContentLoading] = useState(true);

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
    score: 0, combo: 0, maxCombo: 0, hp: 5,
    correct: 0, total: 0, rareCorrect: 0, rareTotal: 0,
  });
  const [introCountdown, setIntroCountdown] = useState(0);

  // 피드백 애니메이션
  // 피드백 애니메이션
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [scorePopup, setScorePopup] = useState<{ text: string; color: string; key: number } | null>(null);
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
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // 미니 카드 파티클
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
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
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
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

  // ─── 게임 시작 ────────────────────────────────────────
  const startGame = useCallback(() => {
    const allCats = getCumulativeCategories(vocab, selectedGrade, selectedLesson);
    const chosen = pickCategories(allCats);
    const newDeck = buildDeck(vocab, rareWords.current, selectedGrade, selectedLesson, chosen);

    setActiveCategories(chosen);
    setDeck(newDeck);
    setCardIndex(0);
    setTimeLeft(60);
    setStats({ score: 0, combo: 0, maxCombo: 0, hp: 5, correct: 0, total: 0, rareCorrect: 0, rareTotal: 0 });
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
        gained = isCorrect ? Math.floor((100 + speedBonus) * mult * rareMult) : 0;
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
    [gameState, cardIndex, deck]
  );

  // ─── 급별 카테고리 미리보기 ───────────────────────────
  const previewCategories = getCumulativeCategories(vocab, selectedGrade, selectedLesson);
  const previewKeys = Object.keys(previewCategories).slice(0, 4);

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
        로딩 중...
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
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
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 }}
      />

      {/* 플래시 오버레이 */}
      {flashColor && (
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 10,
            background: flashColor,
            pointerEvents: "none",
          }}
        />
      )}

      {/* ── 레벨 선택 화면 ─────────────────────────────── */}
      {gameState === "level-select" && (
        <div
          style={{
            position: "relative", zIndex: 5,
            height: "100%", display: "flex", flexDirection: "column",
            padding: "20px 16px", gap: 16,
          }}
        >
          {/* 뒤로가기 + 타이틀 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 8 }}>
            <button
              onClick={() => nav({ to: "/main/game" })}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(255,255,255,0.08)", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
              }}
            >
              <ArrowLeft size={18} color="rgba(255,255,255,0.7)" />
            </button>
            <div
              style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: 22, fontWeight: 900,
                background: "linear-gradient(90deg, #FFE500, #FF9E4A)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: 1,
              }}
            >
              어휘 카드 마스터
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#7878A0", marginTop: 4 }}>
              TCG 스타일 어휘 분류 게임
            </div>
          </div>

          {/* 급 선택 */}
          <div>
            <div style={{ fontSize: 12, color: "#7878A0", marginBottom: 8 }}>급 선택</div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["2급", "3급", "4급", "5급"] as Grade[]).map((g) => (
                <button
                  key={g}
                  onClick={() => { setSelectedGrade(g); setSelectedLesson(1); }}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 10,
                    border: `2px solid ${selectedGrade === g ? "#FFE500" : "#2a2a40"}`,
                    background: selectedGrade === g ? "rgba(255,229,0,0.15)" : "rgba(255,255,255,0.04)",
                    color: selectedGrade === g ? "#FFE500" : "#7878A0",
                    fontFamily: "'Pretendard', sans-serif",
                    fontWeight: 700, fontSize: 15,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* 과 선택 */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "#7878A0", marginBottom: 8 }}>
              과 선택 — <span style={{ color: "#FFE500" }}>{selectedLesson}과까지</span> 배운 카테고리 누적 출제
            </div>
            <div
              style={{
                display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6,
              }}
            >
              {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => {
                const lessonData = vocab[selectedGrade]?.[`${n}과`];
                const hasNew = (lessonData?.new_categories?.length ?? 0) > 0;
                const isSelected = n === selectedLesson;
                const isPast = n <= selectedLesson;

                return (
                  <button
                    key={n}
                    onClick={() => setSelectedLesson(n)}
                    style={{
                      padding: "8px 4px",
                      borderRadius: 8,
                      border: `2px solid ${isSelected ? "#FFE500" : isPast ? "#2a2a60" : "#1a1a30"}`,
                      background: isSelected
                        ? "rgba(255,229,0,0.15)"
                        : isPast
                        ? "rgba(74,158,255,0.08)"
                        : "rgba(255,255,255,0.03)",
                      color: isSelected ? "#FFE500" : isPast ? "#aaa" : "#444",
                      fontFamily: "'Exo 2', sans-serif",
                      fontWeight: 700, fontSize: 13,
                      cursor: "pointer",
                      position: "relative",
                    }}
                  >
                    {n}과
                    {hasNew && (
                      <span
                        style={{
                          position: "absolute", top: -4, right: -4,
                          width: 8, height: 8, borderRadius: "50%",
                          background: "#FFE500",
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 카테고리 미리보기 */}
          <div>
            <div style={{ fontSize: 12, color: "#7878A0", marginBottom: 8 }}>
              이번 라운드 카테고리 미리보기
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {previewKeys.length === 0 ? (
                <div style={{ fontSize: 13, color: "#444" }}>
                  해당 과까지 카테고리 없음
                </div>
              ) : (
                previewKeys.map((cat) => {
                  const color = categoryColors[cat] ?? "#fff";
                  return (
                    <div
                      key={cat}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: `1.5px solid ${color}44`,
                        background: `${color}11`,
                        color,
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {cat}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 시작 버튼 */}
          <button
            onClick={startGame}
            disabled={previewKeys.length === 0}
            style={{
              padding: "16px 0",
              borderRadius: 14,
              border: "none",
              background: previewKeys.length === 0
                ? "#2a2a40"
                : "linear-gradient(90deg, #FFE500, #FF9E4A)",
              color: previewKeys.length === 0 ? "#444" : "#000",
              fontFamily: "'Exo 2', sans-serif",
              fontWeight: 900, fontSize: 18,
              cursor: previewKeys.length === 0 ? "not-allowed" : "pointer",
              letterSpacing: 1,
            }}
          >
            START
          </button>
        </div>
      )}

      {/* ── 인트로 ─────────────────────────────────────── */}
      {gameState === "intro" && (
        <div
          style={{
            position: "relative", zIndex: 5,
            height: "100%", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 24,
            padding: "0 24px",
          }}
        >
          <div style={{ fontSize: 13, color: "#7878A0" }}>이번 라운드 카테고리</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {activeCategories.map((cat) => {
              const color = categoryColors[cat] ?? "#fff";
              return (
                <div
                  key={cat}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 12,
                    border: `2px solid ${color}`,
                    background: `${color}18`,
                    color,
                    fontSize: 16,
                    fontWeight: 700,
                    animation: "introScale 0.4s ease-out",
                  }}
                >
                  {cat}
                </div>
              );
            })}
          </div>
          <div
            style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: 64, fontWeight: 900,
              color: "#FFE500",
              animation: "introScale 0.3s ease-out",
            }}
          >
            {introCountdown === 0 ? "GO!" : introCountdown}
          </div>
        </div>
      )}

      {/* ── 게임플레이 ──────────────────────────────────── */}
      {gameState === "playing" && (
        <div
          style={{
            position: "relative", zIndex: 5,
            height: "100%", display: "flex", flexDirection: "column",
            padding: "0 0 16px",
          }}
        >
          {/* 타이머 바 (상단) */}
          <div
            style={{
              height: 4, background: "#1a1a30",
              position: "relative",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(timeLeft / 60) * 100}%`,
                background: timeLeft <= 10
                  ? "#FF4060"
                  : `linear-gradient(90deg, #FFE500, #FF9E4A)`,
                transition: "width 1s linear, background 0.3s",
                animation: timeLeft <= 10 ? "pulse 0.5s infinite" : "none",
              }}
            />
          </div>

          {/* HUD */}
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 16px",
            }}
          >
            {/* 뒤로가기 + HP */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => nav({ to: "/main/game" })}
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(255,255,255,0.08)", border: "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", flexShrink: 0,
                }}
              >
                <ArrowLeft size={16} color="rgba(255,255,255,0.7)" />
              </button>
              <div style={{ display: "flex", gap: 4 }}>
                {Array.from({ length: 5 }, (_, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 16,
                      opacity: i < stats.hp ? 1 : 0.2,
                      filter: i < stats.hp ? "drop-shadow(0 0 4px #FF4060)" : "none",
                      transition: "opacity 0.3s",
                    }}
                  >
                    ♥
                  </span>
                ))}
              </div>
            </div>

            {/* 콤보 */}
            <div
              style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: 14, fontWeight: 700,
                color: stats.combo >= 3 ? "#FFE500" : "#333",
                transition: "color 0.2s",
              }}
            >
              {stats.combo >= 3 ? `×${stats.combo} COMBO` : ""}
            </div>

            {/* 점수 */}
            <div
              style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: 18, fontWeight: 900,
                color: "#fff",
              }}
            >
              {stats.score.toLocaleString()}
            </div>
          </div>

          {/* 타이머 숫자 */}
          <div
            style={{
              textAlign: "center",
              fontFamily: "'Exo 2', sans-serif",
              fontSize: 13, fontWeight: 700,
              color: timeLeft <= 10 ? "#FF4060" : "#7878A0",
              marginBottom: 8,
            }}
          >
            {timeLeft}s
          </div>

          {/* 활성 카드 영역 */}
          <div
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative",
            }}
          >
            {currentCard && cardIndex < deck.length ? (
              <div style={{ position: "relative" }}>
                {/* 점수/MISS 팝업 */}
                {scorePopup && (
                  <div
                    key={scorePopup.key}
                    style={{
                      position: "absolute", top: -24, left: "50%",
                      transform: "translateX(-50%)",
                      fontFamily: "'Exo 2', sans-serif",
                      fontSize: scorePopup.text === "MISS" ? 26 : 22,
                      fontWeight: 900,
                      color: scorePopup.color,
                      animation: "scoreAscend 0.8s ease-out forwards",
                      pointerEvents: "none",
                      zIndex: 20,
                      whiteSpace: "nowrap",
                      textShadow: `0 0 12px ${scorePopup.color}88`,
                    }}
                  >
                    {scorePopup.text}
                  </div>
                )}

                {/* 카드 */}
                <div
                  style={{
                    width: 220, minHeight: 160,
                    borderRadius: 16,
                    border: currentCard.isRare
                      ? "2px solid transparent"
                      : `2px solid ${(categoryColors[currentCard.category] ?? "#fff") + "66"}`,
                    background: currentCard.isRare
                      ? "linear-gradient(135deg, #1a1a40, #2a1a30)"
                      : "rgba(255,255,255,0.05)",
                    backdropFilter: "blur(8px)",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    gap: 12, padding: "24px 20px",
                    animation: cardShake
                      ? "cardShake 0.4s ease-out"
                      : cardDismiss
                      ? "cardDismiss 0.35s ease-in forwards"
                      : "cardFloat 1.5s ease-in-out infinite",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: currentCard.isRare
                      ? "0 0 30px rgba(180,74,255,0.3)"
                      : `0 0 20px ${(categoryColors[currentCard.category] ?? "#fff") + "22"}`,
                  }}
                >
                  {/* 홀로그램 레어 효과 */}
                  {currentCard.isRare && (
                    <div
                      style={{
                        position: "absolute", inset: 0,
                        background:
                          "linear-gradient(135deg, #4A9EFF33, #B44AFF33, #FF4AEC33, #FFE50033)",
                        backgroundSize: "300% 300%",
                        animation: "holographic 3s ease infinite",
                        borderRadius: 14,
                        pointerEvents: "none",
                      }}
                    />
                  )}

                  {/* 레어 뱃지 */}
                  {currentCard.isRare && (
                    <div
                      style={{
                        position: "absolute", top: 8, right: 10,
                        fontSize: 10, fontWeight: 700,
                        fontFamily: "'Exo 2', sans-serif",
                        color: "#FFE500",
                        letterSpacing: 1,
                      }}
                    >
                      ✦ RARE
                    </div>
                  )}

                  {/* 급/과 */}
                  <div
                    style={{
                      fontSize: 11, color: "#7878A0",
                      fontWeight: 600, letterSpacing: 1,
                    }}
                  >
                    {currentCard.grade} · {currentCard.lesson}
                  </div>

                  {/* 단어 */}
                  <div
                    style={{
                      fontSize: 36, fontWeight: 700,
                      letterSpacing: -1,
                      textShadow: `0 0 20px ${categoryColors[currentCard.category] ?? "#fff"}88`,
                    }}
                  >
                    {currentCard.word}
                  </div>

                  {/* 카드 번호 */}
                  <div
                    style={{
                      fontSize: 11, color: "#333",
                      fontFamily: "'Exo 2', sans-serif",
                    }}
                  >
                    {cardIndex + 1} / {deck.length}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <div style={{ color: "#7878A0", fontSize: 16 }}>
                  모든 카드를 처리했어요!
                </div>
                <button
                  onClick={() => {
                    if (timerRef.current) clearInterval(timerRef.current);
                    setGameState("result");
                  }}
                  style={{
                    padding: "14px 32px",
                    borderRadius: 12, border: "none",
                    background: "linear-gradient(90deg, #FFE500, #FF9E4A)",
                    color: "#000",
                    fontFamily: "'Exo 2', sans-serif",
                    fontWeight: 900, fontSize: 16,
                    cursor: "pointer",
                  }}
                >
                  결과 보기
                </button>
              </div>
            )}
          </div>

          {/* 덱 슬롯 */}
          <div
            style={{
              padding: "0 12px",
              display: "grid",
              gridTemplateColumns: `repeat(${activeCategories.length}, 1fr)`,
              gap: 8,
            }}
          >
            {activeCategories.map((cat) => {
              const color = categoryColors[cat] ?? "#fff";
              const isFlashing = slotFlash === cat;
              const isPressed = activeSlot === cat;
              return (
                <button
                  key={cat}
                  onPointerDown={() => setActiveSlot(cat)}
                  onPointerUp={() => { setActiveSlot(null); handleAnswer(cat); }}
                  onPointerLeave={() => setActiveSlot(null)}
                  onClick={(e) => { if (e.detail === 0) handleAnswer(cat); }}
                  style={{
                    padding: "14px 4px",
                    borderRadius: 12,
                    border: `2px solid ${isFlashing ? color : color + "44"}`,
                    background: isFlashing ? `${color}22` : isPressed ? `${color}18` : `${color}0a`,
                    color: isFlashing || isPressed ? color : `${color}cc`,
                    fontFamily: "'Pretendard', sans-serif",
                    fontWeight: 700,
                    fontSize: activeCategories.length >= 4 ? 11 : 13,
                    cursor: "pointer",
                    transition: "transform 0.1s, box-shadow 0.15s, background 0.15s",
                    transform: isPressed ? "scale(0.95)" : "scale(1)",
                    lineHeight: 1.3,
                    minHeight: 64,
                    boxShadow: isFlashing
                      ? `0 0 20px ${color}55`
                      : isPressed
                      ? `0 0 10px ${color}33`
                      : "none",
                    wordBreak: "keep-all",
                    textAlign: "center",
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 결과 화면 ───────────────────────────────────── */}
      {gameState === "result" && (
        <div
          style={{
            position: "relative", zIndex: 5,
            height: "100%", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "24px 20px", gap: 20,
          }}
        >
          {/* 등급 */}
          <div>
            <div
              style={{
                fontFamily: "'Exo 2', sans-serif",
                fontSize: 80, fontWeight: 900, lineHeight: 1,
                background: "linear-gradient(135deg, #FFE500, #FF9E4A)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textAlign: "center",
                filter: "drop-shadow(0 0 20px rgba(255,229,0,0.5))",
              }}
            >
              {gradeLabel(stats.total > 0 ? stats.correct / stats.total : 0)}
            </div>
            <div
              style={{
                textAlign: "center", fontSize: 12, color: "#7878A0",
                marginTop: 4,
              }}
            >
              {selectedGrade} · {selectedLesson}과까지
            </div>
          </div>

          {/* 점수 */}
          <div
            style={{
              fontFamily: "'Exo 2', sans-serif",
              fontSize: 40, fontWeight: 900,
              color: "#fff",
              textAlign: "center",
            }}
          >
            {stats.score.toLocaleString()}
            <span style={{ fontSize: 16, color: "#7878A0", marginLeft: 4 }}>점</span>
          </div>

          {/* 스탯 */}
          <div
            style={{
              width: "85%", maxWidth: 280,
              background: "rgba(255,255,255,0.04)",
              borderRadius: 16, padding: "16px 20px",
              display: "flex", flexDirection: "column", gap: 10,
            }}
          >
            {[
              [
                "정확도",
                `${stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}%`,
              ],
              ["최대 콤보", `×${stats.maxCombo}`],
              ["처리 카드", `${stats.total}장`],
              [
                "레어 카드",
                `${stats.rareCorrect} / ${stats.rareTotal}`,
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 14, color: "#7878A0" }}>{label}</span>
                <span
                  style={{
                    fontFamily: "'Exo 2', sans-serif",
                    fontSize: 16, fontWeight: 700,
                    color: "#fff",
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* 버튼 */}
          <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 280 }}>
            <button
              onClick={startGame}
              style={{
                flex: 1, padding: "14px 0",
                borderRadius: 12, border: "none",
                background: "linear-gradient(90deg, #FFE500, #FF9E4A)",
                color: "#000",
                fontFamily: "'Exo 2', sans-serif",
                fontWeight: 900, fontSize: 15,
                cursor: "pointer",
              }}
            >
              다시 도전
            </button>
            <button
              onClick={() => setGameState("level-select")}
              style={{
                flex: 1, padding: "14px 0",
                borderRadius: 12,
                border: "2px solid #2a2a40",
                background: "transparent",
                color: "#7878A0",
                fontFamily: "'Exo 2', sans-serif",
                fontWeight: 700, fontSize: 15,
                cursor: "pointer",
              }}
            >
              레벨 선택
            </button>
          </div>
          <button
            onClick={() => nav({ to: "/main/game" })}
            style={{
              width: "100%", maxWidth: 280, padding: "12px 0",
              borderRadius: 12,
              border: "none",
              background: "transparent",
              color: "#555",
              fontFamily: "'Pretendard', sans-serif",
              fontWeight: 600, fontSize: 13,
              cursor: "pointer",
            }}
          >
            나가기
          </button>
        </div>
      )}
    </div>
  );
}
