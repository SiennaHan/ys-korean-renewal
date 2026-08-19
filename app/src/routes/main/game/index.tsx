import type { GameProgressRecord } from "@/api/apiType";
import { getGameProgress } from "@/api/game-progress";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	Cherry,
	ChevronRight,
	Crosshair,
	Gamepad2,
	Layers,
	Map,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/main/game/")({
	component: GamePage,
});

interface GameEntry {
	/** 서버의 game_name — 진행을 읽어 올 때 쓴다 */
	key: string;
	to: string;
	/** i18n 의 game.list.<i18nKey> */
	i18nKey: string;
	Icon: LucideIcon;
	iconBg: string;
	iconColor: string;
	/**
	 * 저장된 진행을 한 줄로 만든다. 아직 한 판도 안 했으면 null 을 돌려
	 * 설명이 그대로 남게 한다 — 목업의 조사 스나이퍼가 그 상태다.
	 */
	progress: (rows: GameProgressRecord[]) => string | null;
}

/** 점수가 가장 높은 행 */
const topScore = (rows: GameProgressRecord[]) =>
	rows.reduce<GameProgressRecord | null>(
		(best, r) =>
			r.score != null && (!best || r.score > (best.score ?? 0)) ? r : best,
		null,
	);

const GAMES: GameEntry[] = [
	{
		key: "vocashot",
		to: "/main/game/vocashot-solo",
		i18nKey: "vocashot",
		Icon: Gamepad2,
		iconBg: "bg-[#FFF3E0]",
		iconColor: "text-[#FF6D00]",
		// stage_id 는 lv{급}
		progress: (rows) => {
			const top = topScore(rows);
			if (!top?.score) return null;
			return `${top.stage_id.replace("lv", "")}급 최고 ${top.score.toLocaleString("ko-KR")}점`;
		},
	},
	{
		key: "spring-picnic",
		to: "/main/game/spring-picnic",
		i18nKey: "springPicnic",
		Icon: Cherry,
		iconBg: "bg-[#FCE4EC]",
		iconColor: "text-[#E91E63]",
		// 봄소풍은 마지막 판을 _meta 행의 extra 에 남긴다 (lastFriend · lastLv)
		progress: (rows) => {
			const meta = rows.find((r) => r.stage_id === "_meta");
			const friend = meta?.extra?.lastFriend;
			if (!friend) return null;
			return `${friend} · ${meta?.extra?.lastLv ?? 1}단계까지 했어요`;
		},
	},
	{
		key: "seoul-puzzle",
		to: "/main/game/seoul-puzzle",
		i18nKey: "seoulPuzzle",
		Icon: Map,
		iconBg: "bg-[#E3F2FD]",
		iconColor: "text-[#1E88E5]",
		// 장소마다 한 행씩 쌓인다. _meta 행은 세지 않는다
		progress: (rows) => {
			const places = rows.filter((r) => r.stage_id !== "_meta");
			if (places.length === 0) return null;
			return `10곳 중 ${places.length}곳 다녀왔어요`;
		},
	},
	{
		key: "card-sort",
		to: "/main/game/card-sort",
		i18nKey: "cardSort",
		Icon: Layers,
		iconBg: "bg-[#E8F5E9]",
		iconColor: "text-[#43A047]",
		// stage_id 는 {급}_{과}
		progress: (rows) => {
			const top = topScore(rows);
			if (!top?.score) return null;
			return `${top.stage_id.replace("_", " ")} 최고 ${top.score.toLocaleString("ko-KR")}점`;
		},
	},
	{
		key: "particle-sniper",
		to: "/main/game/particle-sniper",
		i18nKey: "particleSniper",
		Icon: Crosshair,
		iconBg: "bg-[#F3E5F5]",
		iconColor: "text-[#8E24AA]",
		progress: (rows) => {
			const top = topScore(rows);
			if (!top?.score) return null;
			return `${top.stage_id.replace("_", " ")} 최고 ${top.score.toLocaleString("ko-KR")}점`;
		},
	},
];

function GamePage() {
	const navigate = useNavigate();
	const { t } = useTranslation();
	const [progress, setProgress] = useState<Record<string, string | null>>({});

	// 다섯 게임 다 점수를 저장하므로 목록 둘째 줄을 진행으로 채울 수 있다
	useEffect(() => {
		let alive = true;
		void (async () => {
			const entries = await Promise.all(
				GAMES.map(async (g) => {
					const rows = await getGameProgress(g.key);
					return [g.key, rows.length ? g.progress(rows) : null] as const;
				}),
			);
			if (alive) setProgress(Object.fromEntries(entries));
		})();
		return () => {
			alive = false;
		};
	}, []);

	// 이관한 CSS 가 .game-frame[data-screen="list"] .ux-* 형태라 래퍼가 필요하다
	return (
		<div className="game-frame" data-screen="list">
			<div className="ux-list-scroll flex h-full flex-col bg-[#F9FAFC]">
				{/* Header */}
				<div className="ux-list-head flex items-center justify-center px-[16px] py-[16px]">
					<p className="ux-list-title font-semibold text-[#383A3F] text-[17px]">
						{t("game.list.title")}
					</p>
				</div>

				<div className="ux-list-shell">
					<div className="ux-game-list flex flex-col gap-[12px] px-[16px] pt-[8px]">
						{GAMES.map(({ key, to, i18nKey, Icon, iconBg, iconColor }) => {
							const name = t(`game.list.${i18nKey}.name`);
							// 진행이 있으면 그것을, 없으면 설명을 보여 준다
							const done = progress[key];
							const sub = done ?? t(`game.list.${i18nKey}.description`);

							return (
								<button
									key={key}
									type="button"
									aria-label={`${name} · ${sub}`}
									onClick={() => navigate({ to })}
									className="ux-game-card flex w-full cursor-pointer items-center gap-[14px] rounded-[16px] bg-white p-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-colors active:bg-[#F6F7F8]"
								>
									<div
										className={`ux-game-icon flex size-[48px] shrink-0 items-center justify-center rounded-[12px] ${iconBg}`}
									>
										<Icon className={`size-[24px] ${iconColor}`} />
									</div>
									<div className="ux-game-copy flex-1 text-left">
										<p className="ux-game-name font-bold text-[#24425F] text-[16px]">
											{name}
										</p>
										<p
											className={`ux-game-sub mt-[2px] text-[13px] ${
												done ? "is-progress" : "text-[#9BA5B0]"
											}`}
										>
											{sub}
										</p>
									</div>
									<ChevronRight className="ux-game-chevron size-[20px] shrink-0 text-[#C8CCD3]" />
								</button>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
