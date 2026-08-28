import { removeAccessToken } from "@/api/api";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import {
	AudioLines,
	ChartNoAxesCombined,
	Gamepad2,
	LogOut,
	School,
	Shield,
	Ticket,
	Users,
	Volume2,
} from "lucide-react";
import { useMemo } from "react";

const allMenuItems = [
	{
		label: "관리자",
		path: "/admin",
		icon: Shield,
		roles: ["master_admin", "school_admin"],
	},
	{
		label: "학교관리",
		path: "/school",
		icon: School,
		roles: ["master_admin"],
	},
	{
		label: "코드발급",
		path: "/signup-code",
		icon: Ticket,
		// **student_admin 은 뺀다** — 발급 주체는 마스터와 학교 관리자 둘뿐이다
		// (기획 2026-08-28). 서버도 같은 규칙으로 한 번 더 막는다.
		roles: ["master_admin", "school_admin"],
	},
	{
		label: "학생관리",
		path: "/student",
		icon: Users,
		roles: ["master_admin", "school_admin", "student_admin"],
	},
	{
		label: "게임관리",
		path: "/game",
		icon: Gamepad2,
		roles: ["master_admin", "school_admin", "student_admin"],
	},
	{
		label: "QR통계",
		path: "/qr-stats",
		icon: ChartNoAxesCombined,
		roles: ["master_admin"],
	},
	{
		label: "STT비교",
		path: "/stt-shadow",
		icon: AudioLines,
		roles: ["master_admin"],
	},
	{
		label: "TTS비교",
		path: "/tts-test",
		icon: Volume2,
		roles: ["master_admin"],
	},
] as const;

export default function Sidebar() {
	const location = useLocation();

	const adminUser = useMemo(() => {
		try {
			return JSON.parse(localStorage.getItem("adminUser") || "{}");
		} catch {
			return {};
		}
	}, []);

	const menuItems = useMemo(
		() =>
			allMenuItems.filter((item) => item.roles.includes(adminUser.role ?? "")),
		[adminUser.role],
	);

	const handleLogout = () => {
		removeAccessToken();
		window.location.href = "/login";
	};

	return (
		<aside className="flex h-screen w-20 flex-col items-center bg-gray-900 py-6">
			{/* 로고 */}
			<div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500">
				<span className="font-bold text-white text-xs leading-none">
					{adminUser.role === "master_admin"
						? "관리"
						: (adminUser.schoolName || "학당").slice(0, 2)}
				</span>
			</div>

			{/* 메뉴 */}
			<nav className="flex flex-1 flex-col items-center gap-2">
				{menuItems.map((item) => {
					const isActive =
						location.pathname === item.path ||
						location.pathname.startsWith(`${item.path}/`);
					return (
						<Link
							key={item.path}
							to={item.path}
							className={cn(
								"flex w-14 flex-col items-center gap-1 rounded-xl px-2 py-2.5 transition-colors",
								isActive
									? "bg-gray-700/80 text-white"
									: "text-gray-500 hover:bg-gray-800 hover:text-gray-300",
							)}
						>
							<item.icon className="h-5 w-5" />
							<span className="text-[10px] leading-tight">{item.label}</span>
						</Link>
					);
				})}
			</nav>

			{/* 로그아웃 */}
			<button
				type="button"
				onClick={handleLogout}
				className="flex w-14 flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
			>
				<LogOut className="h-5 w-5" />
				<span className="text-[10px] leading-tight">로그아웃</span>
			</button>
		</aside>
	);
}
