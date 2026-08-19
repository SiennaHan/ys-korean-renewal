import {
	getRoom,
	listMeteors,
	listPlayers,
	submitAnswer,
	subscribeAnswerSubmitted,
	subscribeMeteorSpawned,
	subscribeMeteorUpdate,
	subscribePlayerUpdate,
	subscribeRoomUpdate,
} from "@/lib/vocashot/appsync";
import type {
	AnswerResult,
	InputMode,
	Meteor,
	Player,
	Room,
	VocabQuestion,
} from "@/lib/vocashot/types";
import { useSharedAudio } from "@/components/audio/audio-provider";
import { useConfetti } from "@/components/effect/confetti-provider";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/main/game/vocashot_/$pin")({
	component: VocaShotGamePage,
});

type FeedbackState = "idle" | "first" | "grace" | "wrong";

const PLAYER_STORAGE_KEY = "vocashot-player";

type StoredPlayer = { pin: string; playerId: string; nickname: string };

function loadStoredPlayer(): StoredPlayer | null {
	try {
		const raw = localStorage.getItem(PLAYER_STORAGE_KEY);
		if (!raw) return null;
		const data = JSON.parse(raw) as unknown;
		if (
			data &&
			typeof data === "object" &&
			"pin" in data &&
			"playerId" in data &&
			"nickname" in data &&
			typeof (data as StoredPlayer).pin === "string" &&
			typeof (data as StoredPlayer).playerId === "string" &&
			typeof (data as StoredPlayer).nickname === "string"
		) {
			return data as StoredPlayer;
		}
	} catch {
		// ignore
	}
	return null;
}

function FallingMeteor({
	meteor,
	question,
	isHit,
}: {
	meteor: Meteor;
	question: { image?: string; english?: string };
	isHit: boolean;
}) {
	const timingRef = useRef<{ durationSec: number; delaySec: number } | null>(
		null,
	);
	if (timingRef.current === null) {
		timingRef.current = {
			durationSec: (meteor.expiresAt - meteor.spawnedAt) / 1000,
			delaySec: (meteor.spawnedAt - Date.now()) / 1000,
		};
	}
	const { durationSec, delaySec } = timingRef.current;

	return (
		<div
			className="-translate-x-1/2 absolute top-0 left-1/2"
			style={{
				animation: `vocashot-meteor-fall ${durationSec}s linear forwards`,
				animationDelay: `${delaySec}s`,
				animationPlayState: isHit ? "paused" : "running",
			}}
		>
			<div
				className={`flex flex-col items-center gap-2 rounded-3xl border border-slate-700 bg-slate-900/90 px-6 py-5 shadow-xl ${isHit ? "vocashot-meteor-hit" : "vocashot-question-enter"}`}
			>
				{question.image &&
					(question.image.startsWith("http") ||
					question.image.startsWith("/") ? (
						<img
							src={question.image}
							alt=""
							style={{ maxWidth: "60px", height: "auto" }}
							className="rounded-lg object-cover"
						/>
					) : (
						<span className="text-6xl">{question.image}</span>
					))}
				{question.english && (
					<span className="font-semibold text-2xl">{question.english}</span>
				)}
			</div>
		</div>
	);
}

function VocaShotGamePage() {
	const { pin } = Route.useParams();
	const navigate = useNavigate();
	const { t } = useTranslation();
	const { firePop } = useConfetti();
	const { playUrl } = useSharedAudio();

	const [room, setRoom] = useState<Room | null>(null);
	const [playerId, setPlayerId] = useState<string | null>(null);
	const [nickname, setNickname] = useState<string>("");
	const [players, setPlayers] = useState<Player[]>([]);
	const [meteors, setMeteors] = useState<Meteor[]>([]);
	const [nowMs, setNowMs] = useState<number>(Date.now());
	const [easyChoiceLockMs, setEasyChoiceLockMs] = useState<number>(0);
	const [hardInput, setHardInput] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [feedback, setFeedback] = useState<FeedbackState>("idle");
	const [showResultsOverlay, setShowResultsOverlay] = useState(false);
	const [isQuestionChanging, setIsQuestionChanging] = useState(false);
	const [showExitConfirm, setShowExitConfirm] = useState(false);
	const [skippedMeteorIds, setSkippedMeteorIds] = useState<Set<string>>(
		() => new Set(),
	);
	const [hitSnapshot, setHitSnapshot] = useState<{
		meteor: Meteor;
		question: VocabQuestion;
	} | null>(null);

	const prevPhaseRef = useRef<string | null>(null);
	const prevMeteorIdRef = useRef<string | null>(null);

	// Recover session from localStorage
	useEffect(() => {
		const stored = loadStoredPlayer();
		if (stored && stored.pin === pin) {
			setPlayerId(stored.playerId);
			setNickname(stored.nickname);
		}
	}, [pin]);

	// Update nowMs periodically
	useEffect(() => {
		if (!playerId) return;
		setNowMs(Date.now());
		const id = setInterval(() => setNowMs(Date.now()), 200);
		return () => clearInterval(id);
	}, [playerId]);

	// Poll for data as backup
	const fetchData = useCallback(async () => {
		if (!pin) return;
		try {
			const [roomData, playersData, meteorsData] = await Promise.all([
				getRoom(pin),
				listPlayers(pin),
				listMeteors(pin),
			]);
			if (roomData) setRoom(roomData);
			if (playersData) setPlayers(playersData);
			if (meteorsData) setMeteors(meteorsData);
		} catch {
			// ignore polling errors
		}
	}, [pin]);

	useEffect(() => {
		if (!pin || !playerId) return;
		fetchData();
		const id = setInterval(fetchData, 2000);
		return () => clearInterval(id);
	}, [pin, playerId, fetchData]);

	// AppSync subscriptions
	useEffect(() => {
		if (!pin || !playerId) return;

		const subs: { unsubscribe: () => void }[] = [];

		subs.push(
			subscribeRoomUpdate(pin, (updatedRoom) => {
				setRoom(updatedRoom);
			}),
		);

		subs.push(
			subscribePlayerUpdate(pin, (updatedPlayer) => {
				setPlayers((prev) => {
					const idx = prev.findIndex(
						(p) => p.playerId === updatedPlayer.playerId,
					);
					if (idx >= 0) {
						const next = [...prev];
						next[idx] = updatedPlayer;
						return next;
					}
					return [...prev, updatedPlayer];
				});
			}),
		);

		subs.push(
			subscribeMeteorSpawned(pin, (meteor) => {
				setMeteors((prev) => {
					const idx = prev.findIndex((m) => m.meteorId === meteor.meteorId);
					if (idx >= 0) {
						const next = [...prev];
						next[idx] = meteor;
						return next;
					}
					return [...prev, meteor];
				});
			}),
		);

		subs.push(
			subscribeMeteorUpdate(pin, (meteor) => {
				setMeteors((prev) => {
					const idx = prev.findIndex((m) => m.meteorId === meteor.meteorId);
					if (idx >= 0) {
						const next = [...prev];
						next[idx] = meteor;
						return next;
					}
					return [...prev, meteor];
				});
			}),
		);

		subs.push(
			subscribeAnswerSubmitted(pin, (_answer) => {
				// Trigger a poll to get latest state
				fetchData();
			}),
		);

		return () => {
			for (const sub of subs) {
				sub.unsubscribe();
			}
		};
	}, [pin, playerId, fetchData]);

	// Track phase transitions for results overlay
	useEffect(() => {
		if (!room) return;
		const phase = room.runtime.phase;

		if (prevPhaseRef.current === null) {
			prevPhaseRef.current = phase;
			setShowResultsOverlay(false);
			return;
		}

		const prev = prevPhaseRef.current;
		prevPhaseRef.current = phase;

		if (phase === "ENDED" && prev !== "ENDED") {
			setShowResultsOverlay(true);
			const id = setTimeout(() => setShowResultsOverlay(false), 8000);
			return () => clearTimeout(id);
		}

		if (phase !== "ENDED") {
			setShowResultsOverlay(false);
		}

		if (prev === "ENDED" && phase !== "ENDED") {
			setSkippedMeteorIds(new Set());
		}
	}, [room?.runtime.phase]);

	// Easy choice lockout countdown
	useEffect(() => {
		if (easyChoiceLockMs <= 0) {
			setFeedback((f) => (f === "wrong" ? "idle" : f));
			return;
		}
		const id = setInterval(() => {
			setEasyChoiceLockMs((ms) => {
				if (ms <= 500) {
					clearInterval(id);
					return 0;
				}
				return ms - 500;
			});
		}, 500);
		return () => clearInterval(id);
	}, [easyChoiceLockMs]);

	const self = useMemo(() => {
		if (!playerId) return null;
		return players.find((p) => p.playerId === playerId) ?? null;
	}, [players, playerId]);

	const sortedPlayers = useMemo(
		() => [...players].sort((a, b) => b.score - a.score),
		[players],
	);

	const myRank = useMemo(() => {
		if (!playerId) return 0;
		const idx = sortedPlayers.findIndex((p) => p.playerId === playerId);
		return idx === -1 ? 0 : idx + 1;
	}, [sortedPlayers, playerId]);

	const activeMeteor: Meteor | null = useMemo(() => {
		const list = meteors.filter(
			(m) =>
				m.status === "FALLING" &&
				m.spawnedAt <= nowMs + 100 &&
				!skippedMeteorIds.has(m.meteorId),
		);
		if (list.length === 0) return null;
		return list.sort((a, b) => a.spawnedAt - b.spawnedAt)[0];
	}, [meteors, nowMs, skippedMeteorIds]);

	const currentQuestion = useMemo(() => {
		if (!room || !activeMeteor) return null;
		return room.config.questions[activeMeteor.questionIndex] ?? null;
	}, [room, activeMeteor]);

	const displayMeteor: Meteor | null = hitSnapshot?.meteor ?? activeMeteor;
	const displayQuestion: VocabQuestion | null =
		hitSnapshot?.question ?? currentQuestion;

	useEffect(() => {
		const newId = activeMeteor?.meteorId ?? null;
		const prevId = prevMeteorIdRef.current;
		if (newId && prevId && prevId !== newId) {
			setIsQuestionChanging(true);
			const id = setTimeout(() => setIsQuestionChanging(false), 400);
			prevMeteorIdRef.current = newId;
			return () => clearTimeout(id);
		}
		prevMeteorIdRef.current = newId;
	}, [activeMeteor?.meteorId]);

	const inputMode: InputMode | null = room?.config.inputMode ?? null;

	const displayQuestionRef = useRef(displayQuestion);
	displayQuestionRef.current = displayQuestion;

	const easyChoices = useMemo(() => {
		const q = displayQuestionRef.current;
		if (!q) return [];
		const wrongCandidates = q.wrong ?? [];
		const selectedWrong = [...wrongCandidates];
		for (let i = selectedWrong.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			[selectedWrong[i], selectedWrong[j]] = [
				selectedWrong[j],
				selectedWrong[i],
			];
		}
		const wrongPick3 = selectedWrong.slice(0, 3);

		const options = [q.answer, ...wrongPick3];
		for (let i = options.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			[options[i], options[j]] = [options[j], options[i]];
		}
		return options;
	}, [displayMeteor?.meteorId]);

	const isLocked =
		easyChoiceLockMs > 0 ||
		isSubmitting ||
		isQuestionChanging ||
		hitSnapshot !== null;

	const handleSubmitAnswer = async (text: string) => {
		if (!room || !activeMeteor || !currentQuestion || !playerId || !pin) {
			return;
		}

		const normalized = text.trim();
		if (!normalized) return;

		setIsSubmitting(true);

		try {
			const result = await submitAnswer({
				pin,
				meteorId: activeMeteor.meteorId,
				playerId,
				answerText: normalized,
			});

			const answerResult = result.result as AnswerResult;
			const answeredMeteor = activeMeteor;
			const answeredQuestion = currentQuestion;

			if (answerResult === "WRONG") {
				setSkippedMeteorIds((prev) => {
					const next = new Set(prev);
					next.add(answeredMeteor.meteorId);
					return next;
				});
				setFeedback("wrong");
				setTimeout(() => setFeedback("idle"), 600);
			} else if (answerResult === "FIRST" || answerResult === "GRACE") {
				firePop();
				void playUrl("/sounds/correct.mp3");
				setHitSnapshot({ meteor: answeredMeteor, question: answeredQuestion });
				setSkippedMeteorIds((prev) => {
					const next = new Set(prev);
					next.add(answeredMeteor.meteorId);
					return next;
				});
				setFeedback(answerResult === "FIRST" ? "first" : "grace");
				setTimeout(() => {
					setHitSnapshot(null);
					setFeedback("idle");
				}, 500);
			}

			if (inputMode === "hard") {
				setHardInput("");
			}

			// Refresh data after answer
			fetchData();
		} catch (err) {
			console.error("Submit answer error:", err);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleEasyClick = async (choice: string) => {
		if (isLocked) return;
		await handleSubmitAnswer(choice);
	};

	const handleHardSubmit = async () => {
		if (!hardInput.trim() || isLocked) return;
		await handleSubmitAnswer(hardInput);
	};

	const joined = !!playerId;

	const feedbackBgClass =
		feedback === "first" || feedback === "grace"
			? "bg-emerald-900/60"
			: feedback === "wrong"
				? "vocashot-shake bg-rose-900/60"
				: "";

	if (!joined) {
		return (
			<div
				className="-translate-x-1/2 fixed top-0 bottom-0 left-1/2 z-50 flex w-full items-center justify-center bg-slate-950 text-slate-50"
				style={{ maxWidth: "var(--app-width, 375px)" }}
			>
				<p className="text-slate-400">{t("game.vocashot.recoveringSession")}</p>
			</div>
		);
	}

	return (
		<>
			<style>{`
				@keyframes vocashot-shake {
					0%, 100% { transform: translateX(0); }
					10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
					20%, 40%, 60%, 80% { transform: translateX(4px); }
				}
				.vocashot-shake {
					animation: vocashot-shake 0.5s ease-in-out;
				}
				@keyframes vocashot-question-enter {
					0% { transform: scale(0.85); opacity: 0; }
					60% { transform: scale(1.05); opacity: 1; }
					100% { transform: scale(1); opacity: 1; }
				}
				.vocashot-question-enter {
					animation: vocashot-question-enter 0.3s ease-out;
				}
				@keyframes vocashot-meteor-fall {
					from { top: -10%; }
					to { top: 100%; }
				}
				@keyframes vocashot-meteor-hit {
					0% { transform: scale(1); opacity: 1; }
					40% { transform: scale(1.4); opacity: 1; }
					100% { transform: scale(0.6); opacity: 0; }
				}
				.vocashot-meteor-hit {
					animation: vocashot-meteor-hit 0.5s ease-out forwards;
				}
			`}</style>
			<main
				className="-translate-x-1/2 fixed top-0 bottom-0 left-1/2 z-50 w-full bg-slate-950 text-slate-50"
				style={{ maxWidth: "var(--app-width, 375px)" }}
			>
				<div
					className={`flex h-full flex-col overflow-hidden px-4 py-6 ${feedbackBgClass}`}
				>
					{/* Header */}
					<header className="flex items-center justify-between border-slate-800 border-b pb-4">
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setShowExitConfirm(true)}
								className="flex size-[28px] items-center justify-center rounded-full bg-slate-800"
							>
								<ArrowLeft size={16} color="#94a3b8" />
							</button>
							<div>
								<h1 className="font-semibold text-lg tracking-tight">
									VocaShot
								</h1>
								<p className="text-slate-400 text-xs">{nickname}</p>
							</div>
						</div>
						{self && (
							<div className="flex items-center gap-3 text-right">
								{myRank > 0 && (
									<div className="text-right">
										<p className="text-[10px] text-slate-500 uppercase tracking-wide">
											RANK
										</p>
										<p className="font-mono font-semibold text-amber-400 text-xl">
											#{myRank}
											<span className="ml-0.5 font-normal text-slate-500 text-xs">
												/{players.length}
											</span>
										</p>
									</div>
								)}
								<div className="text-right">
									<p className="text-[10px] text-slate-500 uppercase tracking-wide">
										SCORE
									</p>
									<p className="font-mono font-semibold text-emerald-400 text-xl">
										{self.score}
									</p>
								</div>
							</div>
						)}
					</header>

					{/* Results overlay when game ends */}
					{room?.runtime.phase === "ENDED" && showResultsOverlay && (
						<section className="flex flex-1 flex-col items-center justify-center gap-6 py-8">
							<h2
								className={`font-bold text-3xl tracking-tight ${
									room.runtime.status === "SUCCESS"
										? "text-emerald-400"
										: "text-rose-400"
								}`}
							>
								{room.runtime.status === "SUCCESS"
									? t("game.vocashot.missionSuccess")
									: t("game.vocashot.gameOver")}
							</h2>
							<p className="text-center text-slate-400">
								{room.runtime.status === "SUCCESS"
									? t("game.vocashot.defendedDesc")
									: t("game.vocashot.heartsZeroDesc")}
							</p>
							<div className="w-full max-w-xs rounded-2xl border border-slate-700 bg-slate-900/80 px-6 py-4 text-center">
								<p className="mb-1 text-[10px] text-slate-500 uppercase tracking-wide">
									{t("game.vocashot.yourScore")}
								</p>
								<p className="font-bold font-mono text-4xl text-emerald-400">
									{self?.score ?? 0}
								</p>
								{myRank > 0 && (
									<p className="mt-2 text-slate-400 text-sm">
										{t("game.vocashot.yourRank")} #{myRank}
									</p>
								)}
							</div>
							<div className="w-full max-w-xs">
								<p className="mb-2 text-center text-[10px] text-slate-500 uppercase tracking-wide">
									{t("game.vocashot.top5")}
								</p>
								<div className="flex flex-col gap-2">
									{sortedPlayers.slice(0, 5).map((player, index) => (
										<div
											key={player.playerId}
											className={`flex items-center justify-between rounded-xl px-4 py-2 ${
												player.playerId === playerId
													? "border border-emerald-500/50 bg-emerald-500/20"
													: "border border-slate-700 bg-slate-900/80"
											}`}
										>
											<span className="w-6 text-center font-bold text-slate-500">
												{index + 1}
											</span>
											<span className="mx-2 flex-1 truncate font-semibold">
												{player.nickname}
											</span>
											<span className="font-mono font-semibold text-emerald-400">
												{player.score}
											</span>
										</div>
									))}
								</div>
							</div>
							<p className="text-center text-slate-500 text-xs">
								{t("game.vocashot.checkScreenRanking")}
							</p>
							<button
								type="button"
								onClick={() => {
									localStorage.removeItem("vocashot-player");
									navigate({ to: "/main/game" });
								}}
								className="mt-4 w-full max-w-xs rounded-2xl bg-slate-700 py-3 font-semibold text-slate-200 text-sm transition hover:bg-slate-600"
							>
								{t("game.vocashot.exit")}
							</button>
						</section>
					)}

					{/* Ended but overlay dismissed */}
					{room?.runtime.phase === "ENDED" && !showResultsOverlay && (
						<section className="flex flex-1 flex-col items-center justify-center gap-6 py-10">
							<h2
								className={`font-bold text-2xl tracking-tight ${
									room.runtime.status === "SUCCESS"
										? "text-emerald-400"
										: "text-rose-400"
								}`}
							>
								{room.runtime.status === "SUCCESS"
									? t("game.vocashot.missionSuccess")
									: t("game.vocashot.gameOver")}
							</h2>
							<div className="w-full max-w-xs rounded-2xl border border-slate-700 bg-slate-900/80 px-6 py-4 text-center">
								<p className="mb-1 text-[10px] text-slate-500 uppercase tracking-wide">
									{t("game.vocashot.yourScore")}
								</p>
								<p className="font-bold font-mono text-3xl text-emerald-400">
									{self?.score ?? 0}
								</p>
							</div>
							<p className="text-center text-slate-500 text-sm">
								{t("game.vocashot.waitingNextGame")}
							</p>
							<button
								type="button"
								onClick={() => {
									localStorage.removeItem("vocashot-player");
									navigate({ to: "/main/game" });
								}}
								className="mt-4 w-full max-w-xs rounded-2xl bg-slate-700 py-3 font-semibold text-slate-200 text-sm transition hover:bg-slate-600"
							>
								{t("game.vocashot.exit")}
							</button>
						</section>
					)}

					{/* Waiting / Playing */}
					{room?.runtime.phase !== "ENDED" && (
						<section className="flex flex-1 flex-col pt-4">
							{/* Status message */}
							<div className="mb-4 text-center text-slate-400 text-sm">
								{room?.runtime.phase === "PLAYING"
									? t("game.vocashot.playingInstruction")
									: t("game.vocashot.waitingTeacher")}
							</div>

							{/* Falling meteor area */}
							<div className="relative mt-auto mb-4 flex-1 overflow-hidden">
								{displayMeteor && displayQuestion && (
									<FallingMeteor
										key={displayMeteor.meteorId}
										meteor={displayMeteor}
										question={displayQuestion}
										isHit={hitSnapshot !== null}
									/>
								)}
							</div>

							{/* Input area */}
							<div
								className="pb-2"
								style={{
									paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
								}}
							>
								{inputMode === "easy" && (
									<div className="mb-3 grid grid-cols-2 gap-2.5">
										{easyChoices.map((choice) => (
											<button
												key={choice}
												type="button"
												onClick={() => handleEasyClick(choice)}
												disabled={
													!displayQuestion ||
													room?.runtime.phase !== "PLAYING" ||
													isLocked
												}
												className="flex h-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-2 text-center font-semibold text-base leading-tight transition active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100 sm:h-16"
											>
												{choice}
											</button>
										))}
									</div>
								)}

								{inputMode === "hard" && (
									<div className="mb-2 flex flex-col gap-3">
										<input
											value={hardInput}
											onChange={(e) => setHardInput(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") handleHardSubmit();
											}}
											className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-emerald-500"
											placeholder={t("game.vocashot.typeKoreanWord")}
											disabled={room?.runtime.phase !== "PLAYING" || isLocked}
											autoComplete="off"
											autoCorrect="off"
											autoCapitalize="off"
											spellCheck={false}
											enterKeyHint="send"
											lang="ko"
										/>
										<button
											type="button"
											onClick={handleHardSubmit}
											disabled={
												!hardInput.trim() ||
												room?.runtime.phase !== "PLAYING" ||
												isLocked
											}
											className="w-full rounded-2xl bg-emerald-500 py-3 font-semibold text-base text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60 disabled:hover:bg-emerald-500"
										>
											{t("game.vocashot.fire")}
										</button>
									</div>
								)}

								{/* Feedback text */}
								<div className="h-5 text-center text-slate-400 text-xs">
									{feedback === "first" && t("game.vocashot.firstBonus")}
									{feedback === "grace" && t("game.vocashot.graceBonus")}
									{easyChoiceLockMs > 0 &&
										t("game.vocashot.wrongWait", {
											seconds: Math.ceil(easyChoiceLockMs / 1000),
										})}
								</div>
							</div>
						</section>
					)}
				</div>

				{showExitConfirm && (
					<div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80">
						<div className="mx-4 w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
							<p className="mb-2 text-center font-semibold text-slate-200">
								{t("game.vocashot.leaveConfirmTitle")}
							</p>
							<p className="mb-6 text-center text-slate-500 text-sm">
								{t("game.vocashot.leaveConfirmDesc")}
							</p>
							<div className="flex gap-3">
								<button
									type="button"
									onClick={() => setShowExitConfirm(false)}
									className="flex-1 rounded-xl bg-slate-700 py-2.5 font-semibold text-slate-200 transition hover:bg-slate-600"
								>
									{t("game.vocashot.cancel")}
								</button>
								<button
									type="button"
									onClick={() => {
										setShowExitConfirm(false);
										navigate({ to: "/main/game" });
									}}
									className="flex-1 rounded-xl bg-rose-500 py-2.5 font-semibold text-white transition hover:bg-rose-400"
								>
									{t("game.vocashot.leave")}
								</button>
							</div>
						</div>
					</div>
				)}
			</main>
		</>
	);
}
