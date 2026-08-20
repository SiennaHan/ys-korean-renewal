import { Link, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { IconClip, IconGame, IconHome, IconTextbook, IconUser } from "./icons";

const TABS = [
	{ path: "/main", key: "home", Icon: IconHome },
	{ path: "/main/textbook", key: "textbook", Icon: IconTextbook },
	{ path: "/main/game", key: "game", Icon: IconGame },
	{ path: "/main/clip", key: "clip", Icon: IconClip },
	{ path: "/main/my", key: "my", Icon: IconUser },
] as const;

/**
 * 하단 탭 바. .nav-frame 의 마지막 자식이라 스크롤 영역 아래에 고정으로 앉는다.
 *
 * 게임을 실제로 하는 동안에는 숨는다 — 게임 화면은 자기 하단 조작을 쓰고,
 * 60px 을 내주면 놀이판이 그만큼 좁아진다.
 */
export default function TabBar() {
	const { pathname } = useLocation();
	const { t } = useTranslation();

	const inGamePlay =
		pathname.startsWith("/main/game/") && pathname !== "/main/game/";
	if (inGamePlay) return null;

	return (
		<nav className="tabbar">
			{TABS.map(({ path, key, Icon }) => {
				const on =
					path === "/main" ? pathname === "/main" : pathname.startsWith(path);
				return (
					<Link key={path} to={path} className={on ? "on" : ""}>
						<Icon />
						<span>{t(`nav.${key}`)}</span>
					</Link>
				);
			})}
		</nav>
	);
}
