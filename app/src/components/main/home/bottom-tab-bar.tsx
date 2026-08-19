import { Gamepad2, House, UserRound } from "lucide-react";
import { PracticeIcon, ClipIcon } from "@/assets/icons";
import { Link, useLocation } from "@tanstack/react-router";

interface TabItem {
	path: string;
	label: string;
	icon: (color: string) => React.ReactNode;
}

const TABS: TabItem[] = [
	{
		path: "/main",
		label: "홈",
		icon: (color) => <House className="size-[22px]" color={color} />,
	},
	{
		path: "/main/textbook",
		label: "교재학습",
		icon: (color) => <PracticeIcon color={color} />,
	},
	{
		path: "/main/game",
		label: "게임",
		icon: (color) => <Gamepad2 className="size-[22px]" color={color} />,
	},
	{
		path: "/main/clip",
		label: "표현클립",
		icon: (color) => <ClipIcon color={color} />,
	},
	{
		path: "/main/my",
		label: "MY",
		icon: (color) => <UserRound className="size-[22px]" color={color} />,
	},
];

export default function BottomTabBar() {
	const location = useLocation();

	// 게임 플레이 화면에서는 바텀 메뉴 숨김
	const isGamePlay =
		location.pathname.startsWith("/main/game/") &&
		location.pathname !== "/main/game/";
	if (isGamePlay) return null;

	return (
		<div className="sticky bottom-0 w-full h-[60px] flex justify-around items-center bg-white border-t border-[#F0F1F3]">
			{TABS.map((tab) => {
				const isActive =
					tab.path === "/main"
						? location.pathname === "/main"
						: location.pathname.startsWith(tab.path);
				const color = isActive ? "#0180FF" : "#C8CCD3";

				return (
					<Link
						key={tab.path}
						to={tab.path}
						className="flex flex-col items-center justify-center gap-[2px] cursor-pointer flex-1 h-full no-underline"
					>
						<div className="flex justify-center">{tab.icon(color)}</div>
						<span className="text-[10px]" style={{ color }}>
							{tab.label}
						</span>
					</Link>
				);
			})}
		</div>
	);
}
