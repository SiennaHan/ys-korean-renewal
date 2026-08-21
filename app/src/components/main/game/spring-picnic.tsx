import {
	getSpringPicnicFriends,
	getSpringPicnicQuestions,
} from "@/api/game-content";
import { getGameProgress, saveGameProgress } from "@/api/game-progress";
import { useConfetti } from "@/components/effect/confetti-provider";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import useSound from "use-sound";
import "./spring-picnic.css";

const GAME_NAME = "spring-picnic";
const META_STAGE = "_meta";

/* ══════════════════════════
   Data
══════════════════════════ */

interface Friend {
	id: string;
	face: string;
	name: string;
	bg: string;
	cats: string[];
	mission: string;
	desc: string;
	desc2: string;
}

interface Question {
	id: string;
	cat: string;
	level: number;
	il: string;
	hint: Record<string, string>;
	num: string;
	tmpl: string;
	tts: string;
	correct: string;
	wrong: string[];
}

/* ══════════════════════════
   Helpers
══════════════════════════ */

function shuffle<T>(arr: T[]): T[] {
	const r = [...arr];
	for (let i = r.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[r[i], r[j]] = [r[j], r[i]];
	}
	return r;
}

const SK = "spg_v7";

function loadSt(): Record<string, unknown> {
	try {
		return JSON.parse(localStorage.getItem(SK) || "{}") || {};
	} catch {
		return {};
	}
}

function saveSt(d: Record<string, unknown>) {
	try {
		localStorage.setItem(SK, JSON.stringify({ ...loadSt(), ...d }));
	} catch {
		/* noop */
	}
}

const ttsOK = typeof window !== "undefined" && "speechSynthesis" in window;

let activeQuestionAudio: HTMLAudioElement | null = null;
let activeQuestionAudioTimer: number | null = null;

function speak(text: string) {
	if (!ttsOK) return;
	window.speechSynthesis.cancel();
	const u = new SpeechSynthesisUtterance(text);
	u.lang = "ko-KR";
	u.rate = 0.9;
	window.speechSynthesis.speak(u);
}

function stopQuestionAudio() {
	if (activeQuestionAudioTimer !== null) {
		window.clearTimeout(activeQuestionAudioTimer);
		activeQuestionAudioTimer = null;
	}
	if (activeQuestionAudio) {
		activeQuestionAudio.pause();
		activeQuestionAudio.currentTime = 0;
		activeQuestionAudio = null;
	}
	if (ttsOK) window.speechSynthesis.cancel();
}

function speakQuestion(question: Question, delayMs = 0) {
	stopQuestionAudio();
	const play = () => {
		const audio = new Audio(`/sounds/spring-picnic/${question.id}.m4a`);
		activeQuestionAudio = audio;
		audio.addEventListener(
			"error",
			() => {
				if (activeQuestionAudio === audio) activeQuestionAudio = null;
				speak(question.tts);
			},
			{ once: true },
		);
		audio.addEventListener(
			"ended",
			() => {
				if (activeQuestionAudio === audio) activeQuestionAudio = null;
			},
			{ once: true },
		);
		void audio.play().catch(() => speak(question.tts));
	};

	if (delayMs > 0) {
		activeQuestionAudioTimer = window.setTimeout(() => {
			activeQuestionAudioTimer = null;
			play();
		}, delayMs);
	} else {
		play();
	}
}

/* ══════════════════════════
   Decorative Banner Components
══════════════════════════ */

/**
 * 확정 목업(screens_uiux 의 게임 절)이 봄소풍 장면마다 넣던 장식이다.
 * 목업은 캡처한 DOM 에 런타임으로 append 했지만 앱에서는 마크업에 둔다.
 * 해와 꽃잎은 모든 장면에, 바구니는 t-illo 장면에만 들어간다.
 */
function PicnicDecor({ basket = false }: { basket?: boolean }) {
	return (
		<>
			<div className="ux-sun" />
			<div className="ux-petals">
				{/* 꽃잎 6장 — 목업과 같은 수 */}
				{Array.from({ length: 6 }, (_, i) => (
					<i key={i} className="ux-petal" />
				))}
			</div>
			{basket && (
				<div className="ux-basket">
					<i />
					<i />
					<i />
				</div>
			)}
		</>
	);
}

function TitleBanner() {
	return (
		<div className="t-illo ux-picnic-scene">
			<PicnicDecor basket />
			<div className="t-sky" />
			<div
				className="t-cl"
				style={{ width: 60, height: 22, top: 18, left: 30, opacity: 0.9 }}
			/>
			<div
				className="t-cl"
				style={{ width: 44, height: 16, top: 28, left: 70 }}
			/>
			<div
				className="t-cl"
				style={{ width: 52, height: 18, top: 16, right: 38, opacity: 0.85 }}
			/>
			<div className="t-gr" />
			<div className="t-gd" />
			<div className="t-tr" style={{ left: 22 }}>
				<div className="t-t2" />
				<div className="t-t1" />
				<div className="t-tt" />
			</div>
			<div className="t-tr" style={{ right: 18 }}>
				<div className="t-t2" />
				<div className="t-t1" />
				<div className="t-tt" />
			</div>
			<div className="t-bl">
				<div className="t-bk" />
			</div>
			<div className="t-bn">{"\u{1F371}"}</div>
			<div
				className="t-pt"
				style={{ top: 32, left: 80, background: "#F4C0D1" }}
			/>
			<div
				className="t-pt"
				style={{ top: 52, right: 72, background: "#AFA9EC" }}
			/>
			<div
				className="t-pt"
				style={{ top: 24, right: 112, background: "#F4C0D1" }}
			/>
			<div
				className="t-pt"
				style={{ top: 66, left: 56, background: "#9FE1CB" }}
			/>
			<div className="t-ch" style={{ left: 128 }}>
				<div className="t-cb" style={{ background: "#AFA9EC" }}>
					{"\u{1F430}"}
				</div>
			</div>
			<div className="t-ch" style={{ right: 116 }}>
				<div className="t-cb" style={{ background: "#F0997B" }}>
					{"\u{1F43B}"}
				</div>
			</div>
		</div>
	);
}

function SmallBanner({ label }: { label: string }) {
	return (
		<div
			className="t-illo ux-picnic-scene"
			style={{ flex: "0 0 120px", minHeight: 120, maxHeight: 120 }}
		>
			<PicnicDecor basket />
			<div className="t-sky" />
			<div
				className="t-cl"
				style={{ width: 50, height: 18, top: 14, left: 22, opacity: 0.9 }}
			/>
			<div
				className="t-cl"
				style={{ width: 36, height: 13, top: 22, left: 58 }}
			/>
			<div
				className="t-cl"
				style={{ width: 44, height: 15, top: 12, right: 32, opacity: 0.85 }}
			/>
			<div className="t-gr" />
			<div className="t-gd" />
			<div className="t-tr" style={{ left: 16 }}>
				<div className="t-t2" />
				<div className="t-t1" />
				<div className="t-tt" />
			</div>
			<div className="t-tr" style={{ right: 14 }}>
				<div className="t-t2" />
				<div className="t-t1" />
				<div className="t-tt" />
			</div>
			<div className="t-bl" style={{ width: 70, height: 34, bottom: 24 }}>
				<div className="t-bk" />
			</div>
			<div className="t-bn" style={{ bottom: 40, fontSize: 16 }}>
				{"\u{1F371}"}
			</div>
			<div
				className="t-pt"
				style={{ top: 24, left: 64, background: "#F4C0D1" }}
			/>
			<div
				className="t-pt"
				style={{ top: 38, right: 58, background: "#AFA9EC" }}
			/>
			<div
				className="t-pt"
				style={{ top: 18, right: 88, background: "#F4C0D1" }}
			/>
			<div className="t-ch" style={{ left: 108, bottom: 26 }}>
				<div className="t-cb" style={{ background: "#AFA9EC", fontSize: 10 }}>
					{"\u{1F430}"}
				</div>
			</div>
			<div className="t-ch" style={{ right: 96, bottom: 26 }}>
				<div className="t-cb" style={{ background: "#F0997B", fontSize: 10 }}>
					{"\u{1F43B}"}
				</div>
			</div>
			<div
				style={{
					position: "absolute",
					inset: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					paddingBottom: 30,
				}}
			>
				<span
					style={{
						fontSize: 16,
						fontWeight: 700,
						color: "var(--pud)",
						background: "rgba(255,255,255,.75)",
						padding: "4px 14px",
						borderRadius: 20,
					}}
				>
					{label}
				</span>
			</div>
		</div>
	);
}

function GameBanner() {
	return (
		<div className="g-header ux-picnic-scene">
			{/* g-header 는 t-illo 가 아니므로 바구니가 없다 */}
			<PicnicDecor />
			<div className="g-h-sky" />
			<div
				className="g-h-cl"
				style={{ width: 44, height: 14, top: 10, left: 20, opacity: 0.9 }}
			/>
			<div
				className="g-h-cl"
				style={{ width: 32, height: 11, top: 16, left: 52 }}
			/>
			<div
				className="g-h-cl"
				style={{ width: 38, height: 13, top: 8, right: 28, opacity: 0.85 }}
			/>
			<div className="g-h-gr" />
			<div className="g-h-gd" />
			<div className="g-h-tr" style={{ left: 14 }}>
				<div className="g-h-t2" />
				<div className="g-h-t1" />
				<div className="g-h-tt" />
			</div>
			<div className="g-h-tr" style={{ right: 12 }}>
				<div className="g-h-t2" />
				<div className="g-h-t1" />
				<div className="g-h-tt" />
			</div>
			<div
				className="g-h-pt"
				style={{ top: 18, left: 56, background: "#F4C0D1" }}
			/>
			<div
				className="g-h-pt"
				style={{ top: 30, right: 50, background: "#AFA9EC" }}
			/>
			<div
				className="g-h-pt"
				style={{ top: 14, right: 76, background: "#F4C0D1" }}
			/>
			<div className="g-h-ch" style={{ left: 88 }}>
				<div className="g-h-cb" style={{ background: "#AFA9EC" }}>
					{"\u{1F430}"}
				</div>
			</div>
			<div className="g-h-ch" style={{ right: 80 }}>
				<div className="g-h-cb" style={{ background: "#F0997B" }}>
					{"\u{1F43B}"}
				</div>
			</div>
		</div>
	);
}

/* ══════════════════════════
   Main Component
══════════════════════════ */

type Screen = "title" | "select" | "game" | "result";

interface GameState {
	friend: Friend;
	level: number;
	rounds: Question[];
	cur: number;
	score: number;
	answered: boolean;
	totalR: number;
	wQueue: Question[];
	wSet: Set<string>;
	w2: Set<string>;
	choices: string[];
	chosenAnswer: string | null;
	retrying: boolean;
}

export default function SpringPicnicGame() {
	const navigate = useNavigate();
	const { i18n } = useTranslation();
	const sound = useSoundEffects();
	const [playRetrySound] = useSound("/sounds/spring-picnic/incorrect.mp3", {
		volume: 0.85,
	});
	const confetti = useConfetti();

	const curLang = useMemo(() => {
		const lang = i18n.language;
		return ["ko", "en", "zh", "ja", "vi"].includes(lang) ? lang : "ko";
	}, [i18n.language]);

	const [screen, setScreen] = useState<Screen>("title");
	const [game, setGame] = useState<GameState | null>(null);
	const [lastPlay, setLastPlay] = useState<{
		score: number;
		friend: string;
		lv: number;
		date: string;
	} | null>(null);
	const [friends, setFriends] = useState<Friend[]>([]);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [contentLoading, setContentLoading] = useState(true);

	useEffect(() => stopQuestionAudio, []);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const [f, q] = await Promise.all([
				getSpringPicnicFriends(),
				getSpringPicnicQuestions(),
			]);
			if (cancelled) return;
			setFriends(f);
			setQuestions(q);
			setContentLoading(false);
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	// Load last play info on mount (server first, localStorage fallback)
	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const records = await getGameProgress(GAME_NAME);
				if (records.length) {
					const meta = records.find((r) => r.stage_id === META_STAGE);
					const played: Record<string, boolean> = {};
					for (const r of records) {
						if (r.stage_id !== META_STAGE && r.completed_at) {
							played[r.stage_id] = true;
						}
					}
					const merged: Record<string, unknown> = { ...loadSt(), played };
					if (meta?.extra) {
						const e = meta.extra as Record<string, unknown>;
						if (e.lastScore !== undefined) merged.lastScore = e.lastScore;
						if (e.lastFriend !== undefined) merged.lastFriend = e.lastFriend;
						if (e.lastLv !== undefined) merged.lastLv = e.lastLv;
						if (e.lastDate !== undefined) merged.lastDate = e.lastDate;
						if (e.totalPlayed !== undefined) merged.totalPlayed = e.totalPlayed;
						if (e.wrongHistory !== undefined)
							merged.wrongHistory = e.wrongHistory;
					}
					try {
						localStorage.setItem(SK, JSON.stringify(merged));
					} catch {}
				}
			} catch {}
			if (cancelled) return;
			const st = loadSt();
			if (st.lastScore !== undefined) {
				setLastPlay({
					score: st.lastScore as number,
					friend: (st.lastFriend as string) || "",
					lv: (st.lastLv as number) || 1,
					date: (st.lastDate as string) || "",
				});
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const goBack = useCallback(() => {
		navigate({ to: "/main/game" });
	}, [navigate]);

	const startGame = useCallback(
		(friendId: string, level: number) => {
			const f = friends.find((x) => x.id === friendId);
			if (!f) return;
			const st = loadSt();

			const pool = questions.filter(
				(q) => f.cats.includes(q.cat) && q.level === level,
			);
			const hist = ((st.wrongHistory as string[]) || []).filter((id: string) =>
				pool.find((q) => q.id === id),
			);
			const histQs = hist
				.map((id: string) => pool.find((q) => q.id === id))
				.filter(Boolean) as Question[];
			const rest = shuffle(pool.filter((q) => !hist.includes(q.id)));
			const rounds = [...histQs, ...rest];
			const choices = shuffle([rounds[0].correct, ...rounds[0].wrong]);

			setGame({
				friend: f,
				level,
				rounds,
				cur: 0,
				score: 0,
				answered: false,
				totalR: rounds.length,
				wQueue: [],
				wSet: new Set(),
				w2: new Set(),
				choices,
				chosenAnswer: null,
				retrying: false,
			});
			setScreen("game");
		},
		[friends, questions],
	);

	const choose = useCallback(
		(chosen: string) => {
			if (!game || game.answered) return;
			const q = game.rounds[game.cur];
			const newWSet = new Set(game.wSet);
			const newW2 = new Set(game.w2);
			let newScore = game.score;

			if (chosen === q.correct) {
				newScore++;
				sound.playCorrect();
				speakQuestion(q, 1_400);
			} else {
				playRetrySound();
				if (!newWSet.has(q.id)) {
					newWSet.add(q.id);
					setGame({
						...game,
						answered: false,
						retrying: true,
						wSet: newWSet,
						chosenAnswer: chosen,
					});
					return;
				}
				newW2.add(q.id);
			}

			setGame({
				...game,
				score: newScore,
				answered: true,
				retrying: false,
				wSet: newWSet,
				w2: newW2,
				chosenAnswer: chosen,
			});
		},
		[game, playRetrySound, sound],
	);

	const nextQuestion = useCallback(() => {
		if (!game) return;
		const nextCur = game.cur + 1;

		if (nextCur >= game.rounds.length) {
			if (game.wQueue.length > 0) {
				const newRounds = [...game.rounds, ...game.wQueue];
				const nextQ = newRounds[nextCur];
				setGame({
					...game,
					rounds: newRounds,
					cur: nextCur,
					answered: false,
					retrying: false,
					chosenAnswer: null,
					wQueue: [],
					choices: nextQ ? shuffle([nextQ.correct, ...nextQ.wrong]) : [],
				});
			} else {
				showResult();
			}
			return;
		}

		const nextQ = game.rounds[nextCur];
		setGame({
			...game,
			cur: nextCur,
			answered: false,
			retrying: false,
			chosenAnswer: null,
			choices: shuffle([nextQ.correct, ...nextQ.wrong]),
		});
	}, [game]);

	const showResult = useCallback(() => {
		if (!game) return;
		const total = game.totalR;
		const pct = Math.round((game.score / total) * 100);
		const st = loadSt();
		const newPlayed = ((st.totalPlayed as number) || 0) + 1;
		const played = (st.played as Record<string, boolean>) || {};
		if (pct >= 70) played[`${game.friend.id}_${game.level}`] = true;

		const hist = new Set<string>((st.wrongHistory as string[]) || []);
		game.wSet.forEach((id) => {
			if (game.w2.has(id)) hist.add(id);
			else hist.delete(id);
		});
		game.rounds.slice(0, game.totalR).forEach((q) => {
			if (!game.wSet.has(q.id)) hist.delete(q.id);
		});

		const today = new Date();
		const lastDate = `${today.getMonth() + 1}월 ${today.getDate()}일`;
		saveSt({
			lastScore: game.score,
			lastDate,
			lastFriend: game.friend.name,
			lastLv: game.level,
			totalPlayed: newPlayed,
			totalCorrect: ((st.totalCorrect as number) || 0) + game.score,
			wrongHistory: [...hist],
			played,
		});

		const stageId = `${game.friend.id}_${game.level}`;
		saveGameProgress({
			gameName: GAME_NAME,
			stageId,
			score: game.score,
			completed: pct >= 70,
		});
		saveGameProgress({
			gameName: GAME_NAME,
			stageId: META_STAGE,
			extra: {
				lastScore: game.score,
				lastDate,
				lastFriend: game.friend.name,
				lastLv: game.level,
				totalPlayed: newPlayed,
				wrongHistory: [...hist],
			},
		});

		setLastPlay({
			score: game.score,
			friend: game.friend.name,
			lv: game.level,
			date: `${today.getMonth() + 1}월 ${today.getDate()}일`,
		});
		sound.playMissionChecked();
		if (pct >= 70) confetti.fireBigBang();
		setScreen("result");
	}, [game, sound, confetti]);

	const resetStorage = useCallback(() => {
		if (!confirm("저장 데이터를 초기화할까요?")) return;
		try {
			localStorage.removeItem(SK);
		} catch {
			/* noop */
		}
		setLastPlay(null);
		setScreen("title");
	}, []);

	/* ── Render ── */

	if (contentLoading) {
		return (
			<div className="spg">
				<div className="scr s-title">
					<button type="button" className="back-btn" onClick={goBack}>
						<ArrowLeft size={18} color="#993556" />
					</button>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							height: "100%",
							color: "#993556",
						}}
					>
						로딩 중...
					</div>
				</div>
			</div>
		);
	}
	// 이관한 게임 CSS 는 화면을 data-screen 으로 가른다
	const screenId =
		screen === "title"
			? "pc_title"
			: screen === "select"
				? "pc_select"
				: screen === "result"
					? "pc_result"
					: "pc_game";

	// 이관한 CSS 는 .game-frame[data-screen] .spg 형태다 — .spg 가 하위여야 한다
	return (
		<div className="game-frame" data-screen={screenId}>
			{/* 목업은 .spg 에 --app-width:100% 를 넣었다. 목업에서는 .spg 가 캡처 폭 안에
			    갇혀 있어 문제가 없었지만, 앱의 .spg 는 position:fixed 이고
			    max-width:var(--app-width, 375px) 라 100% 로 덮으면 화면 밖으로 퍼진다.
			    앱에서는 기본값(375px)을 그대로 쓴다. */}
			<div className="spg">
				{screen === "title" && (
					<div className="scr s-title">
						{/* 목업(pc_title)은 이 버튼에 ux-back 을 붙인다 */}
						<button type="button" className="back-btn ux-back" onClick={goBack}>
							<ArrowLeft size={18} color="#993556" />
						</button>
						<TitleBanner />
						<div className="t-body">
							{lastPlay && (
								<div className="t-lp">
									지난 미션: {lastPlay.friend} {lastPlay.lv === 1 ? "🌱" : "🌸"}{" "}
									{lastPlay.score}점 · {lastPlay.date}
								</div>
							)}
							<div className="t-title">🌸 봄 소풍 숫자 미션</div>
							<div className="t-sub">
								친구들과 소풍을 즐기며
								<br />
								한국어 숫자 미션을 완수해요!
							</div>
							<button
								type="button"
								className="t-start"
								onClick={() => setScreen("select")}
							>
								시작하기 🌸
							</button>
						</div>
					</div>
				)}

				{screen === "select" && (
					<div className="scr" style={{ justifyContent: "flex-start" }}>
						<button
							type="button"
							className="back-btn"
							onClick={() => setScreen("title")}
						>
							<ArrowLeft size={18} color="#993556" />
						</button>
						<SmallBanner label="미션 선택" />
						<div className="sel-body">
							<div className="sel-subtitle">친구와 난이도를 골라요</div>
							{friends.map((f) => {
								const st = loadSt();
								const played = (st.played as Record<string, boolean>) || {};
								return (
									<SelectRow
										key={f.id}
										friend={f}
										played={played}
										onStart={startGame}
									/>
								);
							})}
						</div>
					</div>
				)}

				{screen === "game" && game && (
					<GameScreen
						game={game}
						curLang={curLang}
						onChoose={choose}
						onNext={nextQuestion}
						onShowResult={showResult}
						onExit={goBack}
					/>
				)}

				{screen === "result" && game && (
					<ResultScreen
						game={game}
						friends={friends}
						questions={questions}
						onSelectScreen={() => setScreen("select")}
						onReset={resetStorage}
					/>
				)}
			</div>
		</div>
	);
}

/* ══════════════════════════
   Sub-components
══════════════════════════ */

function SelectRow({
	friend,
	played,
	onStart,
}: {
	friend: Friend;
	played: Record<string, boolean>;
	onStart: (id: string, level: number) => void;
}) {
	const [desc, setDesc] = useState(`🌱 ${friend.desc}`);
	return (
		<div className="sel-row">
			<div className="sel-avatar">
				<div className="sel-face">{friend.face}</div>
				<div className="sel-name">{friend.name}</div>
			</div>
			<div className="sel-info">
				<div className="sel-mission">{friend.mission}</div>
				<div className="sel-desc">{desc}</div>
			</div>
			<div className="sel-lvbtns">
				<button
					type="button"
					className="sel-lvbtn easy ux-level"
					onClick={() => onStart(friend.id, 1)}
					onMouseEnter={() => setDesc(`🌱 ${friend.desc}`)}
					onMouseLeave={() => setDesc(`🌱 ${friend.desc}`)}
				>
					<div className={`sel-ck${played[`${friend.id}_1`] ? " show" : ""}`}>
						✓
					</div>
					🌱 쉬움
				</button>
				<button
					type="button"
					className="sel-lvbtn hard ux-level"
					onClick={() => onStart(friend.id, 2)}
					onMouseEnter={() => setDesc(`🌸 ${friend.desc2}`)}
					onMouseLeave={() => setDesc(`🌱 ${friend.desc}`)}
				>
					<div className={`sel-ck${played[`${friend.id}_2`] ? " show" : ""}`}>
						✓
					</div>
					🌸 어려움
				</button>
			</div>
		</div>
	);
}

function GameScreen({
	game,
	curLang,
	onChoose,
	onNext,
	onShowResult,
	onExit,
}: {
	game: GameState;
	curLang: string;
	onChoose: (chosen: string) => void;
	onNext: () => void;
	onShowResult: () => void;
	onExit: () => void;
}) {
	const q = game.rounds[game.cur];
	if (!q) return null;

	const isCorrect = game.chosenAnswer === q.correct;
	const isLast = game.cur >= game.rounds.length - 1 && game.wQueue.length === 0;

	const tmplParts = q.tmpl.split("___");

	return (
		<div className="scr" style={{ justifyContent: "flex-start" }}>
			<div style={{ position: "relative" }}>
				<GameBanner />
				<div className="g-hud">
					<div className="g-tbl">
						<div className="g-av">{game.friend.face}</div>
						<div>
							<div className="g-nm">{game.friend.name}</div>
							<div className="g-ms">
								{game.friend.mission} {game.level === 1 ? "🌱" : "🌸"}
							</div>
						</div>
					</div>
					<div className="g-tbr">
						<div className="g-sbdg">⭐ {game.score}</div>
					</div>
				</div>
			</div>

			<div className="g-progress">
				<div className="g-dots">
					{game.rounds.map((_, i) => {
						const isRetry = i >= game.totalR;
						let cls = "pd";
						if (i < game.cur) cls += " done";
						else if (i === game.cur) cls += " cur";
						if (isRetry) cls += " retry";
						return <div key={`dot-${i}`} className={cls} />;
					})}
				</div>
				<div className="g-prog">
					{game.cur + 1} / {game.rounds.length}
				</div>
			</div>

			<div className="g-card">
				<div className="g-qarea">
					{game.wSet.has(q.id) && <div className="g-rb">🔄 다시 도전!</div>}
					<div className="g-hint">{q.hint[curLang] || q.hint.ko}</div>
					<div className="g-num">{q.num}</div>
					<div className="g-illo-wrap">
						<div className="g-illo">{q.il}</div>
						<div className="g-tmpl">
							{tmplParts[0]}
							<span className="blank">___</span>
							{tmplParts[1]}
						</div>
					</div>
					<div className="g-choices">
						{game.choices.map((c) => {
							// 목업(pc_game)은 선택지에 ux-answer, 나가기에 ux-exit 를 붙인다
							let cls = "ch ux-answer";
							if (game.answered) {
								if (c === q.correct) cls += " ok";
								else if (c === game.chosenAnswer) cls += " ng";
							} else if (game.retrying && c === game.chosenAnswer) {
								cls += " ng";
							}
							return (
								<button
									key={c}
									type="button"
									className={cls}
									disabled={
										game.answered || (game.retrying && c === game.chosenAnswer)
									}
									onClick={() => onChoose(c)}
								>
									{c}
								</button>
							);
						})}
					</div>
				</div>

				<div className="g-bottom">
					{(game.answered || game.retrying) && (
						<>
							<div className={`g-fb ${isCorrect ? "ok" : "ng"}`}>
								<div className={`g-fbi ${isCorrect ? "ok" : "ng"}`}>
									{game.retrying ? "↻" : isCorrect ? "✓" : "✗"}
								</div>
								<div className="g-fbr">
									<div className="g-fbt">
										{game.retrying ? (
											"아쉬워요! 한 번 더 해 보세요."
										) : isCorrect ? (
											q.tts
										) : (
											<>
												정답: <strong>{q.correct}</strong>
											</>
										)}
									</div>
									{game.answered && (
										<button
											type="button"
											className="tbtn"
											onClick={() => speakQuestion(q)}
										>
											🔊
										</button>
									)}
								</div>
							</div>
						</>
					)}
					<div className="g-btn-row">
						<button type="button" className="g-exit ux-exit" onClick={onExit}>
							나가기
						</button>
						{game.answered && (
							<button
								type="button"
								className="g-nxt"
								onClick={
									isLast && game.wQueue.length === 0 ? onShowResult : onNext
								}
							>
								{isLast && game.wQueue.length === 0
									? isCorrect
										? "미션 완료! 🎉"
										: "결과 보기 →"
									: isCorrect
										? "다음 문제 🌸"
										: "다음 문제 →"}
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

function ResultScreen({
	game,
	friends,
	questions,
	onSelectScreen,
	onReset,
}: {
	game: GameState;
	friends: Friend[];
	questions: Question[];
	onSelectScreen: () => void;
	onReset: () => void;
}) {
	const total = game.totalR;
	const pct = Math.round((game.score / total) * 100);
	const st = loadSt();
	const totalPlayed = (st.totalPlayed as number) || 0;

	let banner: string;
	let title: string;
	if (pct >= 90) {
		banner = "🎉 완벽해요!";
		title = "만점에 가까워요!";
	} else if (pct >= 70) {
		banner = "👍 잘했어요!";
		title = "조금만 더 연습해요!";
	} else if (pct >= 50) {
		banner = "🌸 절반 성공!";
		title = "다시 도전해봐요!";
	} else {
		banner = "💪 연습이 필요해요";
		title = "같이 다시 해봐요!";
	}

	const wrongItems = [...game.wSet]
		.map((id) => questions.find((q) => q.id === id))
		.filter(Boolean) as Question[];

	return (
		<div className="scr s-result">
			<div className="r-top">
				<div className="r-scene">
					<div className="r-sky" />
					<div className="r-gr" />
					<div className="r-bnr">{banner}</div>
					<div className="r-chrs">
						{friends.map((f) => (
							<div key={f.id} className="r-chr" style={{ background: f.bg }}>
								{f.face}
							</div>
						))}
					</div>
				</div>
				<div className="r-title">{title}</div>
				<div className="r-score">
					{game.score} / {total}
				</div>
				<div className="r-sub">
					{game.friend.name} {game.level === 1 ? "🌱쉬운" : "🌸어려운"} 미션
				</div>
				<div className="r-stats">
					<div className="r-st">
						<div className="r-stv">{game.score}</div>
						<div className="r-stl">정답</div>
					</div>
					<div className="r-st">
						<div className="r-stv">{pct}%</div>
						<div className="r-stl">정답률</div>
					</div>
					<div className="r-st">
						<div className="r-stv">{totalPlayed}회</div>
						<div className="r-stl">총 플레이</div>
					</div>
				</div>

				{wrongItems.length > 0 && (
					<div className="r-wnote">
						<div className="r-wnt">
							오답 노트 <span className="r-wnc">{wrongItems.length}개</span>
						</div>
						{wrongItems.map((q) => (
							<div key={q.id} className="r-wni">
								<div className="r-wnn">{q.num}</div>
								<div className="r-wnb">
									<div className="r-wntm">{q.tmpl}</div>
									<div className="r-wna">
										정답: {q.correct}
										<button
											type="button"
											className="tbtn"
											onClick={() => speakQuestion(q)}
											style={{ marginLeft: 4 }}
										>
											🔊
										</button>
									</div>
									{game.w2.has(q.id) && <div className="r-wn2">두 번 틀림</div>}
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<div className="r-btns">
				<button type="button" className="r-back" onClick={onSelectScreen}>
					다른 미션 하기 🌸
				</button>
				<button type="button" className="r-rst" onClick={onReset}>
					저장 데이터 초기화
				</button>
			</div>
		</div>
	);
}
