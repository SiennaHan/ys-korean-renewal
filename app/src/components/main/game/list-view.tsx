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
import type React from "react";
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
		iconBg: "bg-[#FFF0F5]",
		iconColor: "text-[#D4537E]",
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
		iconBg: "bg-[#E8F5E9]",
		iconColor: "text-[#2E7D32]",
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
		iconBg: "bg-[#FFF8E1]",
		iconColor: "text-[#F9A825]",
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
		iconBg: "bg-[#E8EAF6]",
		iconColor: "text-[#5C6BC0]",
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
	/**
	 * 화면이 초점을 받을 자리. 목록은 화면이 하나뿐이라 옮길 일이 없어 보이지만,
	 * **게임에서 나오면 여기로 돌아온다.** 그때 초점이 `<body>` 에 떨어져 있으면
	 * 스크린리더는 아무 말도 안 하고 다음 Tab 은 문서 맨 처음으로 간다.
	 * 만드는 쪽은 `routes/main/game/index.tsx` 의 `useScreenFocus("list")` 다.
	 */
	frameRef?: React.Ref<HTMLDivElement>;
}

export function GameListView({
	progress,
	onOpen,
	frameRef,
}: GameListViewProps) {
	const { t } = useTranslation();

	/*
	 * 이관한 CSS 가 .game-frame[data-screen="list"] .ux-* 형태라 래퍼가 필요하다.
	 *
	 * 두 겹의 클래스가 목업(game__list)과 어긋나 있었다 — 앱은 ux-list-scroll 을
	 * 배경 칸에 붙이고 ux-list-shell 을 목록만 감싸는 빈 칸으로 뒀는데, 목업은
	 * ux-list-scroll 이 바깥 스크롤 껍데기(라우트 레이아웃이 그리는 칸)이고
	 * ux-list-shell 이 곧 그 배경 칸이며 머리와 목록이 그 직계 자식이다.
	 * 목업을 따라 맞췄다. 두 클래스 다 game-frame 의 자손으로 남아 CSS 는 그대로 산다.
	 */
	return (
		/* class 가 첫 속성이어야 목업 대조가 이 껍데기를 벗긴다 */
		<div
			ref={frameRef}
			className="game-frame"
			data-screen="list"
			tabIndex={-1}
			aria-label={t("game.list.title")}
		>
			<div className="ux-list-scroll">
				<div className="ux-list-shell flex h-full flex-col bg-[#F9FAFC]">
					{/* Header */}
					<div className="ux-list-head flex items-center justify-center px-[16px] py-[16px]">
						<p className="ux-list-title font-semibold text-[#383A3F] text-[17px]">
							{t("game.list.title")}
						</p>
					</div>

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
									className="ux-control ux-game-card flex w-full cursor-pointer items-center gap-[14px] rounded-[16px] bg-white p-[16px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-colors active:bg-[#F6F7F8]"
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
										{/*
										 * 목업은 text-[#9BA5B0] 을 늘 두고 진행이 있을 때
										 * is-progress 를 **더한다** — 색은 game.css 의
										 * .is-progress 가 덮는다. 앱은 둘을 갈라 붙여서
										 * 진행이 있으면 회색 클래스를 뺐다. 목업을 따른다.
										 */}
										<p
											className={`ux-game-sub mt-[2px] text-[#9BA5B0] text-[13px] ${
												done ? "is-progress" : ""
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
