import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useSoundEffects } from '@/components/effect/use-sound-effects';
import { getParticleSniperLevels, getParticleSniperSentences } from '@/api/game-content';

type GameState = 'level-select' | 'lesson-select' | 'countdown' | 'playing' | 'result';
type Verdict = 'GOOD' | 'GREAT!' | 'PERFECT!!' | 'MISS' | null;

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
    if (Number.isNaN(aNumber) || Number.isNaN(bNumber)) return a.localeCompare(b, 'ko');
    return aNumber - bNumber;
  });

const buildQuestionSet = (lessons: LevelData, lesson: string): Question[] => {
  const lessonKeys = sortLessonKeys(lessons);
  const lessonIndex = lessonKeys.indexOf(lesson);
  if (lessonIndex < 0) return [];

  const currentQuestions = lessons[lesson]?.questions ?? [];
  const reviewQuestions = lessonKeys.slice(0, lessonIndex).flatMap((lessonKey) => lessons[lessonKey]?.questions ?? []);

  const currentLimit = reviewQuestions.length > 0 ? CURRENT_LESSON_QUESTION_COUNT : MAX_QUESTIONS_PER_GAME;
  const selectedCurrent = shuffle(currentQuestions).slice(0, currentLimit);
  const selectedReview = shuffle(reviewQuestions).slice(0, MAX_QUESTIONS_PER_GAME - selectedCurrent.length);
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

  const [gameState, setGameState] = useState<GameState>('level-select');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedLesson, setSelectedLesson] = useState<string>('');
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
  const [shotResult, setShotResult] = useState<'hit' | 'miss' | null>(null);
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [verdictKey, setVerdictKey] = useState(0);
  const [scanlinePos, setScanlinePos] = useState(0);
  const [flashColor, setFlashColor] = useState<'yellow' | 'red' | null>(null);
  const [levelMeta, setLevelMeta] = useState<Record<string, LevelMeta>>({});
  const [levelData, setLevelData] = useState<Record<string, LevelData>>({});
  const [contentLoading, setContentLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [meta, sentences] = await Promise.all([getParticleSniperLevels(), getParticleSniperSentences()]);
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
    const ctx = canvas.getContext('2d');
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
      ctx.fillStyle = '#060612';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(255,229,0,0.04)';
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
        ctx.fillStyle = 'rgba(255,229,0,0.3)';
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
    window.addEventListener('resize', onResize);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // ── Timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameState !== 'playing') return;
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
    if (gameState !== 'playing') return;
    scanlineIntervalRef.current = setInterval(() => setScanlinePos((p) => (p + 5) % 100), 50);
    return () => {
      if (scanlineIntervalRef.current) clearInterval(scanlineIntervalRef.current);
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
    if (gameState !== 'countdown') return;
    const iv = setInterval(() => {
      setCountdownValue((prev) => {
        if (prev <= 1) {
          setGameState('playing');
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
    setGameState('countdown');
  };

  const handleTimeOut = () => {
    if (questionResolvedRef.current || gameState !== 'playing') return;
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
          userAnswer: '선택 안 함',
        },
      ],
    }));
    sound.playIncorrect();
    setFlashColor('red');
    setShotResult('miss');
    setVerdict('MISS');
    setVerdictKey((k) => k + 1);
    setTimeout(() => {
      if (isGameOver) setGameState('result');
      else nextQuestion();
    }, 1000);
  };

  const handleAnswer = (choice: string) => {
    if (gameState !== 'playing' || questionResolvedRef.current || !questions[currentQuestionIndex]) return;

    questionResolvedRef.current = true;
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setPicked(choice);
    const q = questions[currentQuestionIndex];
    const isCorrect = choice === q.answer;
    setShotResult(isCorrect ? 'hit' : 'miss');
    const isGameOver = !isCorrect && stats.hp <= 1;

    let gained = 0;
    let newCombo = 0;

    setStats((prev) => {
      newCombo = isCorrect ? prev.combo + 1 : 0;
      const mult = newCombo >= 8 ? 3.0 : newCombo >= 5 ? 2.0 : newCombo >= 3 ? 1.5 : 1.0;
      // ≤2s → 50, 2~4s → linear 50→0, >4s → 0.
      const elapsed = ((100 - timerProgress) * QUESTION_DURATION_SECONDS) / 100;
      const speedBonus = elapsed <= 2 ? 50 : elapsed >= 4 ? 0 : Math.floor((50 * (4 - elapsed)) / 2);
      gained = isCorrect ? Math.floor((100 + speedBonus) * mult) : 0;

      return {
        ...prev,
        score: prev.score + gained,
        combo: newCombo,
        maxCombo: Math.max(prev.maxCombo, newCombo),
        hp: isCorrect ? prev.hp : Math.max(0, prev.hp - 1),
        answered: prev.answered + 1,
        correct: prev.correct + (isCorrect ? 1 : 0),
        mistakes: isCorrect ? prev.mistakes : [...prev.mistakes, { sentence: q.sentence, correct: q.answer, userAnswer: choice }],
      };
    });

    if (isCorrect) {
      sound.playCorrectWithConfetti();
    } else {
      sound.playIncorrect();
      setVerdict('MISS');
      setVerdictKey((k) => k + 1);
      setFlashColor('red');
    }

    setTimeout(() => {
      if (isGameOver) setGameState('result');
      else nextQuestion();
    }, 800);
  };

  const nextQuestion = () => {
    setCurrentQuestionIndex((prev) => {
      if (prev + 1 >= questions.length) {
        setGameState('result');
        return prev;
      }
      questionResolvedRef.current = false;
      setPicked(null);
      setShotResult(null);
      return prev + 1;
    });
  };

  // ── Render: Level Select ───────────────────────────────────────────
  const renderLevelSelect = () => (
    <div className="min-h-full bg-[#060612] text-white p-6 flex flex-col relative z-10">
      <div className="flex items-center gap-3 mb-1">
        <button
          onClick={() => nav({ to: '/main/game' })}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} color="rgba(255,255,255,0.7)" />
        </button>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Exo 2, sans-serif' }}>
          조사 스나이퍼
        </h1>
      </div>
      <p className="text-[#7878A0] mb-8 text-sm" style={{ fontFamily: 'Pretendard, sans-serif' }}>
        급수를 선택하세요
      </p>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(levelMeta).map(([level, meta]) => (
          <button
            key={level}
            onClick={() => {
              setSelectedLevel(level);
              setGameState('lesson-select');
            }}
            className="p-4 rounded-xl text-left transition-all active:scale-95"
            style={{
              border: `2px solid ${meta.color}40`,
              background: `${meta.color}10`,
            }}
          >
            <div className="text-xl font-bold mb-1" style={{ color: meta.color, fontFamily: 'Exo 2, sans-serif' }}>
              {level}
            </div>
            <div className="text-xs leading-relaxed" style={{ color: '#9090B0', fontFamily: 'Pretendard, sans-serif' }}>
              {meta.summary}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Render: Lesson Select ──────────────────────────────────────────
  const renderLessonSelect = () => {
    const lessons = levelData[selectedLevel] ?? {};
    const meta = levelMeta[selectedLevel];
    if (!meta) return null;
    const lessonKeys = sortLessonKeys(lessons);

    // Cumulative question counts
    let cumCount = 0;
    const cumCounts: Record<string, number> = {};
    for (const key of lessonKeys) {
      cumCount += lessons[key]?.questions?.length ?? 0;
      cumCounts[key] = cumCount;
    }

    return (
      <div className="min-h-full bg-[#060612] text-white p-6 flex flex-col relative z-10">
        <button
          onClick={() => setGameState('level-select')}
          className="mb-4 text-sm flex items-center gap-1"
          style={{ color: meta.color, fontFamily: 'Pretendard, sans-serif' }}
        >
          ← 급수 선택
        </button>
        <h2 className="text-2xl font-bold mb-1" style={{ color: meta.color, fontFamily: 'Exo 2, sans-serif' }}>
          {selectedLevel}
        </h2>
        <p className="text-[#7878A0] mb-6 text-sm" style={{ fontFamily: 'Pretendard, sans-serif' }}>
          현재 과와 이전 과에서 최대 {MAX_QUESTIONS_PER_GAME}문제가 랜덤 출제됩니다
        </p>
        <div className="space-y-3">
          {lessonKeys.map((lesson) => {
            const entry = lessons[lesson];
            return (
              <button
                key={lesson}
                onClick={() => startGame(selectedLevel, lesson)}
                className="w-full p-4 rounded-xl text-left transition-all active:scale-95 flex items-center justify-between"
                style={{
                  border: `2px solid ${meta.color}30`,
                  background: `${meta.color}08`,
                }}
              >
                <div>
                  <div className="font-bold mb-1" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                    {lesson}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {entry.new_particles.map((p) => (
                      <span
                        key={p}
                        className="px-2 py-0.5 rounded text-xs font-bold"
                        style={{
                          background: `${meta.color}25`,
                          color: meta.color,
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <div
                    className="text-lg font-bold"
                    style={{
                      color: meta.color,
                      fontFamily: 'Exo 2, sans-serif',
                    }}
                  >
                    {Math.min(MAX_QUESTIONS_PER_GAME, cumCounts[lesson])}
                  </div>
                  <div className="text-xs text-[#7878A0]">랜덤 문제</div>
                </div>
              </button>
            );
          })}
          {lessonKeys.length === 0 && <div className="py-12 text-center text-sm text-[#7878A0]">아직 등록된 문제가 없습니다.</div>}
        </div>
      </div>
    );
  };

  // ── Render: Countdown ─────────────────────────────────────────────
  const renderCountdown = () => (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="text-8xl font-bold text-[#FFE500]" style={{ fontFamily: 'Exo 2, sans-serif' }}>
        {countdownValue}
      </div>
    </div>
  );

  // ── Render: Gameplay ───────────────────────────────────────────────
  // ── Render: Gameplay ───────────────────────────────────────────────
  // 확정 목업(game_screens_uiux · ps_play)의 과녁 구조다. 예전 판은 문항이
  // 위에서 아래로 떨어지고 바닥에 GROUND 선이 있었는데, 낙하는 남은 시간을
  // 그리는 한 가지 방법일 뿐이었다. 지금은 ps-timer 가 그 일을 하고,
  // 조준·명중·빗나감이 과녁에서 일어난다.
  const renderGameplay = () => {
    const q = questions[currentQuestionIndex];
    if (!q) return null;

    // 목업의 상태 클래스 — 쏘면 is-shot 이 붙고 결과에 따라 is-hit / is-miss 가 따라온다
    const shot = shotResult !== null;
    const targetState = shot ? `is-shot is-${shotResult}` : '';

    return (
      <div className="ps-game-shell">
        <div className="ps-game-hud">
          <div className="ps-hud-left">
            <button
              type="button"
              className="ps-back"
              aria-label="나가기"
              onClick={() => setGameState('lesson-select')}
            >
              ←
            </button>
            <div className="ps-hearts" aria-label={`남은 기회 ${stats.hp}개`}>
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} style={i < stats.hp ? undefined : { opacity: 0.18 }}>
                  ♥
                </span>
              ))}
            </div>
            {stats.combo > 1 && <div className="ps-combo">{stats.combo}×</div>}
          </div>
          <div>
            <div className="ps-score">{stats.score.toLocaleString('ko-KR')}</div>
            <div className="ps-progress">
              {currentQuestionIndex + 1} / {questions.length}
            </div>
          </div>
        </div>

        {/* 낙하가 하던 일 — 남은 시간 */}
        <div
          className="ps-timer"
          aria-label={`남은 시간 ${Math.round(timerProgress)}%`}
        >
          <i style={{ width: `${timerProgress}%` }} />
        </div>

        <div className="ps-range">
          <div className={`ps-target-question ${targetState}`}>
            <div className="ps-target-head">
              <span className="ps-lock-state">
                <i />
                TARGET LOCK
              </span>
              <span className="ps-target-index">
                {String(currentQuestionIndex + 1).padStart(2, '0')}
              </span>
            </div>
            <div className="ps-reticle" aria-hidden="true">
              <i />
            </div>
            <div className="ps-lesson-pill">{q.sourceLesson}</div>
            <div className="ps-sentence">
              {q.sentence.split('___')[0]}
              <span className="ps-blank">
                <span className="ps-blank-value">{picked ?? '?'}</span>
                <span className="ps-impact" aria-hidden="true">
                  <i />
                </span>
              </span>
              {q.sentence.split('___')[1] ?? ''}
            </div>
            <div className="ps-target-guide" role="status" aria-live="polite">
              <span>＋</span>
              <b>
                {!shot
                  ? '조사를 선택해 조준하세요'
                  : shotResult === 'hit'
                    ? '명중'
                    : '빗나감'}
              </b>
            </div>
          </div>
        </div>

        <div className="ps-answer-tray" aria-label="조사 선택지">
          {q.choices.map((choice) => (
            <button
              key={choice}
              type="button"
              className={`ps-answer ${
                shot && choice === picked
                  ? shotResult === 'hit'
                    ? 'is-correct'
                    : 'is-wrong'
                  : ''
              }`}
              aria-pressed={shot && choice === picked}
              onPointerDown={() => handleAnswer(choice)}
              onClick={(e) => {
                if (e.detail === 0) handleAnswer(choice);
              }}
            >
              {choice}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ── Render: Result ─────────────────────────────────────────────────
  const renderResult = () => {
    const acc = stats.answered > 0 ? Math.round((stats.correct / stats.answered) * 100) : 0;
    const grade = acc >= 90 ? 'S' : acc >= 75 ? 'A' : acc >= 60 ? 'B' : 'C';
    const accentColor = levelMeta[selectedLevel]?.color ?? '#FFE500';

    return (
      <div className="min-h-full bg-[#060612] text-white flex flex-col items-center justify-center p-6 relative z-10">
        <div className="text-7xl font-bold mb-2" style={{ color: accentColor, fontFamily: 'Exo 2, sans-serif' }}>
          {grade}
        </div>
        <div className="text-sm text-[#7878A0] mb-6" style={{ fontFamily: 'Pretendard, sans-serif' }}>
          {selectedLevel} · {selectedLesson}
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-6">
          {[
            { label: '점수', value: stats.score.toLocaleString() },
            { label: '정확도', value: `${acc}%` },
            { label: '최고 콤보', value: `${stats.maxCombo}×` },
            { label: '오답', value: stats.mistakes.length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#0a0a18] rounded-xl p-3 text-center" style={{ border: `1px solid ${accentColor}20` }}>
              <div className="text-xl font-bold" style={{ color: accentColor, fontFamily: 'Exo 2, sans-serif' }}>
                {value}
              </div>
              <div className="text-xs text-[#7878A0]" style={{ fontFamily: 'Pretendard, sans-serif' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {stats.mistakes.length > 0 && (
          <div className="w-full max-w-xs mb-6 max-h-52 overflow-y-auto space-y-2">
            <h3 className="font-bold text-sm mb-2" style={{ fontFamily: 'Pretendard, sans-serif' }}>
              틀린 문제
            </h3>
            {stats.mistakes.map((m, i) => (
              <div key={i} className="bg-[#0a0a14] p-3 rounded-xl" style={{ border: '1px solid rgba(255,64,96,0.3)' }}>
                <p className="text-xs mb-1 text-[#C0C0D0]">{m.sentence}</p>
                <p className="text-xs text-[#FF4060]">나의 선택: {m.userAnswer}</p>
                <p className="text-xs text-[#4ADE80]">정답: {m.correct}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => startGame(selectedLevel, selectedLesson)}
            className="px-5 py-3 rounded-xl font-bold text-black transition-all active:scale-95"
            style={{
              background: accentColor,
              fontFamily: 'Pretendard, sans-serif',
            }}
          >
            다시하기
          </button>
          <button
            onClick={() => setGameState('lesson-select')}
            className="px-5 py-3 rounded-xl font-bold transition-all active:scale-95"
            style={{
              border: `2px solid ${accentColor}`,
              color: accentColor,
              fontFamily: 'Pretendard, sans-serif',
            }}
          >
            과 선택
          </button>
          <button
            onClick={() => setGameState('level-select')}
            className="px-5 py-3 rounded-xl font-bold transition-all active:scale-95"
            style={{
              border: `2px solid #7878A0`,
              color: '#7878A0',
              fontFamily: 'Pretendard, sans-serif',
            }}
          >
            급수 선택
          </button>
        </div>
      </div>
    );
  };

  // ── Root ───────────────────────────────────────────────────────────
  if (contentLoading) {
    return (
      <div ref={rootRef} className="relative w-full h-full overflow-hidden bg-[#060612] text-white flex items-center justify-center">
        <div style={{ color: '#7878A0', fontFamily: 'Pretendard, sans-serif' }}>로딩 중...</div>
      </div>
    );
  }

  // 이관한 게임 디자인(game.css)은 화면을 data-screen 으로 가른다 —
  // 목업이 body[data-screen] 으로 하던 것을 래퍼로 옮긴 것이다.
  const screenId =
    gameState === 'level-select' ? 'ps_level'
    : gameState === 'lesson-select' ? 'ps_lesson'
    : gameState === 'result' ? 'ps_result'
    : 'ps_play';

  return (
    <div
      ref={rootRef}
      // ps-stage 는 목업이 이 루트에 주입하던 클래스다 — 무대의 어두운 배경과
      // 스캔 그라디언트가 여기 걸린다. game-frame 만 붙이면 흰 화면이 된다.
      className="game-frame ps-stage relative w-full h-full overflow-hidden"
      data-screen={screenId}
    >
      <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@700;800;900&display=swap" rel="stylesheet" />
      <canvas ref={canvasRef} className="absolute inset-0" />
      {gameState === 'level-select' && renderLevelSelect()}
      {gameState === 'lesson-select' && renderLessonSelect()}
      {gameState === 'countdown' && renderCountdown()}
      {gameState === 'playing' && renderGameplay()}
      {gameState === 'result' && renderResult()}
    </div>
  );
};

export default ParticleSniper;
