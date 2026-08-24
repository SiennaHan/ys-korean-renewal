import type { GameProgressRecord } from "@/api/apiType";
import {
	Cherry,
	ChevronRight,
	Crosshair,
	Gamepad2,
	Layers,
	Map,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * 게임 목록의 표시만 담당한다. 진행을 받아 오는 일은 routes/main/game/index.tsx 가 한다.
 *
 * 왜 갈랐나 — 목업 대조(scripts/activity-parity.tsx)가 이 화면을 검사할 수 있게
 * 하려고. 합쳐져 있으면 정적으로 그릴 때 진행이 비어 다섯 줄 다 설명이 된다.
 * 홈(components/main/home/view.tsx)을 가른 것과 같은 이유다.
 */
export interface GameEntry {
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

export const GAMES: GameEntry[] = [
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

export interface GameListViewProps {
	/**
	 * 게임 key → 둘째 줄에 넣을 진행 한 줄. 없거나 null 이면 설명이 남는다 —
	 * 목업의 조사 스나이퍼가 그 상태다.
	 */
	progress: Record<string, string | null>;
	onOpen: (to: string) => void;
}

export function GameListView({ progress, onOpen }: GameListViewProps) {
	const { t } = useTranslation();

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
									onClick={() => onOpen(to)}
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
