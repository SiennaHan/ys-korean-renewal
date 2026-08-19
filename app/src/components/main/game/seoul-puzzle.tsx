import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { getGameProgress, saveGameProgress } from '@/api/game-progress';
import { getSeoulPuzzleContent } from '@/api/game-content';

// ── Types ────────────────────────────────────────────────────────────────────
type Screen = 'name' | 'map' | 'entry' | 'puzzle' | 'complete';
type NavDir = 'forward' | 'back';

interface EntryMessage { type: 'friend' | 'self'; text: string; }
interface Location {
  id: string; name: string; num: number; x: number; y: number;
  unit: string; desc: string; grammar: string[]; entryMessages: EntryMessage[];
}
interface Puzzle {
  friendMsg: string; friendMsgT: string;
  selfMsg: string | null; selfMsgT: string | null;
  friendMsg2: string | null; friendMsg2T: string | null;
  hintText: string; answer: string[]; distractors: string[];
  grammar: string; tip: string;
}
interface SavedState {
  playerName: string; completed: string[]; totalXp: number; currentLoc: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const LS_KEY = 'seoul-puzzle-v1';
const GAME_NAME = 'seoul-puzzle';
const META_STAGE = '_meta';

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
  const code = str.charCodeAt(str.length - 1) - 0xAC00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

function resolveToken(token: string, name: string): string {
  if (!name) return token;
  const b = endsWithBatchim(name);
  return token
    .replace(/\[이름\]이에요\./g, b ? name + '이에요.' : name + '예요.')
    .replace(/\[이름\]예요\./g,   b ? name + '예요.' : name + '이에요.')
    .replace(/\[이름\]예요\?/g,   b ? name + '예요?'  : name + '이에요?')
    .replace(/\[이름\]/g, name);
}

function isUnlocked(locations: Location[], locId: string, completed: Set<string>): boolean {
  const idx = locations.findIndex(l => l.id === locId);
  return idx === 0 || completed.has(locations[idx - 1]?.id);
}

// ── Sound (Web Audio API) ────────────────────────────────────────────────────
let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}
function playNote(ctx: AudioContext, freq: number, start: number, dur: number, gain: number, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g); g.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.start(start); osc.stop(start + dur + 0.01);
}
function playTap()     { try { const c = getAudioCtx(); playNote(c, 600, c.currentTime, 0.06, 0.15); } catch {} }
function playWrong()   { try { const c = getAudioCtx(); playNote(c, 260, c.currentTime, 0.18, 0.22, 'sawtooth'); } catch {} }
function playCorrect() { try { const c = getAudioCtx(); const t = c.currentTime; playNote(c, 523, t, 0.1, 0.2); playNote(c, 659, t + 0.1, 0.12, 0.2); } catch {} }
function playXp()      { try { const c = getAudioCtx(); const t = c.currentTime; [392,523,659,784].forEach((f,i) => playNote(c, f, t + i * 0.07, 0.1, 0.15)); } catch {} }
function playComplete(){ try { const c = getAudioCtx(); const t = c.currentTime; [523,659,784,1047].forEach((f,i) => playNote(c, f, t + i * 0.13, i === 3 ? 0.3 : 0.15, 0.25)); } catch {} }
function vibrate(p: number | number[]) { try { if ('vibrate' in navigator) navigator.vibrate(p); } catch {} }

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
   확정 목업(game_screens_uiux · sp_*)의 지도 좌표
   ──────────────────────────
   목업은 캡처한 SVG 의 핀과 라벨을 런타임에 옮겼다. 앱에서는 옮길 것이 아니라
   처음부터 이 자리에 그린다. 표는 목업 소스에서 그대로 뽑았다.
══════════════════════════ */

/** 전체 지도(viewBox 높이 ≥150)의 핀 자리 */
const PIN_FULL: Record<string, [number, number]> = {
	"북한산": [174, 38],
	"북촌한옥마을": [190, 75],
	"경복궁": [174, 82],
	"광장시장": [226, 94],
	"DDP": [244, 96],
	"명동": [183, 105],
	"홍대": [112, 114],
	"성수동": [276, 125],
	"국립중앙박물관": [184, 145],
	"한강공원": [130, 148],
};

/** 전체 지도의 라벨 상자 자리 */
const LABEL_FULL: Record<string, [number, number]> = {
	"북한산": [174, 48],
	"북촌한옥마을": [222, 63],
	"경복궁": [144, 75],
	"광장시장": [258, 85],
	"DDP": [272, 98],
	"명동": [180, 114],
	"홍대": [84, 105],
	"성수동": [304, 117],
	"국립중앙박물관": [218, 137],
	"한강공원": [100, 137],
};

/** 좁은 지도(높이 <150)의 핀 자리 */
const PIN_COMPACT: Record<string, [number, number]> = {
	"북한산": [174, 20],
	"북촌한옥마을": [190, 45],
	"경복궁": [174, 52],
	"광장시장": [226, 58],
	"DDP": [244, 62],
	"명동": [183, 68],
	"홍대": [112, 74],
	"성수동": [276, 79],
	"국립중앙박물관": [184, 88],
	"한강공원": [130, 91],
};

/** 좁은 지도의 라벨 자리. 없으면 핀 위로 올린다 */
const LABEL_COMPACT: Record<string, [number, number]> = {
	"북한산": [160, 30],
	"경복궁": [143, 45],
	"광장시장": [226, 37],
	"명동": [204, 68],
	"홍대": [86, 66],
	"성수동": [302, 71],
	"국립중앙박물관": [222, 83],
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
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function MapSvg({ viewBox, height, completed, currentLoc, onPinTap, riverPath, showAllLines, locations }: MapSvgProps) {
  // 목업이 쓰던 판정 그대로 — viewBox 높이로 전체/좁은 지도를 가른다
  const [viewX, viewY, viewW, viewH] = viewBox.split(/\s+/).map(Number);
  const isCompact = viewH < 150;
  const pinTable = isCompact ? PIN_COMPACT : PIN_FULL;

  /** 이 장소의 핀 자리. 표에 없으면 데이터의 좌표를 쓴다 */
  const pinOf = (l: Location): [number, number] =>
    pinTable[l.name] ?? [l.x, l.y - 17];

  // Compute route points through completed + active locs
  const routeLocs = locations.filter(l => completed.has(l.id) || l.id === currentLoc);
  const routePoints = routeLocs.length >= 2
    ? routeLocs.map(l => { const [px, py] = pinOf(l); return `${px},${py}`; }).join(' ')
    : '';

  return (
    <svg
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <rect width="390" height={height} fill="#e4eef6" />
      <ellipse cx="170" cy="26" rx="62" ry="26" fill="#c4d9a8" opacity=".75" />
      <ellipse cx="78"  cy="44" rx="38" ry="22" fill="#c4d9a8" opacity=".65" />
      <ellipse cx="320" cy="58" rx="32" ry="18" fill="#c4d9a8" opacity=".55" />
      <ellipse cx="42"  cy="190" rx="26" ry="16" fill="#c4d9a8" opacity=".5" />
      <ellipse cx="348" cy="210" rx="30" ry="16" fill="#c4d9a8" opacity=".5" />
      {/* 목업: viewBox 높이가 105 미만이면 강을 16 내린다 */}
      <g transform={viewH < 105 ? 'translate(0 16)' : undefined}>
      <path d={riverPath} fill="none" stroke="#a0c4e0" strokeWidth="18" strokeLinecap="round" />
      <path d={riverPath.replace(/C/g,'C').replace(/178,/g,'178,').replace(/178 /g,'178 ')} fill="none" stroke="#bdd8f0" strokeWidth="6" strokeLinecap="round" opacity=".6" />
      </g>
      {showAllLines && <>
        <line x1="0" y1="52"  x2="390" y2="52"  stroke="#fff" strokeWidth="1.2" opacity=".45"/>
        <line x1="0" y1="80"  x2="390" y2="80"  stroke="#fff" strokeWidth="2"   opacity=".65"/>
        <line x1="0" y1="112" x2="390" y2="112" stroke="#fff" strokeWidth="3"   opacity=".8"/>
        <line x1="0" y1="140" x2="390" y2="140" stroke="#fff" strokeWidth="1.5" opacity=".55"/>
        <line x1="0" y1="196" x2="390" y2="196" stroke="#fff" strokeWidth="2"   opacity=".6"/>
        <line x1="52"  y1="0" x2="52"  y2="240" stroke="#fff" strokeWidth="1.2" opacity=".45"/>
        <line x1="100" y1="0" x2="100" y2="240" stroke="#fff" strokeWidth="1.8" opacity=".6"/>
        <line x1="148" y1="0" x2="148" y2="240" stroke="#fff" strokeWidth="1.2" opacity=".45"/>
        <line x1="178" y1="0" x2="178" y2="240" stroke="#fff" strokeWidth="3"   opacity=".8"/>
        <line x1="220" y1="0" x2="220" y2="240" stroke="#fff" strokeWidth="1.5" opacity=".55"/>
        <line x1="258" y1="0" x2="258" y2="240" stroke="#fff" strokeWidth="2"   opacity=".65"/>
        <line x1="318" y1="0" x2="318" y2="240" stroke="#fff" strokeWidth="1.5" opacity=".5"/>
        <rect x="104" y="84"  width="70" height="24" rx="3" fill="#d0dce8" opacity=".55"/>
        <rect x="182" y="84"  width="70" height="24" rx="3" fill="#d0dce8" opacity=".55"/>
        <rect x="104" y="116" width="70" height="21" rx="3" fill="#d0dce8" opacity=".5"/>
        <rect x="182" y="116" width="70" height="21" rx="3" fill="#d0dce8" opacity=".5"/>
        <rect x="262" y="84"  width="52" height="24" rx="3" fill="#d0dce8" opacity=".5"/>
        <rect x="56"  y="84"  width="40" height="24" rx="3" fill="#d0dce8" opacity=".5"/>
        <ellipse cx="128" cy="172" rx="22" ry="8" fill="#cce0b4" opacity=".85"/>
      </>}
      {!showAllLines && <>
        <line x1="0" y1="52"  x2="390" y2="52"  stroke="#fff" strokeWidth="2"   opacity=".6"/>
        <line x1="0" y1="80"  x2="390" y2="80"  stroke="#fff" strokeWidth="2.5" opacity=".75"/>
        <line x1="178" y1="0" x2="178" y2={height} stroke="#fff" strokeWidth="2.5" opacity=".75"/>
        <line x1="258" y1="0" x2="258" y2={height} stroke="#fff" strokeWidth="1.8" opacity=".6"/>
      </>}
      {routePoints && (
        <polyline points={routePoints} fill="none" stroke="#0f9b82" strokeWidth="2.5" strokeDasharray="6,4" opacity=".8" />
      )}
      {locations.map(l => {
        const isDone   = completed.has(l.id);
        const isActive = l.id === currentLoc;
        const locked   = !isDone && !isActive && !isUnlocked(locations, l.id, completed);
        const x = l.x, y = l.y;

        // 통합 핀: 상태에 따라 속성만 변경 (SVG 구조 유지로 전환 시 점프 방지)
        const pinColor = isDone ? '#0f9b82' : isActive ? '#e03e3e' : '#adb5c4';
        const pinR = isDone ? 9 : isActive ? 11 : 7;
        const dotR = isDone ? 3.5 : isActive ? 4.5 : 2.5;
        const textColor = isDone ? '#0a6b58' : isActive ? '#c02020' : '#7a8494';
        const pinOpacity = (locked ? 0.35 : (!isDone && !isActive) ? 0.55 : 1);

        // ── 목업의 배치 계산을 그대로 옮긴 것 ──────────────────────
        const [pinX, pinY] = pinOf(l);
        const width = labelWidth(l.name);
        const target =
          isCompact
            ? (LABEL_COMPACT[l.name] ?? [pinX, pinY - LABEL_H - 10])
            : (LABEL_FULL[l.name] ?? [pinX, pinY - LABEL_H - 10]);
        const centerX = clamp(target[0], viewX + width / 2 + 3, viewX + viewW - width / 2 - 3);
        const topY = clamp(target[1], viewY + 3, viewY + viewH - LABEL_H - 3);
        // 리더선은 핀에서 라벨 상자의 가까운 쪽 변으로 뻗는다
        const leadY1 = pinY + 3;
        const leadY2 = topY + LABEL_H < leadY1 ? topY + LABEL_H + 1 : topY - 1;
        // 좁은 지도에서는 현재·완료 장소와 context 목록만 라벨을 보인다
        const showLabel = !isCompact || isActive || isDone || COMPACT_CONTEXT.has(l.name);

        return (
          <g key={l.id}
             className={[
               'ux-map-place',
               isActive ? 'is-active' : '',
               isDone ? 'is-done' : '',
               locked ? 'is-locked' : '',
               isCompact && COMPACT_CONTEXT.has(l.name) ? 'is-context' : '',
             ].filter(Boolean).join(' ')}
             opacity={pinOpacity}
             style={{ cursor: (onPinTap && !locked) ? 'pointer' : 'default', transition: 'opacity .4s' }}
             onPointerDown={(onPinTap && !locked) ? () => onPinTap(l.id) : undefined}
             onClick={(onPinTap && !locked) ? (e) => { if (e.detail === 0) onPinTap(l.id); } : undefined}>
            {showLabel && (
              <line className="ux-pin-leader" x1={pinX} y1={leadY1} x2={centerX} y2={leadY2} stroke={pinColor} strokeWidth={isActive ? 2 : 1.5} style={{ transition: 'stroke .4s' }}/>
            )}
            <circle cx={pinX} cy={pinY} r={pinR} fill={pinColor} stroke="#fff" strokeWidth={isActive ? 2 : 1.8} style={{ transition: 'r .4s, fill .4s' }}/>
            <circle cx={pinX} cy={pinY} r={dotR} fill="#fff" style={{ transition: 'r .4s' }}/>
            {isActive && (
              <circle cx={pinX} cy={pinY} r={16} fill="none" stroke="#e03e3e" strokeWidth="1.5" opacity=".3">
                <animate attributeName="r" values="11;19;11" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values=".3;0;.3" dur="2s" repeatCount="indefinite"/>
              </circle>
            )}
            {showLabel && <>
              <rect className="ux-map-label-bg" x={centerX - width / 2} y={topY} width={width} height={LABEL_H} rx={5} fill="rgba(255,255,255,.95)"/>
              <text className="ux-map-label" x={centerX} y={topY + 9.25} textAnchor="middle" fontSize={7} fontWeight={700} fill={textColor} fontFamily="'Noto Sans KR',sans-serif" style={{ transition: 'fill .4s' }}>{l.name}</text>
            </>}
            {onPinTap && !locked && <circle cx={pinX} cy={pinY} r={20} fill="transparent"/>}
          </g>
        );
      })}
    </svg>
  );
}

// ── Confetti Component ────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#f59e0b','#0f9b82','#e03e3e','#60a5fa','#a78bfa','#fb923c','#34d399','#f472b6'];

function Confetti({ show }: { show: boolean }) {
  const particles = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 6 + Math.random() * 8,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 0.6,
      duration: 1.4 + Math.random() * 0.8,
    })), []);

  if (!show) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9998, overflow: 'hidden' }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          top: -20,
          left: `${p.left}%`,
          width: p.size,
          height: p.size,
          background: p.color,
          borderRadius: 2,
          animation: `sp-confetti ${p.duration}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SeoulPuzzle() {
  const nav = useNavigate();
  const [screen, setScreen] = useState<Screen>('name');
  const [navDir, setNavDir] = useState<NavDir>('forward');
  const [playerName, setPlayerName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [totalXp, setTotalXp] = useState(0);
  const [currentLoc, setCurrentLoc] = useState<string | null>(null);
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [slotWords, setSlotWords] = useState<string[]>([]);
  const [trayUsed, setTrayUsed] = useState<Set<number>>(new Set());
  const [shuffledChips, setShuffledChips] = useState<string[]>([]);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [hintUsed, setHintUsed] = useState(false);
  const [answered, setAnswered] = useState<'correct' | 'wrong' | null>(null);
  const [sessionXp, setSessionXp] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionHints, setSessionHints] = useState(0);
  const [xpToast, setXpToast] = useState<{ text: string; key: number } | null>(null);
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
  const [completeSnap, setCompleteSnap] = useState<{
    locName: string; sx: number; sc: number; sh: number; tx: number; puzzleCount: number; grammars: string[];
  } | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Navigation ──
  function navigate(to: Screen, dir: NavDir = 'forward') {
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
          const meta = records.find(r => r.stage_id === META_STAGE);
          const completedIds = records
            .filter(r => r.stage_id !== META_STAGE && r.completed_at)
            .map(r => r.stage_id);
          const xp = records
            .filter(r => r.stage_id !== META_STAGE)
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
        setScreen('map');
      }
      hydratedRef.current = true;
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Persistence: save on change ──
  const lastCompletedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!playerName || !hydratedRef.current) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        playerName,
        completed: [...completed],
        totalXp,
        currentLoc,
      }));
    } catch {}
    saveGameProgress({
      gameName: GAME_NAME,
      stageId: META_STAGE,
      extra: { playerName, currentLoc },
    });
    for (const id of completed) {
      if (lastCompletedRef.current.has(id)) continue;
      const loc = locations.find(l => l.id === id);
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
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, [xpToast]);

  // ── Confetti auto-clear ──
  useEffect(() => {
    if (!showConfetti) return;
    if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
    confettiTimerRef.current = setTimeout(() => setShowConfetti(false), 3000);
    return () => { if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current); };
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
  }, [currentLoc, puzzleIdx, playerName]);

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
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
      }
    }, 80);
  }

  // ── Tray interaction ──
  function tapTray(index: number) {
    if (answered || trayUsed.has(index)) return;
    playTap(); vibrate(10);
    setTrayUsed(prev => new Set([...prev, index]));
    setSlotWords(prev => [...prev, shuffledChips[index]]);
  }

  function removeSlot(i: number) {
    if (answered) return;
    const word = slotWords[i];
    setSlotWords(prev => prev.filter((_, idx) => idx !== i));
    // Find the chip in the tray and un-use it
    const chipIdx = shuffledChips.findIndex((c, ci) => c === word && trayUsed.has(ci));
    if (chipIdx >= 0) {
      setTrayUsed(prev => { const s = new Set(prev); s.delete(chipIdx); return s; });
    }
  }

  // ── Check answer ──
  function checkAnswer() {
    if (answered || !resolvedPuzzle) return;
    const ok = JSON.stringify(slotWords) === JSON.stringify(resolvedPuzzle.answer);
    setAnswered(ok ? 'correct' : 'wrong');
    if (ok) {
      playCorrect(); vibrate([15, 50, 15]);
      const xp = hintUsed ? 10 : 20;
      const newStreak = streak + 1;
      setStreak(newStreak);
      setTotalXp(prev => prev + xp);
      setSessionXp(prev => prev + xp);
      setSessionCorrect(prev => prev + 1);
      const toastText = newStreak >= 2 ? `⭐ +${xp} XP! 🔥${newStreak}연속` : `⭐ +${xp} XP!`;
      setXpToast({ text: toastText, key: Date.now() });
      setTimeout(() => playXp(), 200);
    } else {
      playWrong(); vibrate([30, 20, 30]);
      setStreak(0);
      const xp = 5;
      setTotalXp(prev => prev + xp);
      setSessionXp(prev => prev + xp);
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
    const chipIdx = shuffledChips.findIndex((c, ci) => c === nextWord && !trayUsed.has(ci));
    if (chipIdx < 0) return;
    setHintsLeft(prev => prev - 1);
    setHintUsed(true);
    setSessionHints(prev => prev + 1);
    setTrayUsed(prev => new Set([...prev, chipIdx]));
    setSlotWords(prev => [...prev, nextWord]);
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
    const loc = locations.find(l => l.id === currentLoc)!;
    const puzzles = puzzlesMap[currentLoc];
    const grammars = [...new Set(puzzles.map(p => p.grammar))];
    const nextIdx = locations.findIndex(l => l.id === currentLoc) + 1;
    const nextLocId = nextIdx < locations.length ? locations[nextIdx].id : null;

    // Capture snapshot for complete screen before state updates
    setCompleteSnap({
      locName: loc.name,
      sx: sessionXp + (answered === 'correct' ? (hintUsed ? 10 : 20) : 5),
      sc: sessionCorrect + (answered === 'correct' ? 1 : 0),
      sh: sessionHints,
      tx: totalXp,
      puzzleCount: puzzles.length,
      grammars,
    });

    // 상태를 한번에 업데이트하여 핀이 중간 상태로 렌더링되지 않도록 함
    const locToComplete = currentLoc;
    setCompleted(prev => new Set([...prev, locToComplete]));
    setCurrentLoc(nextLocId);
    setShowConfetti(true);
    playComplete();
    vibrate([50, 100, 50, 100, 100]);
    navigate('complete');
  }

  function retryPuzzle() {
    loadPuzzle(puzzleIdx);
  }

  // ── Start location ──
  function startLocation(locId: string) {
    setCurrentLoc(locId);
    setSessionXp(0); setSessionCorrect(0); setSessionHints(0);
    setHintsLeft(3); setStreak(0);
    navigate('entry');
  }

  function startPuzzles() {
    loadPuzzle(0);
    navigate('puzzle');
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
    navigate('map');
  }

  // ── Toggle translation ──
  function toggleTrans(idx: number) {
    setTransVisible(prev => {
      const s = new Set(prev);
      if (s.has(idx)) s.delete(idx); else s.add(idx);
      return s;
    });
  }

  // ── Render helpers ──
  const loc = currentLoc ? locations.find(l => l.id === currentLoc) : null;

  const RIVER_MAIN = "M0,178 C25,174 50,181 80,176 C108,171 125,179 155,174 C178,169 200,176 228,171 C255,166 278,174 308,169 C332,165 358,171 390,168";
  const RIVER_ENTRY = "M0,118 C25,114 50,121 80,116 C108,111 125,119 155,114 C178,109 200,116 228,111 C255,106 278,114 308,109 C332,105 358,111 390,108";
  const RIVER_PUZZLE = "M0,100 C25,96 50,103 80,98 C108,93 125,101 155,96 C178,91 200,98 228,93 C255,88 278,96 308,91 C332,87 358,93 390,90";

  // ── STYLES (inline shared objects) ──
  const C = {
    navy: '#16213e', teal: '#0f9b82', tealL: '#e2f5f1', red: '#e03e3e', redL: '#fdf0f0',
    amber: '#f59e0b', amberL: '#fef3c7', bg: '#f2f4f7', surf: '#ffffff',
    text: '#111827', text2: '#6b7280', text3: '#adb5c4', bdr: '#e5e7eb',
  };

  // ── RENDER ──
  if (contentLoading) {
    return (
      <div style={{ width: '100%', maxWidth: 390, height: '100%', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif", color: C.text2 }}>
        로딩 중...
      </div>
    );
  }

  // 이관한 게임 CSS 는 화면을 data-screen 으로 가른다
  const screenId =
    screen === 'map' ? 'sp_map'
    : screen === 'entry' ? 'sp_entry'
    : screen === 'complete' ? 'sp_complete'
    : 'sp_puzzle';

  return (
    // 목업이 max-width:390 인 div 에 ux-seoul 을 붙였다. .game-frame 은 그 바깥이다.
    <div className="game-frame" data-screen={screenId}>
    <div className="ux-seoul" style={{ width: '100%', maxWidth: 390, height: '100%', background: C.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', margin: '0 auto', fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif" }}>

      {/* CSS Keyframes */}
      <style>{`
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
        .sp-loc-card { background:#fff; border-radius:14px; border:1px solid #e5e7eb; padding:14px 16px; display:flex; align-items:center; gap:14px; cursor:pointer; transition:transform .12s, box-shadow .12s; }
        .sp-loc-card:active { transform:scale(.98); }
        .sp-loc-card.locked { opacity:.45; cursor:default; pointer-events:none; }
        .sp-loc-card.done { border-color:#7ecfc3; }
        .sp-loc-card.active { border-color:#f0a8a8; border-width:1.5px; }
      `}</style>

      {/* XP Toast */}
      {xpToast && (
        <div key={xpToast.key} style={{
          position: 'fixed', top: 210, left: '50%',
          background: C.navy, color: C.amber,
          fontSize: 16, fontWeight: 700,
          padding: '10px 22px', borderRadius: 24,
          pointerEvents: 'none', zIndex: 9999, whiteSpace: 'nowrap',
          animation: 'sp-toastIn 0.2s ease forwards',
        }}>
          {xpToast.text}
        </div>
      )}

      <Confetti show={showConfetti} />

      {/* Status Bar */}
      <div className="ux-travel-header" style={{ background: C.navy, padding: '10px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, zIndex: 10 }}>
        <button onPointerDown={() => nav({ to: '/main/game' })} onClick={(e) => { if (e.detail === 0) nav({ to: '/main/game' }); }} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,.12)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ArrowLeft size={16} color="rgba(255,255,255,.85)" />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#f0c060', fontSize: 11, fontWeight: 700 }}>{totalXp} XP</span>
          <span style={{ color: 'rgba(255,255,255,.55)', fontSize: 11, letterSpacing: '.4px' }}>서울 여행</span>
        </div>
      </div>

      {/* ── NAME SCREEN ── */}
      {screen === 'name' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.navy, animation: navDir === 'forward' ? 'sp-slideUp .28s ease both' : 'sp-slideDown .28s ease both' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 32px', gap: 28, width: '100%' }}>
            <div style={{ fontSize: 52, lineHeight: 1 }}>🗺️</div>
            <div style={{ color: '#fff', fontSize: 24, fontWeight: 700, textAlign: 'center', letterSpacing: '-.4px', lineHeight: 1.3 }}>
              서울 여행에<br/>오신 것을 환영해요!
            </div>
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 13.5, textAlign: 'center', lineHeight: 1.55, marginTop: -12 }}>
              한국어로 서울을 여행하며<br/>새로운 표현을 익혀보세요.
            </div>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 11, fontWeight: 600, letterSpacing: '.6px', textTransform: 'uppercase' }}>
                이름 (Korean or English)
              </div>
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitName()}
                placeholder="예: 유리, Emily…"
                maxLength={20}
                style={{
                  width: '100%', background: 'rgba(255,255,255,.08)',
                  border: '1.5px solid rgba(255,255,255,.15)', borderRadius: 14,
                  padding: '14px 18px', fontSize: 18, fontWeight: 600,
                  color: '#fff', fontFamily: 'inherit', outline: 'none',
                  textAlign: 'center', letterSpacing: '.5px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              disabled={!nameInput.trim()}
              onPointerDown={submitName}
              onClick={(e) => { if (e.detail === 0) submitName(); }}
              style={{
                width: '100%', background: nameInput.trim() ? C.teal : 'rgba(15,155,130,.35)',
                color: '#fff', fontSize: 16, fontWeight: 700,
                border: 'none', borderRadius: 14, padding: 15,
                cursor: nameInput.trim() ? 'pointer' : 'default',
                fontFamily: 'inherit', transition: 'opacity .15s',
              }}
            >
              서울 여행 시작하기 →
            </button>
            <div style={{ color: 'rgba(255,255,255,.35)', fontSize: 12, textAlign: 'center' }}>
              이름은 게임 내 대화에서 사용됩니다.
            </div>
          </div>
        </div>
      )}

      {/* ── MAP SCREEN ── */}
      {screen === 'map' && (
        <div className="scrollbar-hide" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', animation: navDir === 'forward' ? 'sp-slideUp .28s ease both' : 'sp-slideDown .28s ease both' }}>
          {/* Header */}
          <div style={{ background: C.navy, padding: '14px 20px 16px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ color: '#fff', fontSize: 17, fontWeight: 700, letterSpacing: '-.3px' }}>
                {playerName} 씨의 서울 여행 🗺️
              </div>
              <div style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 20, padding: '5px 12px', color: '#f0c060', fontSize: 12, fontWeight: 700 }}>
                {totalXp} XP
              </div>
            </div>
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 12 }}>{completed.size} / 10 장소 완료</div>
          </div>

          {/* SVG Map */}
          <div className="ux-seoul-map" style={{ height: 240, flexShrink: 0, overflow: 'hidden', background: '#e4eef6', position: 'relative' }}>
            <MapSvg
              viewBox="50 22 280 170"
              height={240}
              completed={completed}
              currentLoc={currentLoc}
              riverPath={RIVER_MAIN}
              showAllLines={true}
              locations={locations}
              onPinTap={locId => {
                if (isUnlocked(locations, locId, completed) || completed.has(locId)) startLocation(locId);
              }}
            />
          </div>

          {/* Location list */}
          <div style={{ padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {locations.map(l => {
              const isDone = completed.has(l.id);
              const unlocked = isUnlocked(locations, l.id, completed);
              const isActive = !isDone && unlocked;
              const isLocked = !isDone && !unlocked;
              const stateClass = isDone ? 'done' : isActive ? 'active' : 'locked';
              const statusText = isDone ? '복습하기 →' : isActive ? '도전 가능' : '잠금';
              return (
                <div
                  key={l.id}
                  className={`sp-loc-card ${stateClass}`}
                  onPointerDown={!isLocked ? () => startLocation(l.id) : undefined}
                  onClick={!isLocked ? (e) => { if (e.detail === 0) startLocation(l.id); } : undefined}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                    background: isDone ? C.tealL : isActive ? C.redL : C.bg,
                    color: isDone ? C.teal : isActive ? C.red : C.text3,
                  }}>{l.num}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{l.name}</div>
                    <div style={{ fontSize: 11.5, color: C.text2, marginTop: 2 }}>{l.desc}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: '#eef2ff', color: '#3730a3', border: '1px solid rgba(99,102,241,.2)' }}>
                        연세 1권 {l.unit}
                      </span>
                      {l.grammar.map(g => (
                        <span key={g} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: C.amberL, color: '#92400e', border: '1px solid rgba(245,158,11,.2)' }}>
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, flexShrink: 0, color: isDone ? C.teal : isActive ? C.red : C.text3 }}>
                    {statusText}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ENTRY SCREEN ── */}
      {screen === 'entry' && loc && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.bg, overflow: 'hidden', animation: navDir === 'forward' ? 'sp-slideUp .28s ease both' : 'sp-slideDown .28s ease both' }}>
          {/* Scrollable area */}
          <div className="scrollbar-hide" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {/* Mini map */}
            <div className="ux-seoul-map" style={{ height: 160, flexShrink: 0, overflow: 'hidden', background: '#e4eef6', position: 'relative' }}>
              <div style={{ pointerEvents: 'none', width: '100%', height: '100%' }}>
                <MapSvg viewBox="65 5 270 112" height={160} completed={completed} currentLoc={currentLoc} riverPath={RIVER_ENTRY} locations={locations} />
              </div>
              <button
                onPointerDown={() => navigate('map', 'back')}
                onClick={(e) => { if (e.detail === 0) navigate('map', 'back'); }}
                style={{ position: 'absolute', top: 10, left: 12, background: 'rgba(255,255,255,.88)', border: '0.5px solid rgba(0,0,0,.1)', borderRadius: 20, padding: '5px 12px 5px 8px', fontSize: 12, fontWeight: 600, color: C.navy, cursor: 'pointer', fontFamily: 'inherit', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 3, zIndex: 10 }}
              >
                ← 지도
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Place header */}
              <div style={{ animation: 'sp-fadeUp .22s ease both' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.redL, color: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                    {loc.num}
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.5px', color: C.text }}>{loc.name}</div>
                    <div style={{ fontSize: 13, color: C.text2, marginTop: 3 }}>{loc.desc}</div>
                  </div>
                </div>
              </div>

              {/* Entry chat */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'sp-fadeUp .22s ease both' }}>
                {loc.entryMessages.map((m, i) => {
                  const txt = resolveToken(m.text, playerName);
                  if (m.type === 'friend') {
                    return (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.75)', flexShrink: 0 }}>친</div>
                        <div style={{ background: '#f0f2f5', borderRadius: '14px 14px 14px 4px', padding: '10px 13px', fontSize: 13.5, lineHeight: 1.55, color: C.text, maxWidth: 240 }} dangerouslySetInnerHTML={{ __html: txt }} />
                      </div>
                    );
                  }
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ background: C.navy, borderRadius: '14px 14px 4px 14px', padding: '10px 13px', fontSize: 13.5, lineHeight: 1.55, color: '#fff', maxWidth: 240 }}>
                        {txt}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grammar preview */}
              <div style={{ background: C.surf, borderRadius: 14, border: `1px solid ${C.bdr}`, padding: '14px 16px', animation: 'sp-fadeUp .22s ease both' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: C.text3, marginBottom: 10 }}>이번 장소에서 배울 문법</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[...new Set(puzzlesMap[loc.id].map(p => p.grammar))].map(g => (
                    <div key={g} style={{ background: C.amberL, color: '#92400e', fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, border: '1px solid rgba(245,158,11,.25)' }}>
                      {g}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Start button — fixed at bottom */}
          <div style={{ padding: '12px 20px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))', flexShrink: 0, background: C.bg, borderTop: `1px solid ${C.bdr}` }}>
            <button
              onPointerDown={startPuzzles}
              onClick={(e) => { if (e.detail === 0) startPuzzles(); }}
              style={{ width: '100%', padding: 15, background: C.navy, color: '#fff', border: 'none', borderRadius: 14, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '-.2px' }}
            >
              시작하기 →
            </button>
          </div>
        </div>
      )}

      {/* ── PUZZLE SCREEN ── */}
      {screen === 'puzzle' && loc && resolvedPuzzle && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: navDir === 'forward' ? 'sp-slideUp .28s ease both' : 'sp-slideDown .28s ease both' }}>
          {/* Mini map */}
          <div className="ux-seoul-map" style={{ height: 140, flexShrink: 0, overflow: 'hidden', background: '#e4eef6', position: 'relative' }}>
            <div style={{ pointerEvents: 'none', width: '100%', height: '100%' }}>
              <MapSvg viewBox="65 5 270 98" height={140} completed={completed} currentLoc={currentLoc} riverPath={RIVER_PUZZLE} locations={locations} />
            </div>
            <button
              onPointerDown={() => navigate('entry', 'back')}
              onClick={(e) => { if (e.detail === 0) navigate('entry', 'back'); }}
              style={{ position: 'absolute', top: 10, left: 12, background: 'rgba(255,255,255,.88)', border: '0.5px solid rgba(0,0,0,.1)', borderRadius: 20, padding: '5px 12px 5px 8px', fontSize: 12, fontWeight: 600, color: C.navy, cursor: 'pointer', fontFamily: 'inherit', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 3, zIndex: 10 }}
            >
              ← 장소 정보
            </button>
          </div>

          {/* Stage bar */}
          <div style={{ background: C.surf, borderBottom: `1px solid ${C.bdr}`, padding: '9px 16px 7px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                {loc.num}번째 장소 — {loc.name}
                {streak >= 2 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.red, animation: 'sp-streakPop .4s ease' }}>🔥{streak}연속</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: C.text2, marginTop: 1 }}>{loc.desc}</div>
            </div>
            <div style={{ background: C.amberL, color: '#92400e', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(245,158,11,.25)', whiteSpace: 'nowrap' }}>
              {totalXp} XP
            </div>
          </div>

          {/* Progress segments */}
          <div style={{ display: 'flex', gap: 3, padding: '0 16px 8px', background: C.surf, flexShrink: 0 }}>
            {puzzlesMap[loc.id].map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i < puzzleIdx ? C.teal : i === puzzleIdx ? C.navy : C.bdr,
                transition: 'background .4s',
              }} />
            ))}
          </div>

          {/* Scroll area */}
          <div ref={scrollAreaRef} className="scrollbar-hide" style={{ flex: 1, overflowY: 'auto', padding: '12px 14px 0', display: 'flex', flexDirection: 'column', gap: 10, WebkitOverflowScrolling: 'touch' }}>
            {/* Bubble 0: friendMsg */}
            <ChatBubble type="friend" text={resolvedPuzzle.friendMsg} translation={resolvedPuzzle.friendMsgT} idx={0} transVisible={transVisible} toggleTrans={toggleTrans} />
            {/* Bubble 1: selfMsg (if any) */}
            {resolvedPuzzle.selfMsg && (
              <ChatBubble type="self" text={resolvedPuzzle.selfMsg} translation={resolvedPuzzle.selfMsgT || ''} idx={1} transVisible={transVisible} toggleTrans={toggleTrans} />
            )}
            {/* Bubble 2: friendMsg2 (if any) */}
            {resolvedPuzzle.friendMsg2 && (
              <ChatBubble type="friend" text={resolvedPuzzle.friendMsg2} translation={resolvedPuzzle.friendMsg2T || ''} idx={2} transVisible={transVisible} toggleTrans={toggleTrans} />
            )}

            {/* Puzzle card */}
            <div style={{ background: C.surf, borderRadius: 14, border: `1px solid ${C.bdr}`, overflow: 'hidden', flexShrink: 0, animation: 'sp-fadeUp .22s ease both' }}>
              {/* Card header */}
              <div style={{ padding: '9px 13px 7px', borderBottom: `1px solid ${C.bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.text3, letterSpacing: '.8px', textTransform: 'uppercase' }}>문장 완성하기</span>
                <button
                  onPointerDown={() => setGrammarOpen(o => !o)}
                  onClick={(e) => { if (e.detail === 0) setGrammarOpen(o => !o); }}
                  style={{ background: C.amberL, color: '#92400e', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(245,158,11,.2)', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {resolvedPuzzle.grammar} {grammarOpen ? '▾' : '▸'}
                </button>
              </div>
              <div style={{ fontSize: 11.5, color: C.text2, padding: '7px 13px 0' }}>{resolvedPuzzle.hintText}</div>
              {/* Slot area */}
              <div style={{ padding: '7px 10px 10px' }}>
                <div style={{
                  minHeight: 44, border: `1.5px dashed ${answered === 'correct' ? C.teal : answered === 'wrong' ? C.red : C.bdr}`,
                  borderRadius: 10, padding: '6px 8px', display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center',
                  background: answered === 'correct' ? C.tealL : answered === 'wrong' ? C.redL : C.bg,
                  transition: 'border-color .25s, background .25s',
                }}>
                  {slotWords.length === 0
                    ? <span style={{ fontSize: 12, color: C.text3, padding: '2px 4px' }}>카드를 탭해서 여기에 놓으세요</span>
                    : slotWords.map((w, i) => {
                        const isCorrectPos = answered && resolvedPuzzle.answer[i] === w;
                        const isMisplaced = answered === 'wrong' && resolvedPuzzle.answer[i] !== w && resolvedPuzzle.answer.includes(w);
                        const isWrongPos = answered === 'wrong' && resolvedPuzzle.answer[i] !== w && !resolvedPuzzle.answer.includes(w);
                        return (
                          <button
                            key={i}
                            className={`sp-chip-slot${answered === 'correct' ? ' cor' : isWrongPos ? ' wrg' : isCorrectPos ? ' cor' : ''}`}
                            onPointerDown={() => removeSlot(i)}
                            onClick={(e) => { if (e.detail === 0) removeSlot(i); }}
                            style={{
                              padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                              fontFamily: 'inherit', whiteSpace: 'nowrap', border: 'none',
                              background: answered === 'correct' ? C.teal : isWrongPos ? '#fdf0f0' : isMisplaced ? '#fef3c7' : isCorrectPos ? C.teal : C.navy,
                              color: answered === 'correct' ? '#fff' : isWrongPos ? C.red : isMisplaced ? '#92400e' : '#fff',
                              textDecoration: isWrongPos ? 'line-through' : 'none',
                              animation: answered === 'correct' ? 'sp-chipBounce .3s ease' : answered === 'wrong' && isWrongPos ? 'sp-chipShake .35s ease' : undefined,
                            }}
                          >
                            {w}
                          </button>
                        );
                      })
                  }
                </div>
              </div>
              {/* Grammar tip (expandable) */}
              {grammarOpen && (
                <div style={{ padding: '0 13px 12px' }}>
                  <div style={{ fontSize: 12, color: C.text2, background: 'rgba(255,255,255,.75)', borderRadius: 8, padding: '7px 9px', lineHeight: 1.65 }}
                    dangerouslySetInnerHTML={{ __html: resolvedPuzzle.tip }} />
                </div>
              )}
            </div>

            {/* Answer result bubble */}
            {answered && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', animation: 'sp-fadeUp .22s ease both' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.75)', flexShrink: 0 }}>친</div>
                {answered === 'correct' ? (
                  <div style={{ background: C.tealL, border: `1px solid #7ecfc3`, borderRadius: '14px 14px 14px 4px', padding: '10px 13px', fontSize: 13, lineHeight: 1.6, color: C.text, maxWidth: 260 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 4 }}>잘했어요! 👍</div>
                    <div style={{ fontSize: 12, color: C.text2, background: 'rgba(255,255,255,.75)', borderRadius: 8, padding: '7px 9px', lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: resolvedPuzzle.tip }} />
                  </div>
                ) : (
                  <div style={{ background: C.redL, border: `1px solid #f0a8a8`, borderRadius: '14px 14px 14px 4px', padding: '10px 13px', fontSize: 13, lineHeight: 1.6, color: C.text, maxWidth: 260 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 4 }}>다시 확인해봐요</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.teal, fontFamily: 'inherit', marginBottom: 6 }}>{resolvedPuzzle.answer.join(' ')}</div>
                    <div style={{ fontSize: 12, color: C.text2, background: 'rgba(255,255,255,.75)', borderRadius: 8, padding: '7px 9px', lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: resolvedPuzzle.tip }} />
                  </div>
                )}
              </div>
            )}

            <div style={{ height: 8, flexShrink: 0 }} />

            {/* Tray — sticky inside scroll area */}
            <div style={{ position: 'sticky', bottom: 0, zIndex: 5 }}>
              <div style={{ background: 'rgba(255,255,255,.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', borderTop: `1px solid ${C.bdr}`, padding: '10px 14px 12px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.text3, letterSpacing: '.6px', marginBottom: 8 }}>순서대로 클릭하세요</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {shuffledChips.map((chip, i) => (
                    <button
                      key={i}
                      className={`sp-chip-tray${trayUsed.has(i) ? ' used' : ''}`}
                      onPointerDown={() => tapTray(i)}
                      onClick={(e) => { if (e.detail === 0) tapTray(i); }}
                      style={{ padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', userSelect: 'none' }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Button bar */}
              <div style={{ background: C.surf, borderTop: `1px solid ${C.bdr}`, padding: '10px 14px', paddingBottom: 'max(14px, env(safe-area-inset-bottom))', display: 'flex', gap: 8 }}>
                {answered === null && <>
                  <button
                    disabled={hintsLeft === 0}
                    onPointerDown={useHint}
                    onClick={(e) => { if (e.detail === 0) useHint(); }}
                    style={{
                      flex: 1, background: C.bg, color: C.text2, border: `1.5px solid ${C.bdr}`,
                      borderRadius: 12, fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                      cursor: hintsLeft > 0 ? 'pointer' : 'default', padding: 13,
                      opacity: hintsLeft === 0 ? 0.35 : 1,
                    }}
                  >
                    힌트 ({hintsLeft})
                  </button>
                  <button
                    disabled={slotWords.length === 0}
                    onPointerDown={checkAnswer}
                    onClick={(e) => { if (e.detail === 0) checkAnswer(); }}
                    style={{
                      flex: 2, background: slotWords.length > 0 ? C.navy : `${C.navy}4d`,
                      color: '#fff', border: 'none', borderRadius: 12,
                      fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
                      cursor: slotWords.length > 0 ? 'pointer' : 'default', padding: 13,
                    }}
                  >
                    확인하기
                  </button>
                </>}
                {answered === 'correct' && (
                  <button
                    onPointerDown={nextPuzzle}
                    onClick={(e) => { if (e.detail === 0) nextPuzzle(); }}
                    style={{ flex: 1, background: C.teal, color: '#fff', border: 'none', borderRadius: 12, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 13 }}
                  >
                    다음 문장 →
                  </button>
                )}
                {answered === 'wrong' && <>
                  <button
                    onPointerDown={retryPuzzle}
                    onClick={(e) => { if (e.detail === 0) retryPuzzle(); }}
                    style={{ flex: 1, background: C.bg, color: C.text2, border: `1.5px solid ${C.bdr}`, borderRadius: 12, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 13 }}
                  >
                    다시 풀기
                  </button>
                  <button
                    onPointerDown={nextPuzzle}
                    onClick={(e) => { if (e.detail === 0) nextPuzzle(); }}
                    style={{ flex: 1, background: C.teal, color: '#fff', border: 'none', borderRadius: 12, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 13 }}
                  >
                    다음으로 →
                  </button>
                </>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── COMPLETE SCREEN ── */}
      {screen === 'complete' && completeSnap && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: navDir === 'forward' ? 'sp-slideUp .28s ease both' : 'sp-slideDown .28s ease both' }}>
          {/* Scrollable area */}
          <div className="scrollbar-hide" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {/* Hero */}
            <div style={{ background: C.navy, padding: '32px 24px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(15,155,130,.3)', border: '2px solid rgba(15,155,130,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: '#fff', marginBottom: 4 }}>
                ✓
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-.5px' }}>{completeSnap.locName} 완료!</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', textAlign: 'center' }}>모든 문장을 완성했어요!</div>
              <div style={{ fontSize: 42, fontWeight: 700, color: '#f0c060', letterSpacing: '-2px', marginTop: 4 }}>
                {completeSnap.sx} <span style={{ fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,.5)', marginLeft: 4 }}>XP</span>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Stats */}
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { val: `${completeSnap.sc} / ${completeSnap.puzzleCount}`, lbl: '정답' },
                  { val: completeSnap.sh, lbl: '힌트 사용' },
                  { val: `${completeSnap.tx} XP`, lbl: '누적 XP' },
                ].map(s => (
                  <div key={s.lbl} style={{ flex: 1, background: C.surf, borderRadius: 14, border: `1px solid ${C.bdr}`, padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: C.text }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: C.text2, marginTop: 3 }}>{s.lbl}</div>
                  </div>
                ))}
              </div>

              {/* Grammar review */}
              <div style={{ background: C.surf, borderRadius: 14, border: `1px solid ${C.bdr}`, padding: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: C.text3, marginBottom: 10 }}>이 장소에서 배운 문법</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {completeSnap.grammars.map(g => (
                    <div key={g} style={{ background: C.tealL, color: '#0a6b58', border: `1px solid #7ecfc3`, borderRadius: 20, padding: '5px 13px', fontSize: 12, fontWeight: 600 }}>
                      {g}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Buttons — fixed at bottom */}
          <div style={{ padding: '12px 20px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))', flexShrink: 0, background: C.bg, borderTop: `1px solid ${C.bdr}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onPointerDown={() => navigate('map', 'back')}
              onClick={(e) => { if (e.detail === 0) navigate('map', 'back'); }}
              style={{ width: '100%', padding: 15, background: C.teal, color: '#fff', border: 'none', borderRadius: 14, fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '-.2px' }}
            >
              지도로 돌아가기 →
            </button>
            <button
              onPointerDown={() => {
                // Replay: re-open entry for the just-completed location
                const justCompleted = locations.find(l => completed.has(l.id) && l.id !== currentLoc);
                const replayId = justCompleted?.id;
                if (replayId) {
                  setCurrentLoc(replayId);
                  setCompleted(prev => { const s = new Set(prev); s.delete(replayId); return s; });
                  setSessionXp(0); setSessionCorrect(0); setSessionHints(0);
                  setHintsLeft(3); setStreak(0);
                  loadPuzzle(0);
                  navigate('puzzle');
                }
              }}
              onClick={(e) => {
                if (e.detail !== 0) return;
                const justCompleted = locations.find(l => completed.has(l.id) && l.id !== currentLoc);
                const replayId = justCompleted?.id;
                if (replayId) {
                  setCurrentLoc(replayId);
                  setCompleted(prev => { const s = new Set(prev); s.delete(replayId); return s; });
                  setSessionXp(0); setSessionCorrect(0); setSessionHints(0);
                  setHintsLeft(3); setStreak(0);
                  loadPuzzle(0);
                  navigate('puzzle');
                }
              }}
              style={{ width: '100%', padding: 13, background: 'transparent', color: C.text2, border: `1.5px solid ${C.bdr}`, borderRadius: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              다시 풀기
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

// ── Chat Bubble Sub-component ─────────────────────────────────────────────────
interface ChatBubbleProps {
  type: 'friend' | 'self';
  text: string;
  translation: string;
  idx: number;
  transVisible: Set<number>;
  toggleTrans: (idx: number) => void;
}

function ChatBubble({ type, text, translation, idx, transVisible, toggleTrans }: ChatBubbleProps) {
  const C = {
    navy: '#16213e', bg2: '#f0f2f5', text: '#111827',
  };
  const showTrans = transVisible.has(idx);

  const inner = (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ flex: 1 }}>{text}</span>
        {translation && (
          <button
            onPointerDown={() => toggleTrans(idx)}
            onClick={(e) => { if (e.detail === 0) toggleTrans(idx); }}
            style={{ flexShrink: 0, background: 'none', border: 'none', padding: 0, fontSize: 12, cursor: 'pointer', opacity: showTrans ? 1 : 0.35, lineHeight: 1, marginTop: 1 }}
          >
            🌐
          </button>
        )}
      </div>
      {showTrans && translation && (
        <div style={{ borderTop: type === 'friend' ? '1px solid rgba(0,0,0,.08)' : '1px solid rgba(255,255,255,.18)', marginTop: 6, paddingTop: 6, fontSize: 11.5, lineHeight: 1.5, color: type === 'friend' ? 'rgba(0,0,0,.42)' : 'rgba(255,255,255,.55)' }}>
          {translation}
        </div>
      )}
    </div>
  );

  if (type === 'friend') {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', animation: 'sp-fadeUp .22s ease both' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.75)', flexShrink: 0 }}>친</div>
        <div style={{ maxWidth: 240 }}>
          <div style={{ background: C.bg2, borderRadius: '14px 14px 14px 4px', padding: '10px 13px', fontSize: 13.5, lineHeight: 1.55, color: C.text }}>
            {inner}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', animation: 'sp-fadeUp .22s ease both' }}>
      <div style={{ maxWidth: 240 }}>
        <div style={{ background: C.navy, borderRadius: '14px 14px 4px 14px', padding: '10px 13px', fontSize: 13.5, lineHeight: 1.55, color: '#fff' }}>
          {inner}
        </div>
      </div>
    </div>
  );
}
