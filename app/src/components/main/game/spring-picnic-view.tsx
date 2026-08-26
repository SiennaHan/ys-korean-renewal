import { ArrowLeft } from "lucide-react";
import { useState } from "react";

/**
 * 봄 소풍 — **표시만** 담당하는 화면들. 판을 굴리는 일은
 * spring-picnic.tsx 가 그대로 한다.
 *
 * 왜 갈랐나 — 목업 대조(scripts/activity-parity.tsx)가 화면마다 검사할 수 있게
 * 하려고. 통짜로 두면 정적으로 그릴 때 첫 화면(로딩)밖에 나오지 않는다.
 * home/view.tsx · game/{list-view,vocashot-view,particle-sniper-view}.tsx 와 같은 꼴이다.
 *
 * 타입은 particle-sniper-view.tsx 와 같은 방식이다 — 컨테이너의 Friend·Question·
 * GameState 를 그대로 import 하지 않고, 구조만 맞는 Pc* 타입을 여기서 따로 정의한다.
 * 두 파일이 서로 몰라도 되게 하는 것이 목적이다.
 */

export interface PcFriend {
	id: string;
	face: string;
	name: string;
	bg: string;
	cats: string[];
	mission: string;
	desc: string;
	desc2: string;
}

export interface PcQuestion {
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

export interface PcGameState {
	friend: PcFriend;
	level: number;
	rounds: PcQuestion[];
	cur: number;
	score: number;
	answered: boolean;
	totalR: number;
	wQueue: PcQuestion[];
	wSet: Set<string>;
	w2: Set<string>;
	choices: string[];
	chosenAnswer: string | null;
	retrying: boolean;
}

export interface PcLastPlay {
	score: number;
	friend: string;
	lv: number;
	date: string;
}

/* ══════════════════════════
   문항 오디오 — speakQuestion 은 GameView·ResultView 의 🔊 버튼과
   컨테이너의 choose() 가 같이 쓴다. 모듈 스코프 상태(activeQuestionAudio)라
   한 군데(여기)에만 있어야 한다.
══════════════════════════ */

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

export function stopQuestionAudio() {
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

export function speakQuestion(
	question: { id: string; tts: string },
	delayMs = 0,
) {
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
   장식 배너 — 목업(screens_uiux 의 게임 절)이 봄소풍 장면마다 넣던 것이다.
   목업은 캡처한 DOM 에 런타임으로 append 했지만(polishFrame, scene.append(sun,petals[,basket]))
   앱에서는 마크업에 둔다 — 그래서 해·꽃잎(·바구니)이 장면의 **맨 뒤**에 와야
   목업과 순서가 같다. 해와 꽃잎은 모든 장면에, 바구니는 t-illo 장면에만 들어간다.
══════════════════════════ */
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
			<PicnicDecor basket />
		</div>
	);
}

function SmallBanner({ label }: { label: string }) {
	return (
		<div
			className="t-illo ux-picnic-scene"
			style={{ flex: "0 0 120px", minHeight: 120, maxHeight: 120 }}
		>
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
					// 목업 캡처는 브라우저가 직렬화한 "inset: 0px" — 숫자 0 을 그대로 두면
					// React 는 단위 없는 "inset:0" 을 쓴다. 문자열로 줘서 px 를 붙인다.
					inset: "0px",
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
			<PicnicDecor basket />
		</div>
	);
}

function GameBanner() {
	return (
		<div className="g-header ux-picnic-scene">
			{/* g-header 는 t-illo 가 아니므로 바구니가 없다 */}
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
			<PicnicDecor />
		</div>
	);
}

/* ══════════════════════════
   title — game__pc_title
══════════════════════════ */

export interface PcTitleViewProps {
	lastPlay: PcLastPlay | null;
	onStart: () => void;
	onBack: () => void;
}

export function PcTitleView({ lastPlay, onStart, onBack }: PcTitleViewProps) {
	return (
		<div className="scr s-title">
			{/* 목업(pc_title)은 이 버튼에 ux-back 을 붙인다 — ux-control 은 모든 버튼에 붙는다 */}
			<button
				type="button"
				className="back-btn ux-control ux-back"
				onClick={onBack}
			>
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
				<button type="button" className="t-start ux-control" onClick={onStart}>
					시작하기 🌸
				</button>
			</div>
		</div>
	);
}

/* ══════════════════════════
   select — game__pc_select
══════════════════════════ */

function SelectRow({
	friend,
	played,
	onStart,
}: {
	friend: PcFriend;
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
					className="sel-lvbtn easy ux-control ux-level"
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
					className="sel-lvbtn hard ux-control ux-level"
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

export interface PcSelectViewProps {
	friends: PcFriend[];
	/** "{friendId}_{level}" → 완료 여부. 컨테이너가 localStorage 에서 한 번 읽어 넘긴다 */
	played: Record<string, boolean>;
	onStart: (friendId: string, level: number) => void;
	onBack: () => void;
}

export function PcSelectView({
	friends,
	played,
	onStart,
	onBack,
}: PcSelectViewProps) {
	return (
		<div className="scr" style={{ justifyContent: "flex-start" }}>
			{/* 목업(pc_select)은 이 화면의 버튼 전부에 ux-level 을 붙인다(뒤로가기 포함) */}
			<button
				type="button"
				className="back-btn ux-control ux-level"
				onClick={onBack}
			>
				<ArrowLeft size={18} color="#993556" />
			</button>
			<SmallBanner label="미션 선택" />
			<div className="sel-body">
				<div className="sel-subtitle">친구와 난이도를 골라요</div>
				{friends.map((f) => (
					<SelectRow key={f.id} friend={f} played={played} onStart={onStart} />
				))}
			</div>
		</div>
	);
}

/* ══════════════════════════
   game — game__pc_game
══════════════════════════ */

export interface PcGameViewProps {
	game: PcGameState;
	curLang: string;
	onChoose: (chosen: string) => void;
	onNext: () => void;
	onShowResult: () => void;
	onExit: () => void;
}

export function PcGameView({
	game,
	curLang,
	onChoose,
	onNext,
	onShowResult,
	onExit,
}: PcGameViewProps) {
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
							// 목업(pc_game)은 선택지에 ux-answer, 나가기에 ux-exit 를 붙인다.
							// ux-control 은 모든 버튼에 붙는다
							let cls = "ch ux-control ux-answer";
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
										className="tbtn ux-control"
										onClick={() => speakQuestion(q)}
									>
										🔊
									</button>
								)}
							</div>
						</div>
					)}
					<div className="g-btn-row">
						<button
							type="button"
							className="g-exit ux-control ux-exit"
							onClick={onExit}
						>
							나가기
						</button>
						{game.answered && (
							<button
								type="button"
								className="g-nxt ux-control"
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

/* ══════════════════════════
   result — game__pc_result

   확정 목업(game__pc_result)은 옛 봄소풍 결과(r-*)와 마크업이 통째로 다르다 —
   pc-result-* 클래스다(game.css 에 이미 있고, 컴포넌트가 그리지 않아 죽어
   있던 24줄이 이거다 · BLOCKERS.md "그리고 둘은 CSS 가 죽어 있다"). 목업이
   기준이므로 마크업을 pc-result-* 로 다시 짰다.

   통계 세 자리(첫 시도 정답 · 끝까지 맞힘 · 점수 정답률)는 라벨만 목업에
   맞춘 게 아니라, 어떤 값이 어느 라벨에 가는지도 목업의 표본 숫자(4 · 5 · 6 ·
   67%)를 거꾸로 풀어야 했다 — 집계 방식(choose() · showResult())은 그대로
   두고, 이미 쌓아 두던 wSet·w2 만으로 아래처럼 나눴다:
     - 첫 시도 정답 = totalR - wSet.size (한 번도 안 틀린 문항 수)
     - 끝까지 맞힘  = totalR - w2.size   (두 번째까지 맞힌 문항 수. "2번 틀리면
       넘어간다" 규칙이라 이 둘의 차 = 재도전으로 건진 문항 수)
     - 점수 정답률  = round(첫 시도 정답 / total * 100)
   맨 위 큰 숫자(점수)도 "첫 시도 정답" 을 쓴다 — 목업 표본이 헤드라인(4)과
   "첫 시도 정답" 스탯(4)을 같은 값으로, "끝까지 맞힘"(5)은 **다른** 값으로
   보여 주기 때문이다. 배너·문구의 등급(90/70/50%)은 "끝까지 맞힘" 비율로
   가른다 — 표본이 점수 정답률 67%(50~69% 구간)인데도 ">=70%" 문구("👍
   잘했어요!")를 보여 줘서, 등급이 첫 시도가 아니라 완료 여부를 본다는 뜻으로
   읽었다(games_spec_v1 §2 "완료 판정은 그대로").

   **집계도 §2 대로 고쳤다 (2026-08-24).** 전에는 choose() 가 재도전 정답에도
   점수를 줘서 game.score 가 이 화면의 어느 값과도 맞지 않았고, showResult() 의
   완료 판정이 그 점수를 봐서 **화면의 등급과 실제 완료가 갈릴 수 있었다.**
   이제 둘 다 §2 를 따른다 — choose() 는 wSet 으로 첫 시도를 가려 점수를 주고,
   showResult() 의 완료는 "끝까지 맞힘"(total - w2.size) 비율로 판정한다.
   그래서 지금은 game.score === firstTry 이고, 배너 등급과 완료 판정이 같은
   값(w2 비율)을 본다.

   그런데도 이 화면은 game.score 를 쓰지 않고 wSet·w2 에서 다시 센다. 두 값이
   같아졌으니 어느 쪽을 써도 되지만, **같은 수를 두 군데 따로 적어 두면
   어긋난다**는 것이 이 저장소에서 이미 겪은 일이다(조사 스나이퍼 결과에서
   분수와 정확도를 answered 하나에서 파생시킨 것과 같은 이유). wSet·w2 가
   원천이므로 표시도 거기서 파생시킨다 — 집계가 또 바뀌어도 이 화면은
   저절로 따라온다.

   오답 노트의 🔊 는 목업에 버튼이 아니라 그냥 글자로 박혀 있다. 마크업은
   목업 그대로 두고, 재생은 onClick 을 그 div 에 얹어 되살렸다 — 자세한 것은
   그 자리의 주석에 적었다.
══════════════════════════ */

export interface PcResultViewProps {
	game: PcGameState;
	/** 결과 장면 위쪽에 뜨는 친구 아이콘 무리 — 목업 표본은 3명이다 */
	friends: PcFriend[];
	questions: PcQuestion[];
	/** "총 플레이 N회" — 컨테이너가 localStorage 에서 한 번 읽어 넘긴다 */
	totalPlayed: number;
	onSelectScreen: () => void;
	onReset: () => void;
}

export function PcResultView({
	game,
	friends,
	questions,
	totalPlayed,
	onSelectScreen,
	onReset,
}: PcResultViewProps) {
	const total = game.totalR;
	const firstTry = total - game.wSet.size;
	const finalCorrect = total - game.w2.size;
	const firstTryPct = total > 0 ? Math.round((firstTry / total) * 100) : 0;
	const finalPct = total > 0 ? Math.round((finalCorrect / total) * 100) : 0;

	let banner: string;
	let title: string;
	if (finalPct >= 90) {
		banner = "🎉 완벽해요!";
		title = "만점에 가까워요!";
	} else if (finalPct >= 70) {
		banner = "👍 잘했어요!";
		title = "조금만 더 연습해요!";
	} else if (finalPct >= 50) {
		banner = "🌸 절반 성공!";
		title = "다시 도전해봐요!";
	} else {
		banner = "💪 연습이 필요해요";
		title = "같이 다시 해봐요!";
	}

	const wrongItems = [...game.wSet]
		.map((id) => questions.find((q) => q.id === id))
		.filter(Boolean) as PcQuestion[];

	return (
		<div className="result-screen pc-result">
			<div className="pc-result-scroll">
				<div className="pc-result-scene">
					<div className="pc-result-cloud" />
					<div className="pc-result-sun" />
					<div className="pc-result-banner">{banner}</div>
					<div className="pc-result-mat" />
					<div className="pc-result-friends">
						{friends.map((f) => (
							<div key={f.id} className="pc-result-friend">
								{f.face}
							</div>
						))}
					</div>
				</div>
				<div className="pc-result-main">
					<div className="pc-result-title">{title}</div>
					<div className="pc-result-score">
						{firstTry} / {total}
					</div>
					<div className="pc-result-sub">
						{game.friend.name} {game.level === 1 ? "🌱 쉬운" : "🌸 어려운"} 미션
						· 총 플레이 {totalPlayed}회
					</div>
				</div>

				<div className="pc-result-stats">
					<div className="pc-result-stat">
						<b>{firstTry}</b>
						<span>첫 시도 정답</span>
					</div>
					<div className="pc-result-stat">
						<b>{finalCorrect}</b>
						<span>끝까지 맞힘</span>
					</div>
					<div className="pc-result-stat">
						<b>{firstTryPct}%</b>
						<span>점수 정답률</span>
					</div>
				</div>

				{wrongItems.length > 0 && (
					<div className="pc-wrong">
						<div className="pc-wrong-head">
							오답 노트 <span>{wrongItems.length}개</span>
						</div>
						{wrongItems.map((q) => (
							<div key={q.id} className="pc-wrong-row">
								<div className="pc-wrong-num">{q.num}</div>
								<div className="pc-wrong-copy">
									<div>{q.tmpl}</div>
									{/*
									 * 🔊 는 문항을 다시 듣는 **버튼**이다. 옛 판(r-wna 안의 <button>)에 있던
									 * 기능인데, 목업이 이 자리를 글자로만 두어서 마크업을 목업에 맞추자
									 * 같이 빠졌다. div 에 onClick 만 얹어 되살려 봤지만 그러면 키보드로
									 * 닿지 않는다 — 그래서 **목업 쪽을 고쳤다**(2026-08-24 결정).
									 * app/src/screens_ref/game__pc_result.html 이 정본이고 거기에 버튼을 넣었다.
									 * phase1/_snapshots/ 의 날것 캡처와는 갈라지므로 check_docs.py 의
									 * TWIN_ALLOW 에 이유를 적어 두었다 — 홈 셋이 이미 같은 길을 갔다.
									 * 라벨은 목업에 적힌 글자 그대로 둔다. 이 게임은 t() 를 한 번도
									 * 쓰지 않고 모든 한글이 목업대로 박혀 있어서(컨테이너가
									 * useTranslation 을 쓰는 것은 힌트 언어 i18n.language 를 읽으려는
									 * 것뿐이다), 이 라벨 하나만 i18n 을 끌어오면 도리어 어긋난다.
									 * 이 게임을 다국어로 돌릴 때 이 줄도 같이 간다 —
									 * 그때 쓸 키는 이미 5개 로케일에 있다(activity.playSentence).
									 * 두 번 틀린 행은 그 자리에 "두 번 틀림" 이 들어가 버튼이 없다.
									 */}
									<div className="pc-wrong-answer">
										정답: {q.correct} ·{" "}
										{game.w2.has(q.id) ? (
											"두 번 틀림"
										) : (
											<button
												type="button"
												className="pc-wrong-play ux-control ux-replay"
												aria-label="문장 다시 듣기"
												onClick={() => speakQuestion(q)}
											>
												🔊
											</button>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<div className="pc-result-actions">
				<button
					type="button"
					className="pc-result-primary ux-control"
					onClick={onSelectScreen}
				>
					다른 미션 하기 🌸
				</button>
				<button
					type="button"
					className="pc-result-reset ux-control"
					onClick={onReset}
				>
					저장 데이터 초기화
				</button>
			</div>
		</div>
	);
}
