import { joinRoom, listPlayers } from "@/lib/vocashot/appsync";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/main/game/vocashot")({
	component: VocaShotPinPage,
});

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

function VocaShotPinPage() {
	const navigate = useNavigate();
	const { t } = useTranslation();
	const [pin, setPin] = useState("");
	const [nickname, setNickname] = useState(() => {
		try {
			const userData = localStorage.getItem("speako-user");
			if (userData) {
				const parsed = JSON.parse(userData);
				return parsed?.name ?? "";
			}
		} catch {
			// ignore
		}
		return "";
	});
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [existingSession, setExistingSession] = useState<StoredPlayer | null>(
		null,
	);

	useEffect(() => {
		const trimmedPin = pin.trim();
		if (!trimmedPin) {
			setExistingSession(null);
			return;
		}
		const stored = loadStoredPlayer();
		if (stored && stored.pin === trimmedPin) {
			setExistingSession(stored);
			setNickname(stored.nickname);
		} else {
			setExistingSession(null);
		}
	}, [pin]);

	const handleSubmit = async () => {
		const trimmedPin = pin.trim();
		const trimmedNickname = nickname.trim();

		if (!trimmedPin || !trimmedNickname) return;

		setError(null);
		setIsLoading(true);

		try {
			if (existingSession && existingSession.pin === trimmedPin) {
				const players = await listPlayers(trimmedPin);
				const stillExists = players.some(
					(p) => p.playerId === existingSession.playerId,
				);
				if (stillExists) {
					navigate({
						to: "/main/game/vocashot/$pin",
						params: { pin: trimmedPin },
						search: { playerId: existingSession.playerId },
					});
					return;
				}
				localStorage.removeItem(PLAYER_STORAGE_KEY);
				setExistingSession(null);
			}

			const player = await joinRoom(trimmedPin, trimmedNickname);

			localStorage.setItem(
				PLAYER_STORAGE_KEY,
				JSON.stringify({
					pin: trimmedPin,
					playerId: player.playerId,
					nickname: player.nickname,
				}),
			);

			navigate({
				to: "/main/game/vocashot/$pin",
				params: { pin: trimmedPin },
				search: { playerId: player.playerId },
			});
		} catch (err) {
			console.error("Failed to join room:", err);
			setError(t("game.vocashot.roomNotFound"));
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div
			className="-translate-x-1/2 fixed top-0 bottom-0 left-1/2 z-50 flex w-full flex-col bg-[#F9FAFC]"
			style={{ maxWidth: "var(--app-width, 375px)" }}
		>
			{/* Header */}
			<div className="relative flex items-center justify-center px-[16px] py-[16px]">
				<button
					type="button"
					onClick={() => navigate({ to: "/main/game" })}
					className="absolute left-[12px] flex size-[32px] items-center justify-center rounded-full bg-white shadow-sm"
				>
					<ArrowLeft size={18} color="#383A3F" />
				</button>
				<p className="font-semibold text-[#383A3F] text-[17px]">
					{t("game.vocashot.title")}
				</p>
			</div>

			{/* Content */}
			<div className="flex flex-1 flex-col items-center justify-center px-[24px]">
				<div className="w-full max-w-[360px] rounded-[20px] bg-white p-[24px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
					{/* Icon */}
					<div className="mb-[20px] flex justify-center">
						<div className="flex size-[64px] items-center justify-center rounded-[16px] bg-[#FFF3E0]">
							<Gamepad2 className="size-[32px] text-[#FF6D00]" />
						</div>
					</div>

					{/* Error message */}
					{error && (
						<div className="mb-[16px] rounded-[12px] bg-[#FEF2F2] px-[16px] py-[12px] text-center text-[#DC2626] text-[13px]">
							{error}
						</div>
					)}

					{/* PIN input */}
					<div className="mb-[12px]">
						<label className="mb-[6px] block font-medium text-[#6B7B8D] text-[13px]">
							{t("game.vocashot.roomPin")}
						</label>
						<input
							type="text"
							inputMode="numeric"
							maxLength={6}
							value={pin}
							onChange={(e) => {
								setPin(e.target.value.replace(/\D/g, ""));
								setError(null);
							}}
							placeholder="123456"
							className="w-full rounded-[12px] border border-[#E5E8EC] bg-[#F9FAFC] px-[16px] py-[14px] font-mono text-[#383A3F] text-[20px] tracking-[0.3em] outline-none transition-colors focus:border-[#0180FF] focus:ring-2 focus:ring-[#0180FF]/20"
						/>
					</div>

					{/* Nickname input */}
					<div className="mb-[20px]">
						<label className="mb-[6px] block font-medium text-[#6B7B8D] text-[13px]">
							{t("game.vocashot.nickname")}
						</label>
						<input
							type="text"
							value={nickname}
							onChange={(e) => setNickname(e.target.value)}
							placeholder={t("game.vocashot.nicknamePlaceholder")}
							autoComplete="nickname"
							disabled={existingSession !== null}
							className="w-full rounded-[12px] border border-[#E5E8EC] bg-[#F9FAFC] px-[16px] py-[14px] text-[#383A3F] text-[15px] outline-none transition-colors focus:border-[#0180FF] focus:ring-2 focus:ring-[#0180FF]/20 disabled:cursor-not-allowed disabled:bg-[#EEF1F5] disabled:text-[#6B7B8D]"
						/>
					</div>

					{/* Join button */}
					<button
						type="button"
						onClick={handleSubmit}
						disabled={!pin.trim() || !nickname.trim() || isLoading}
						className="w-full rounded-[12px] bg-[#0180FF] py-[14px] font-semibold text-[15px] text-white transition-colors hover:bg-[#0070E0] disabled:opacity-50 disabled:hover:bg-[#0180FF]"
					>
						{isLoading ? t("game.vocashot.joining") : t("game.vocashot.join")}
					</button>
				</div>
			</div>
		</div>
	);
}
