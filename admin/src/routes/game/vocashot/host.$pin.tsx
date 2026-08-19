import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import {
	getRoom,
	listPlayers,
	listMeteors,
	startGame,
	endGame,
	resetRoom,
	spawnMeteor,
	missMeteor,
	updateRoomHearts,
	kickPlayer,
	subscribeRoomUpdate,
	subscribePlayerJoin,
	subscribePlayerUpdate,
	subscribeMeteorSpawned,
	subscribeMeteorUpdate,
	subscribeAnswerSubmitted,
} from "@/lib/vocashot/appsync";
import type {
	Room,
	Player,
	Meteor,
	DifficultySpeed,
	InputMode,
} from "@/lib/vocashot/types";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/game/vocashot/host/$pin")({
	component: GameHostPage,
});

// ── Game Logic Helpers ──

function getFallDurationMs(speed: DifficultySpeed, inputMode: InputMode) {
	const baseMs = (() => {
		switch (speed) {
			case "slow":
				return 7600
			case "fast":
				return 6800
			default:
				return 7200
		}
	})();
	const typingMultiplier = inputMode === "hard" ? 2.2 : 1;
	return Math.round(baseMs * typingMultiplier);
}

function getTargetMeteorCount(maxPlayers: number, inputMode: InputMode) {
	const clampedPlayers = Math.max(1, Math.min(30, Math.floor(maxPlayers)));
	const ratio = inputMode === "hard" ? 0.5 : 2 / 3;
	const raw = Math.floor(clampedPlayers * ratio);
	return Math.max(1, raw);
}

function shuffle<T>(arr: T[]): T[] {
	const out = [...arr];
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

function formatTime(sec: number) {
	const m = Math.floor(sec / 60);
	const s = sec % 60;
	return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function stableLane(meteorId: string, laneCount: number): number {
	let h = 0;
	for (let i = 0; i < meteorId.length; i++) {
		h = (h * 31 + meteorId.charCodeAt(i)) >>> 0;
	}
	return h % laneCount;
}

// ── FallingMeteor ──
// Captures animation timing at mount so polling re-renders don't reset the
// animationDelay mid-fall (which caused ~100px visible jumps every 2s).

function FallingMeteor({
	meteor,
	question,
	leftPercent,
}: {
	meteor: Meteor;
	question: { image?: string; english?: string };
	leftPercent: number;
}) {
	const timingRef = useRef<{ durationSec: number; delaySec: number } | null>(
		null,
	)
	if (timingRef.current === null) {
		timingRef.current = {
			durationSec: (meteor.expiresAt - meteor.spawnedAt) / 1000,
			delaySec: (meteor.spawnedAt - Date.now()) / 1000,
		}
	}
	const { durationSec, delaySec } = timingRef.current;

	return (
		<div
			className="absolute top-[-10%]"
			style={{
				left: `${leftPercent}%`,
				animation: `meteor-fall ${durationSec}s linear forwards`,
				animationDelay: `${delaySec}s`,
			}}
		>
			<div
				className={`flex h-16 w-16 items-center justify-center rounded-full border text-3xl shadow-xl ${
					meteor.isGolden
						? "border-amber-200 bg-amber-300/90 text-amber-900"
						: "border-slate-100 bg-slate-200/90 text-slate-900"
				}`}
			>
				{question.image &&
					(question.image.startsWith("http") ||
					question.image.startsWith("/") ? (
						<img
							src={question.image}
							alt=""
							style={{ maxWidth: "50px", height: "auto" }}
							className="rounded object-cover"
						/>
					) : (
						<span>{question.image}</span>
					))}
				{question.english && (
					<span
						className={`text-center font-semibold leading-tight ${question.image ? "text-[10px]" : "text-sm"}`}
					>
						{question.english}
					</span>
				)}
			</div>
		</div>
	)
}

// ── Component ──

function GameHostPage() {
	const { pin } = Route.useParams();
	const navigate = useNavigate();

	const [room, setRoom] = useState<Room | null>(null);
	const [players, setPlayers] = useState<Player[]>([]);
	const [meteors, setMeteors] = useState<Meteor[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [isStarting, setIsStarting] = useState(false);
	const [remainingSec, setRemainingSec] = useState<number | null>(null);
	const [kickTarget, setKickTarget] = useState<Player | null>(null);
	const [showQR, setShowQR] = useState(false);

	const roomRef = useRef<Room | null>(null);
	const meteorsRef = useRef<Meteor[]>([]);
	const shuffledOrderRef = useRef<number[]>([]);
	const orderCursorRef = useRef(0);

	useEffect(() => {
		roomRef.current = room;
	}, [room]);
	useEffect(() => {
		meteorsRef.current = meteors;
	}, [meteors]);

	// Initial fetch
	useEffect(() => {
		const fetchData = async () => {
			try {
				const [roomData, playerData, meteorData] = await Promise.all([
					getRoom(pin),
					listPlayers(pin),
					listMeteors(pin),
				])
				if (roomData) setRoom(roomData);
				setPlayers(playerData);
				setMeteors(meteorData);
			} catch (err) {
				console.error("Failed to fetch room data:", err);
				setError("방 정보를 불러오는 데 실패했습니다.");
			}
		}
		fetchData();
	}, [pin]);

	// Subscriptions
	useEffect(() => {
		const subs: { unsubscribe: () => void }[] = [];

		subs.push(
			subscribeRoomUpdate(pin, (updatedRoom) => {
				setRoom(updatedRoom);
			}),
		)

		subs.push(
			subscribePlayerJoin(pin, (player) => {
				setPlayers((prev) => {
					const exists = prev.find(
						(p) => p.playerId === player.playerId,
					)
					if (exists) {
						return prev.map((p) =>
							p.playerId === player.playerId ? player : p,
						)
					}
					return [...prev, player];
				})
			}),
		)

		subs.push(
			subscribePlayerUpdate(pin, (player) => {
				setPlayers((prev) =>
					prev.map((p) =>
						p.playerId === player.playerId ? player : p,
					),
				)
			}),
		)

		subs.push(
			subscribeMeteorSpawned(pin, (meteor) => {
				setMeteors((prev) => {
					const exists = prev.find(
						(m) => m.meteorId === meteor.meteorId,
					)
					if (exists) {
						return prev.map((m) =>
							m.meteorId === meteor.meteorId ? meteor : m,
						)
					}
					return [...prev, meteor];
				})
			}),
		)

		subs.push(
			subscribeMeteorUpdate(pin, (meteor) => {
				setMeteors((prev) =>
					prev.map((m) =>
						m.meteorId === meteor.meteorId ? meteor : m,
					),
				)
			}),
		)

		subs.push(
			subscribeAnswerSubmitted(pin, (answer) => {
				// Update player score from answer
				if (answer.playerScore !== null) {
					setPlayers((prev) =>
						prev.map((p) =>
							p.playerId === answer.playerId
								? { ...p, score: answer.playerScore ?? p.score }
								: p,
						),
					)
				}
				// Update meteor status
				if (answer.meteorStatus) {
					setMeteors((prev) =>
						prev.map((m) =>
							m.meteorId === answer.meteorId
								? {
										...m,
										status: answer.meteorStatus as Meteor["status"],
										destroyedByPlayerId: answer.playerId,
										destroyedAt: answer.submittedAt,
									}
								: m,
						),
					)
				}
				// Update room hearts
				if (answer.remainingHearts !== null) {
					setRoom((prev) =>
						prev
							? {
									...prev,
									runtime: {
										...prev.runtime,
										remainingHearts: answer.remainingHearts ?? prev.runtime.remainingHearts,
									},
								}
							: prev,
					)
				}
			}),
		)

		return () => {
			for (const sub of subs) {
				sub.unsubscribe();
			}
		}
	}, [pin]);

	// Polling backup every 2 seconds
	useEffect(() => {
		const interval = setInterval(async () => {
			try {
				const [roomData, playerData, meteorData] = await Promise.all([
					getRoom(pin),
					listPlayers(pin),
					listMeteors(pin),
				])
				if (roomData) setRoom(roomData);
				setPlayers(playerData);
				setMeteors(meteorData);
			} catch {
				// Silently fail polling
			}
		}, 2000);
		return () => clearInterval(interval);
	}, [pin]);

	// Timer countdown
	useEffect(() => {
		if (!room?.runtime.startedAt || !room?.runtime.endsAt) {
			setRemainingSec(null);
			return
		}
		const updateRemaining = () => {
			const now = Date.now();
			const diffMs = (room.runtime.endsAt ?? 0) - now;
			setRemainingSec(Math.max(0, Math.floor(diffMs / 1000)));
		}
		updateRemaining();
		const id = setInterval(updateRemaining, 500);
		return () => clearInterval(id);
	}, [room?.runtime.startedAt, room?.runtime.endsAt]);

	// Hearts = 0 check
	useEffect(() => {
		if (
			!room ||
			room.runtime.phase !== "PLAYING" ||
			room.config.initialHearts === -1
		)
			return
		if (room.runtime.remainingHearts <= 0) {
			endGame(pin, "FAIL").catch(console.error);
		}
	}, [pin, room?.runtime.phase, room?.runtime.remainingHearts, room?.config.initialHearts]);

	// Miss detection every 1 second
	useEffect(() => {
		if (!room || room.runtime.phase !== "PLAYING") return;

		const tick = async () => {
			const r = roomRef.current;
			const currentMeteors = meteorsRef.current;
			if (!r || r.runtime.phase !== "PLAYING") return;
			const now = Date.now();

			// Check timer expiry
			if (r.runtime.endsAt && now >= r.runtime.endsAt) {
				await endGame(pin, "SUCCESS").catch(console.error);
				return
			}

			// Check missed meteors
			let missedCount = 0;
			for (const meteor of currentMeteors) {
				if (meteor.status !== "FALLING" || meteor.expiresAt >= now)
					continue
				try {
					await missMeteor(pin, meteor.meteorId);
					missedCount += 1;
				} catch {
					// Already missed or destroyed
				}
			}
			if (
				missedCount > 0 &&
				r.config.initialHearts !== -1 &&
				r.runtime.remainingHearts > 0
			) {
				const newHearts = Math.max(
					0,
					r.runtime.remainingHearts - missedCount,
				)
				await updateRoomHearts(pin, newHearts).catch(console.error);
			}
		}

		const interval = setInterval(tick, 1000);
		return () => clearInterval(interval);
	}, [pin, room?.runtime.phase]);

	// Spawn meteors every 3 seconds
	useEffect(() => {
		if (!room || room.runtime.phase !== "PLAYING") return;

		const fallDuration = getFallDurationMs(
			room.config.difficultySpeed as DifficultySpeed,
			room.config.inputMode as InputMode,
		)
		const questions = room.config.questions ?? [];
		const actualPlayers = Math.max(1, players.length);
		const targetMeteorCount = getTargetMeteorCount(
			actualPlayers,
			room.config.inputMode as InputMode,
		)

		shuffledOrderRef.current = shuffle(
			Array.from({ length: questions.length }, (_, i) => i),
		)
		orderCursorRef.current = 0;

		const spawn = async () => {
			const r = roomRef.current;
			const currentMeteors = meteorsRef.current;
			if (!r || r.runtime.phase !== "PLAYING" || questions.length === 0)
				return
			const now = Date.now();
			const fallingCount = currentMeteors.filter(
				(m) => m.status === "FALLING",
			).length
			if (fallingCount >= targetMeteorCount) return;

			const toSpawn = targetMeteorCount - fallingCount;
			const activeIndices = new Set(
				currentMeteors
					.filter((m) => m.status === "FALLING")
					.map((m) => m.questionIndex),
			)

			const picked: number[] = [];
			const maxAttempts = questions.length * 2;
			let attempts = 0;
			while (picked.length < toSpawn && attempts < maxAttempts) {
				if (orderCursorRef.current >= shuffledOrderRef.current.length) {
					shuffledOrderRef.current = shuffle(
						Array.from({ length: questions.length }, (_, i) => i),
					)
					orderCursorRef.current = 0;
				}
				const candidate =
					shuffledOrderRef.current[orderCursorRef.current];
				orderCursorRef.current += 1;
				attempts += 1;
				const duplicateOnScreen =
					activeIndices.has(candidate) || picked.includes(candidate);
				const roomForOtherChoice =
					questions.length > activeIndices.size + picked.length;
				if (duplicateOnScreen && roomForOtherChoice) continue;
				picked.push(candidate);
			}

			let acc = 0;
			for (const questionIndex of picked) {
				const delayMs = acc;
				acc += 500 + Math.floor(Math.random() * 900);
				const meteorId = `m_${now}_${Math.random().toString(36).slice(2, 8)}`;
				const spawnedAt = now + delayMs;
				const expiresAt = spawnedAt + fallDuration;
				const isGolden =
					r.config.goldenMeteorEnabled && Math.random() < 0.15;

				try {
					await spawnMeteor({
						pin,
						meteorId,
						questionIndex,
						spawnedAt,
						expiresAt,
						isGolden,
						goldenBonusType: isGolden
							? Math.random() < 0.5
								? "heart"
								: "score"
							: null,
					})
				} catch {
					// Spawn failed, will retry next cycle
				}
			}
		}

		const spawnInterval = setInterval(spawn, 3000);
		return () => clearInterval(spawnInterval);
	}, [pin, room?.runtime.phase]);

	// Sorted players
	const sortedPlayers = useMemo(() => {
		return [...players].sort((a, b) => b.score - a.score);
	}, [players]);

	const playerCount = sortedPlayers.length;

	// Hearts display
	const showInfiniteHearts = room?.config.initialHearts === -1;
	const heartsDisplay = useMemo(() => {
		if (!room) return "";
		if (showInfiniteHearts) return "INF";
		return Math.max(0, room.runtime.remainingHearts).toString();
	}, [room, showInfiniteHearts]);

	// Active meteors (falling or recently destroyed)
	const activeMeteors = useMemo(() => {
		const now = Date.now();
		return meteors.filter(
			(m) =>
				m.status === "FALLING" ||
				(m.status === "DESTROYED" &&
					m.destroyedAt != null &&
					now - m.destroyedAt < 2500),
		)
	}, [meteors]);

	// Handlers
	const handleStartGame = async () => {
		if (!room || isStarting) return;
		setIsStarting(true);
		try {
			const now = Date.now();
			const endsAt = now + room.config.gameDurationSec * 1000;
			const updatedRoom = await startGame(pin, endsAt);
			setRoom(updatedRoom);
		} catch (e) {
			console.error(e);
			setError("게임 시작 중 오류가 발생했습니다.");
		} finally {
			setIsStarting(false);
		}
	}

	const handleResetRoom = async () => {
		if (!room) return;
		try {
			await resetRoom(pin);
		} catch (e) {
			console.error(e);
			setError("방 초기화 중 오류가 발생했습니다.");
		}
	}

	const handleKickConfirm = async () => {
		if (!kickTarget) return;
		try {
			await kickPlayer(pin, kickTarget.playerId);
			setPlayers((prev) =>
				prev.filter((p) => p.playerId !== kickTarget.playerId),
			)
		} catch (e) {
			console.error(e);
		}
		setKickTarget(null);
	}

	const playerUrl =
		typeof window !== "undefined"
			? `${window.location.origin}/game/play?pin=${pin}`
			: ""

	return (
		<>
			{/* Inline CSS for animations */}
			<style>{`
				@keyframes meteor-fall {
					from { transform: translateY(-10vh); }
					to { transform: translateY(110vh); }
				}
				@keyframes laser-shoot {
					0% { transform: scaleY(0); opacity: 1; }
					50% { transform: scaleY(1.25); opacity: 0.9; }
					100% { transform: scaleY(1.25); opacity: 0; }
				}
				@keyframes explode {
					0% { transform: scale(0.35); opacity: 1; }
					100% { transform: scale(4.8); opacity: 0; }
				}
				@keyframes explode-ring {
					0% { transform: scale(0.25); opacity: 1; }
					100% { transform: scale(4.4); opacity: 0; }
				}
				@keyframes float-up {
					0% { transform: translateY(0); opacity: 1; }
					100% { transform: translateY(-40px); opacity: 0; }
				}
				@keyframes shake-wrong {
					0%, 100% { transform: translateX(0); }
					20% { transform: translateX(-6px); }
					40% { transform: translateX(6px); }
					60% { transform: translateX(-4px); }
					80% { transform: translateX(4px); }
				}
				.animate-laser-shoot {
					animation: laser-shoot 0.5s ease-out forwards;
					transform-origin: bottom;
				}
				.animate-explode {
					animation: explode 0.6s ease-out forwards;
				}
				.animate-explode-ring {
					animation: explode-ring 0.7s ease-out forwards;
				}
				.animate-float-up {
					animation: float-up 1.2s ease-out forwards;
				}
			`}</style>

			<div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-50">
				{/* Top bar */}
				<div className="border-slate-800 border-b bg-slate-950/80">
				<div className="flex items-center justify-between px-6 py-3">
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => navigate({ to: "/game/vocashot" })}
							className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
						>
							<ArrowLeft className="h-4 w-4" />
						</button>
						<span className="text-slate-500 text-xs uppercase tracking-[0.3em]">
							HOST
						</span>
						<h1 className="font-semibold text-lg tracking-tight">
							VocaShot
						</h1>
					</div>

					<div className="flex items-center gap-6">
						{/* PIN */}
						<div className="flex items-center gap-2">
							<span className="text-slate-400 text-xs">PIN</span>
							<span className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-sm tracking-[0.3em]">
								{pin}
							</span>
							<button
								type="button"
								onClick={() => setShowQR((v) => !v)}
								className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-300 text-xs transition hover:bg-slate-800"
							>
								QR
							</button>
						</div>

						{/* Timer */}
						<div className="flex min-w-[96px] flex-col items-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5">
							<span className="text-[10px] text-slate-500 uppercase tracking-wide">
								TIME
							</span>
							<span className="font-mono font-semibold text-2xl text-emerald-400">
								{remainingSec !== null
									? formatTime(remainingSec)
									: room
										? formatTime(room.config.gameDurationSec)
										: "--:--"}
							</span>
						</div>

						{/* Hearts */}
						<div className="flex min-w-[72px] flex-col items-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5">
							<span className="text-[10px] text-slate-500 uppercase tracking-wide">
								HEARTS
							</span>
							<span className="font-mono font-semibold text-2xl text-rose-400">
								{heartsDisplay || "--"}
							</span>
						</div>

						{/* Players */}
						<div className="flex min-w-[72px] flex-col items-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5">
							<span className="text-[10px] text-slate-500 uppercase tracking-wide">
								PLAYERS
							</span>
							<span className="font-mono font-semibold text-2xl text-sky-400">
								{playerCount}
							</span>
						</div>

						{/* Start button */}
						<button
							type="button"
							onClick={handleStartGame}
							disabled={
								!room ||
								room.runtime.phase === "PLAYING" ||
								isStarting
							}
							className="rounded-2xl bg-emerald-500 px-4 py-2 font-semibold text-slate-950 text-sm transition hover:bg-emerald-400 disabled:opacity-50"
						>
							{isStarting
								? "시작 중..."
								: room?.runtime.phase === "PLAYING"
									? "게임 진행 중"
									: "게임 시작"}
						</button>
					</div>
				</div>

				{/* Settings info row */}
				{room && (
					<div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-slate-800/60 border-t px-6 py-2 text-xs">
						<div className="flex items-center gap-2">
							<span className="text-slate-500 uppercase tracking-wider">
								주제
							</span>
							<span className="font-semibold text-slate-200">
								{(() => {
									const label = room.config.presetLabel;
									const custom = room.config.customCount ?? 0;
									const parts: string[] = []
									if (label) parts.push(label);
									if (custom > 0)
										parts.push("커스텀 ${custom}문제")
									return parts.length > 0 ? parts.join(" · ") : "-";
								})()}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-slate-500 uppercase tracking-wider">
								난이도
							</span>
							<span className="font-semibold text-slate-200">
								{(() => {
									const speedLabel =
										room.config.difficultySpeed === "slow"
											? "easy"
											: room.config.difficultySpeed === "fast"
												? "hard"
												: "normal"
									const inputLabel =
										room.config.inputMode === "hard"
											? "타이핑"
											: "고르기"
									return `${speedLabel} · ${inputLabel}`;
								})()}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-slate-500 uppercase tracking-wider">
								시간
							</span>
							<span className="font-semibold text-slate-200">
								{Math.round(room.config.gameDurationSec / 60)}분
							</span>
						</div>
					</div>
				)}
				</div>

				{/* Main area */}
				<div className="flex flex-1 overflow-hidden">
					{/* Meteor field */}
					<div className="relative flex-1 overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
						{/* Star background */}
						<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_#22d3ee33_0,_transparent_45%),radial-gradient(circle_at_bottom,_#4ade8033_0,_transparent_55%)]" />

						{/* QR overlay */}
						{showQR && (
							<div className="absolute top-4 right-4 z-20 flex flex-col items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-xl">
								<div className="rounded-lg bg-white p-2">
									<QRCode value={playerUrl} size={120} />
								</div>
								<p className="font-bold font-mono text-emerald-400 text-lg tracking-[0.25em]">
									{pin}
								</p>
								<p className="text-[10px] text-slate-500">
									QR 스캔으로 입장
								</p>
							</div>
						)}

						{/* Meteors */}
						{room &&
							activeMeteors.map((meteor) => {
								const question =
									room.config.questions[meteor.questionIndex] ??
									null
								if (!question) return null;

								const laneCount = 6
								const laneIndex = stableLane(
									meteor.meteorId,
									laneCount,
								)
								const laneWidth = 100 / laneCount;
								const leftPercent =
									laneIndex * laneWidth + laneWidth / 2 - 8;

								const isDestroyed = meteor.status === "DESTROYED";

								if (isDestroyed && meteor.destroyedAt) {
									const elapsed =
										meteor.destroyedAt - meteor.spawnedAt;
									const total =
										meteor.expiresAt - meteor.spawnedAt;
									const topPercent = Math.max(
										2,
										Math.min(88, (elapsed / total) * 100 - 2),
									)

									const destroyedByNickname =
										meteor.destroyedByPlayerId
											? (players.find(
													(p) =>
														p.playerId ===
														meteor.destroyedByPlayerId,
												)?.nickname ?? "")
											: ""
									const accentColor = meteor.isGolden
										? "bg-amber-400"
										: "bg-emerald-400"
									const ringColor = meteor.isGolden
										? "border-amber-300"
										: "border-emerald-400"
									const nameBg = meteor.isGolden
										? "bg-amber-400/95 border-amber-300/60"
										: "bg-emerald-500/95 border-emerald-400/50";

									return (
										<div
											key={meteor.meteorId}
											className="pointer-events-none absolute inset-0"
										>
											{/* Laser beam */}
											<div
												className={`absolute ${accentColor} animate-laser-shoot`}
												style={{
													left: "calc(${leftPercent}% + 30px)",
													bottom: 0,
													top: "${topPercent}%",
													width: "4px",
												}}
											/>
											{/* Explosion */}
											<div
												className="absolute"
												style={{
													left: "${leftPercent}%",
													top: "calc(${topPercent}% - 32px)",
												}}
											>
												<div
													className={`h-16 w-16 rounded-full ${accentColor} animate-explode`}
													style={{
														animationDelay: "180ms",
													}}
												/>
												<div
													className={`absolute inset-0 h-16 w-16 rounded-full border-4 ${ringColor} animate-explode-ring`}
													style={{
														animationDelay: "180ms",
													}}
												/>
												{destroyedByNickname && (
													<div
														className="absolute animate-float-up"
														style={{
															left: "32px",
															top: "-0.75rem",
															animationDelay: "260ms",
														}}
													>
														<span
															className={`-translate-x-1/2 block whitespace-nowrap rounded-lg border px-2 py-1 font-bold text-slate-950 text-xs shadow-lg ${nameBg}`}
														>
															{destroyedByNickname}
														</span>
													</div>
												)}
											</div>
											{/* Laser base glow */}
											<div
												className={`absolute h-8 w-8 rounded-full ${accentColor} animate-explode opacity-70 blur-md`}
												style={{
													left: "calc(${leftPercent}% + 22px)",
													bottom: "-4px",
													animationDelay: "0ms",
												}}
											/>
										</div>
									)
								}

								// Falling meteor
								return (
									<FallingMeteor
										key={meteor.meteorId}
										meteor={meteor}
										question={question}
										leftPercent={leftPercent}
									/>
								)
							})}

						{/* Bottom line */}
						<div className="absolute right-0 bottom-0 left-0 h-3 bg-gradient-to-t from-rose-500/60 via-rose-500/30 to-transparent" />

						{/* No room message */}
						{!room && (
							<div className="absolute inset-0 flex items-center justify-center">
								<p className="text-lg text-slate-400">
									방 정보를 불러오는 중...
								</p>
							</div>
						)}

						{/* Lobby waiting message */}
						{room?.runtime.phase === "LOBBY" && (
							<div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
								<p className="font-bold text-2xl text-slate-300">
									학생 입장을 기다리는 중...
								</p>
								<p className="text-slate-500 text-sm">
									PIN: {pin} | {playerCount}명 입장
								</p>
							</div>
						)}

						{/* Results overlay */}
						{room?.runtime.phase === "ENDED" && (
							<div className="absolute inset-0 z-10 flex flex-col overflow-hidden bg-slate-950/97">
								{/* Title */}
								<div className="flex flex-col items-center px-6 pt-6 pb-3">
									<h2
										className={`font-bold text-4xl tracking-tight ${
											room.runtime.status === "SUCCESS"
												? "text-emerald-400"
												: "text-rose-400"
										}`}
									>
										{room.runtime.status === "SUCCESS"
											? "방어 성공!"
											: "게임 오버"}
									</h2>
									<p className="mt-1 text-slate-400 text-sm">
										{room.runtime.status === "SUCCESS"
											? "타이머가 끝날 때까지 하트를 지켰습니다."
											: "하트가 0이 되어 미션에 실패했습니다."}
									</p>
								</div>

								{/* Podium */}
								{sortedPlayers.length > 0 && (
									<div className="flex items-end justify-center gap-4 px-8 pb-4">
										{/* 2nd */}
										{sortedPlayers[1] && (
											<div className="flex flex-col items-center gap-1">
												<span className="text-2xl">2nd</span>
												<div className="flex h-16 w-20 flex-col items-center justify-center gap-0.5 rounded-t-2xl border border-slate-500 bg-slate-600/80 px-1">
													<span className="w-full truncate text-center font-semibold text-slate-200 text-xs">
														{sortedPlayers[1].nickname}
													</span>
													<span className="font-bold font-mono text-slate-300 text-sm">
														{sortedPlayers[1].score}
													</span>
												</div>
											</div>
										)}
										{/* 1st */}
										<div className="-mt-6 flex flex-col items-center gap-1">
											<span className="text-3xl">1st</span>
											<div className="flex h-20 w-24 flex-col items-center justify-center gap-0.5 rounded-t-2xl border border-amber-400 bg-amber-500/80 px-1 shadow-amber-500/30 shadow-lg">
												<span className="w-full truncate text-center font-semibold text-amber-950 text-sm">
													{sortedPlayers[0].nickname}
												</span>
												<span className="font-bold font-mono text-amber-950 text-base">
													{sortedPlayers[0].score}
												</span>
											</div>
										</div>
										{/* 3rd */}
										{sortedPlayers[2] && (
											<div className="mt-4 flex flex-col items-center gap-1">
												<span className="text-2xl">3rd</span>
												<div className="flex h-12 w-20 flex-col items-center justify-center gap-0.5 rounded-t-2xl border border-amber-700 bg-amber-800/60 px-1">
													<span className="w-full truncate text-center font-semibold text-amber-200 text-xs">
														{sortedPlayers[2].nickname}
													</span>
													<span className="font-bold font-mono text-amber-300 text-sm">
														{sortedPlayers[2].score}
													</span>
												</div>
											</div>
										)}
									</div>
								)}

								{/* Full ranking */}
								<div className="flex-1 overflow-y-auto px-6 pb-2">
									<p className="mb-2 text-center text-[10px] text-slate-500 uppercase tracking-[0.2em]">
										전체 랭킹
									</p>
									<div className="mx-auto flex max-w-md flex-col gap-1.5">
										{sortedPlayers
											.slice(3)
											.map((player, idx) => (
												<div
													key={player.playerId}
													className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2"
												>
													<div className="flex items-center gap-3">
														<span className="w-6 text-center font-bold text-slate-500 text-sm">
															{idx + 4}
														</span>
														<span className="max-w-[160px] truncate font-semibold text-sm">
															{player.nickname}
														</span>
													</div>
													<span className="font-mono font-semibold text-emerald-400 text-sm">
														{player.score}
													</span>
												</div>
											))}
									</div>
								</div>

								{/* Reset button */}
								<div className="flex justify-center gap-4 border-slate-800 border-t py-4">
									<button
										type="button"
										onClick={handleResetRoom}
										className="rounded-2xl bg-emerald-500 px-6 py-2.5 font-semibold text-slate-950 text-sm transition hover:bg-emerald-400"
									>
										다시 시작 (점수 초기화)
									</button>
								</div>
							</div>
						)}
					</div>

					{/* Right sidebar: Ranking */}
					<aside className="flex w-64 flex-col border-slate-800 border-l bg-slate-950/80 px-4 py-4">
						<h2 className="mb-3 text-slate-500 text-xs uppercase tracking-[0.25em]">
							RANKING
						</h2>
						<div className="flex flex-1 flex-col gap-2 overflow-hidden">
							{sortedPlayers.length === 0 && (
								<p className="text-slate-500 text-xs">
									아직 입장한 학생이 없습니다.
								</p>
							)}
							{sortedPlayers.slice(0, 8).map((player, index) => (
								<div
									key={player.playerId}
									className="flex items-center justify-between rounded-xl bg-slate-900/80 px-3 py-1.5"
								>
									<div className="flex items-center gap-2">
										<span className="w-5 text-center font-bold text-lg text-slate-500">
											{index + 1}
										</span>
										<button
											type="button"
											onClick={() => setKickTarget(player)}
											className="max-w-[96px] truncate text-left font-semibold text-sm hover:text-rose-400 hover:underline"
											title="클릭 시 강퇴"
										>
											{player.nickname}
										</button>
									</div>
									<span className="font-mono font-semibold text-emerald-400 text-lg">
										{player.score}
									</span>
								</div>
							))}
						</div>

						{error && (
							<p className="mt-2 rounded-md border border-red-900 bg-red-950/40 px-2 py-1 text-red-400 text-xs">
								{error}
							</p>
						)}
					</aside>
				</div>

				{/* Kick confirmation modal */}
				{kickTarget && (
					<div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80">
						<div className="mx-4 w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
							<p className="mb-2 text-center text-slate-200">
								<span className="font-semibold text-rose-400">
									{kickTarget.nickname}
								</span>
								<span className="text-slate-400">
									{" "}
									님을 강퇴하겠습니까?
								</span>
							</p>
							<p className="mb-6 text-center text-slate-500 text-sm">
								강퇴 시 해당 학생은 방에서 제거됩니다.
							</p>
							<div className="flex gap-3">
								<button
									type="button"
									onClick={() => setKickTarget(null)}
									className="flex-1 rounded-xl bg-slate-700 py-2.5 font-semibold text-slate-200 transition hover:bg-slate-600"
								>
									아니오
								</button>
								<button
									type="button"
									onClick={handleKickConfirm}
									className="flex-1 rounded-xl bg-rose-500 py-2.5 font-semibold text-white transition hover:bg-rose-400"
								>
									예
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		</>
	)
}
