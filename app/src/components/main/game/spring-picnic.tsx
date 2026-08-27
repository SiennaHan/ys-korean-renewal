import {
	getSpringPicnicFriends,
	getSpringPicnicQuestions,
} from "@/api/game-content";
import { getGameProgress, saveGameProgress } from "@/api/game-progress";
import { useConfetti } from "@/components/effect/confetti-provider";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import {
	PcGameView,
	PcResultView,
	PcSelectView,
	PcTitleView,
	speakQuestion,
	stopQuestionAudio,
} from "@/components/main/game/spring-picnic-view";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import useSound from "use-sound";
import "./spring-picnic.css";
import { useScreenFocus } from "./use-screen-focus";

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

/**
 * 지난 미션 줄의 날짜. 새 꼴(lastDateMD: [월, 일])이 있으면 그것으로 짜고,
 * 없으면 예전에 저장된 글자를 그대로 낸다(그 값은 저장될 때의 언어다).
 */
function fmtLastDate(
	t: (k: string, o?: Record<string, unknown>) => string,
	st: Record<string, unknown>,
): string {
	const md = st.lastDateMD;
	if (Array.isArray(md) && md.length === 2) {
		return t("game.springPicnic.date", { month: md[0], day: md[1] });
	}
	return (st.lastDate as string) || "";
}

function saveSt(d: Record<string, unknown>) {
	try {
		localStorage.setItem(SK, JSON.stringify({ ...loadSt(), ...d }));
	} catch {
		/* noop */
	}
}

/* ══════════════════════════
   Main Component

   화면별 표시(제목·소개 배너·선택·플레이·결과 마크업)는 spring-picnic-view.tsx 로
   뽑았다 — activity-parity.tsx 가 화면마다 정적으로 그려 목업과 대조할 수 있게
   하려는 것이다(통짜로 두면 그릴 때 로딩 화면밖에 안 나온다). 상태·판 로직·
   useEffect 는 여기 그대로 있다.
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
	const { t, i18n } = useTranslation();
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
	/*
	 * 화면이 바뀌면 초점을 프레임으로 옮긴다. 왜 필요한지·왜 첫 마운트에도
	 * 옮기는지·왜 프레임에 붙이는지는 `use-screen-focus.ts` 에 적어 뒀다.
	 * 콘텐츠를 받는 동안은 참는다 — 로딩 칸에 줬다가 도로 잃는다.
	 */
	const frameRef = useScreenFocus(screen, !contentLoading);

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
						if (e.lastDateMD !== undefined) merged.lastDateMD = e.lastDateMD;
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
					date: fmtLastDate(t, st),
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
				// 점수는 **첫 시도 정답만** 센다 — games_spec_v1 §2 "정한 것 ①".
				// 전에는 재시도 정답도 newScore++ 해서 첫 시도에 맞힌 사람과 점수가
				// 같았고, 넷 중 하나를 찍고 보는 것이 아무 비용 없는 전략이었다.
				// wSet 은 "한 번이라도 틀렸다" 를 뜻하므로 그것으로 가른다.
				if (!game.wSet.has(q.id)) newScore++;
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
		/*
		 * 두 축을 갈라 둔다 — games_spec_v1 §2 "따라오는 것".
		 *   점수  = "얼마나 잘했나"  → 첫 시도 정답만 (game.score)
		 *   완료  = "끝까지 해냈나"  → 재시도까지 포함해 맞힌 것
		 * 전에는 완료도 score/total 로 재서, 점수를 첫 시도만 세게 하면 완료가
		 * 같이 빡빡해졌다(초급 숫자 게임에서 첫 시도 70%면 친구 하나를 영영 못
		 * 끝내는 사람이 생긴다). 서로 다른 질문이므로 다른 값으로 잰다.
		 * w2 = 두 번 틀린 것이니, 끝까지 맞힌 것은 total - w2 다.
		 */
		const finished = total - game.w2.size;
		const donePct = Math.round((finished / total) * 100);
		const st = loadSt();
		const newPlayed = ((st.totalPlayed as number) || 0) + 1;
		const played = (st.played as Record<string, boolean>) || {};
		if (donePct >= 70) played[`${game.friend.id}_${game.level}`] = true;

		const hist = new Set<string>((st.wrongHistory as string[]) || []);
		game.wSet.forEach((id) => {
			if (game.w2.has(id)) hist.add(id);
			else hist.delete(id);
		});
		game.rounds.slice(0, game.totalR).forEach((q) => {
			if (!game.wSet.has(q.id)) hist.delete(q.id);
		});

		const today = new Date();
		/*
		 * 날짜는 **숫자로** 남긴다. 전에는 `"8월 27일"` 이라는 다 만들어진 글자를
		 * 저장했고, 그 값은 localStorage 와 서버(extra.lastDate) 양쪽에 남는다 —
		 * 나중에 앱 언어를 바꿔도 지난 미션 줄만 한국어로 남는다. 보여 줄 때
		 * 짜도록 월·일을 따로 둔다. 예전 값(lastDate 문자열)은 그대로 읽어
		 * 쓴다 — 다음 판을 하면 스스로 새 꼴로 바뀐다.
		 */
		const lastDateMD = [today.getMonth() + 1, today.getDate()];
		const lastDate = t("game.springPicnic.date", {
			month: lastDateMD[0],
			day: lastDateMD[1],
		});
		saveSt({
			lastDateMD,
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
			completed: donePct >= 70,
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
			date: lastDate,
		});
		sound.playMissionChecked();
		if (donePct >= 70) confetti.fireBigBang();
		setScreen("result");
		/* t — 지난 미션 줄의 날짜를 짤 때 쓴다 */
	}, [game, sound, confetti, t]);

	const resetStorage = useCallback(() => {
		if (!confirm(t("game.springPicnic.resetConfirm"))) return;
		try {
			localStorage.removeItem(SK);
		} catch {
			/* noop */
		}
		setLastPlay(null);
		setScreen("title");
	}, [t]);

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
						{t("game.springPicnic.loading")}
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

	// 이관한 CSS 는 .game-frame[data-screen] .spg 형태다 — .spg 가 하위여야 한다.
	// 다만 결과(pc_result)는 목업에 .spg 가 없다 — pc-result-* 는 .game-frame 의
	// 바로 아래에서 그린다(ps_result·cs_result 와 같은 자리). .spg 안에 넣으면
	// max-width:375px 제약을 그대로 물려받아 목업 구조와도, 폭 계산과도 어긋난다.
	return (
		<div
			ref={frameRef}
			tabIndex={-1}
			aria-label={t("game.springPicnic.aria")}
			className="game-frame"
			data-screen={screenId}
		>
			{screen === "result" && game ? (
				<PcResultView
					game={game}
					friends={friends}
					questions={questions}
					totalPlayed={(loadSt().totalPlayed as number) || 0}
					onSelectScreen={() => setScreen("select")}
					onReset={resetStorage}
				/>
			) : (
				// 목업은 .spg 에 --app-width:100% 를 넣었다. 목업에서는 .spg 가 캡처 폭 안에
				// 갇혀 있어 문제가 없었지만, 앱의 .spg 는 position:fixed 이고
				// max-width:var(--app-width, 375px) 라 100% 로 덮으면 화면 밖으로 퍼진다.
				// 앱에서는 기본값(375px)을 그대로 쓴다.
				<div className="spg">
					{screen === "title" && (
						<PcTitleView
							lastPlay={lastPlay}
							onStart={() => setScreen("select")}
							onBack={goBack}
						/>
					)}

					{screen === "select" && (
						<PcSelectView
							friends={friends}
							played={(loadSt().played as Record<string, boolean>) || {}}
							onStart={startGame}
							onBack={() => setScreen("title")}
						/>
					)}

					{screen === "game" && game && (
						<PcGameView
							game={game}
							curLang={curLang}
							onChoose={choose}
							onNext={nextQuestion}
							onShowResult={showResult}
							onExit={goBack}
						/>
					)}
				</div>
			)}
		</div>
	);
}
