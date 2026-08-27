import { isGameOpen } from "@/api/entitlement";
import { GAMES } from "@/components/main/game/list-view";
import { useEntitlement } from "@/shared/store/entitlement-store";
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
 *
 * **잠긴 게임은 "하는 중" 이 아니다.** 주소가 게임이어도 `GameGate` 가 결제
 * 안내를 그리고 있으면 놀이판이 없다 — 그때 탭 바까지 숨으면 나갈 길이
 * 안내 안의 버튼 하나뿐이라 갇힌다(2026-08-27 에 기획자가 지적했다).
 * 그래서 경로만 보지 않고 **그 게임이 열려 있는지**까지 본다.
 */
export default function TabBar() {
	const { pathname } = useLocation();
	const { t } = useTranslation();
	const { entitlement, ready } = useEntitlement();

	const onGameRoute =
		pathname.startsWith("/main/game/") && pathname !== "/main/game/";
	/*
	 * 경로 → 게임 키는 `GAMES` 표가 정본이다(라우트 토막과 키가 다른 것이 있다 —
	 * 보카샷은 `/main/game/vocashot-solo` 인데 키는 `vocashot`).
	 * 답이 오기 전에는 숨긴다 — 게임을 여는 순간 탭 바가 번쩍이지 않게.
	 */
	const gameKey = GAMES.find((g) => g.to === pathname)?.key;
	const blocked =
		onGameRoute && ready && !!gameKey && !isGameOpen(entitlement, gameKey);

	if (onGameRoute && !blocked) return null;

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
