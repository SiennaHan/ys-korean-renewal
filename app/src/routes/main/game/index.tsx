import { useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import {
	Cherry,
	ChevronRight,
	Crosshair,
	Gamepad2,
	Layers,
	Map,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/main/game/")({
	component: GamePage,
});

function GamePage() {
	const navigate = useNavigate();
	const { t } = useTranslation();

	return (
		<div className="flex h-full flex-col bg-[#F9FAFC]">
			{/* Header */}
			<div className="flex items-center justify-center px-[16px] py-[16px]">
				<p className="font-semibold text-[#383A3F] text-[17px]">
					{t("game.list.title")}
				</p>
			</div>

			{/* Game cards */}
			<div className="flex flex-col gap-[12px] px-[16px] pt-[8px]">
				{/* VocaShot */}
				<button
					type="button"
					onClick={() => navigate({ to: "/main/game/vocashot" })}
					className="flex w-full cursor-pointer items-center gap-[14px] rounded-[16px] bg-white p-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-colors active:bg-[#F6F7F8]"
				>
					<div className="flex size-[48px] shrink-0 items-center justify-center rounded-[12px] bg-[#FFF3E0]">
						<Gamepad2 className="size-[24px] text-[#FF6D00]" />
					</div>
					<div className="flex-1 text-left">
						<p className="font-bold text-[#24425F] text-[16px]">
							{t("game.list.vocashot.name")}
						</p>
						<p className="mt-[2px] text-[#9BA5B0] text-[13px]">
							{t("game.list.vocashot.description")}
						</p>
					</div>
					<ChevronRight className="size-[20px] shrink-0 text-[#C8CCD3]" />
				</button>

				{/* Spring Picnic Number Mission */}
				<button
					type="button"
					onClick={() => navigate({ to: "/main/game/spring-picnic" })}
					className="flex w-full cursor-pointer items-center gap-[14px] rounded-[16px] bg-white p-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-colors active:bg-[#F6F7F8]"
				>
					<div className="flex size-[48px] shrink-0 items-center justify-center rounded-[12px] bg-[#FFF0F5]">
						<Cherry className="size-[24px] text-[#D4537E]" />
					</div>
					<div className="flex-1 text-left">
						<p className="font-bold text-[#24425F] text-[16px]">
							{t("game.list.springPicnic.name")}
						</p>
						<p className="mt-[2px] text-[#9BA5B0] text-[13px]">
							{t("game.list.springPicnic.description")}
						</p>
					</div>
					<ChevronRight className="size-[20px] shrink-0 text-[#C8CCD3]" />
				</button>

				{/* Seoul Puzzle */}
				<button
					type="button"
					onClick={() => navigate({ to: "/main/game/seoul-puzzle" })}
					className="flex w-full cursor-pointer items-center gap-[14px] rounded-[16px] bg-white p-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-colors active:bg-[#F6F7F8]"
				>
					<div className="flex size-[48px] shrink-0 items-center justify-center rounded-[12px] bg-[#E8F5E9]">
						<Map className="size-[24px] text-[#2E7D32]" />
					</div>
					<div className="flex-1 text-left">
						<p className="font-bold text-[#24425F] text-[16px]">
							{t("game.list.seoulPuzzle.name")}
						</p>
						<p className="mt-[2px] text-[#9BA5B0] text-[13px]">
							{t("game.list.seoulPuzzle.description")}
						</p>
					</div>
					<ChevronRight className="size-[20px] shrink-0 text-[#C8CCD3]" />
				</button>

				{/* Card Sort */}
				<button
					type="button"
					onClick={() => navigate({ to: "/main/game/card-sort" })}
					className="flex w-full cursor-pointer items-center gap-[14px] rounded-[16px] bg-white p-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-colors active:bg-[#F6F7F8]"
				>
					<div className="flex size-[48px] shrink-0 items-center justify-center rounded-[12px] bg-[#FFF8E1]">
						<Layers className="size-[24px] text-[#F9A825]" />
					</div>
					<div className="flex-1 text-left">
						<p className="font-bold text-[#24425F] text-[16px]">
							{t("game.list.cardSort.name")}
						</p>
						<p className="mt-[2px] text-[#9BA5B0] text-[13px]">
							{t("game.list.cardSort.description")}
						</p>
					</div>
					<ChevronRight className="size-[20px] shrink-0 text-[#C8CCD3]" />
				</button>

				{/* Particle Sniper */}
				<button
					type="button"
					onClick={() => navigate({ to: "/main/game/particle-sniper" })}
					className="flex w-full cursor-pointer items-center gap-[14px] rounded-[16px] bg-white p-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-colors active:bg-[#F6F7F8]"
				>
					<div className="flex size-[48px] shrink-0 items-center justify-center rounded-[12px] bg-[#E8EAF6]">
						<Crosshair className="size-[24px] text-[#5C6BC0]" />
					</div>
					<div className="flex-1 text-left">
						<p className="font-bold text-[#24425F] text-[16px]">
							{t("game.list.particleSniper.name")}
						</p>
						<p className="mt-[2px] text-[#9BA5B0] text-[13px]">
							{t("game.list.particleSniper.description")}
						</p>
					</div>
					<ChevronRight className="size-[20px] shrink-0 text-[#C8CCD3]" />
				</button>
			</div>
		</div>
	);
}
