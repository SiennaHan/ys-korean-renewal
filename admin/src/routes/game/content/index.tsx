import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Cherry, Crosshair, Gamepad2, Layers, Map } from "lucide-react";

export const Route = createFileRoute("/game/content/")({
	component: GameContentIndexPage,
});

const games = [
	{
		id: "spring-picnic",
		title: "봄 소풍 숫자 미션",
		desc: "캐릭터(4) · 문항(63)",
		icon: Cherry,
		color: "bg-pink-100 text-pink-600",
	},
	{
		id: "particle-sniper",
		title: "조사 스나이퍼",
		desc: "급수(6) · 레슨(20)",
		icon: Crosshair,
		color: "bg-indigo-100 text-indigo-600",
	},
	{
		id: "card-sort",
		title: "어휘 카드 마스터",
		desc: "카테고리 · 어휘 · 희귀어",
		icon: Layers,
		color: "bg-amber-100 text-amber-600",
	},
	{
		id: "seoul-puzzle",
		title: "서울 퍼즐",
		desc: "장소(10) · 단계(38)",
		icon: Map,
		color: "bg-emerald-100 text-emerald-600",
	},
	{
		id: "vocashot",
		title: "낱말맞추기",
		desc: "프리셋(5)",
		icon: Gamepad2,
		color: "bg-violet-100 text-violet-600",
	},
];

function GameContentIndexPage() {
	const navigate = useNavigate();
	return (
		<div>
			<div className="mb-6">
				<h1 className="font-bold text-2xl text-gray-900">컨텐츠 편집</h1>
				<p className="mt-1 text-gray-500 text-sm">
					각 게임의 학습 컨텐츠를 조회하고 수정합니다.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{games.map((g) => (
					<button
						key={g.id}
						type="button"
						onClick={() =>
							navigate({
								to: "/game/content/$game",
								params: { game: g.id },
							})
						}
						className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 text-left transition hover:border-violet-300 hover:shadow-sm"
					>
						<div
							className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${g.color}`}
						>
							<g.icon className="h-6 w-6" />
						</div>
						<div className="flex-1">
							<div className="font-semibold text-gray-900 text-sm">
								{g.title}
							</div>
							<div className="mt-0.5 text-gray-500 text-xs">{g.desc}</div>
						</div>
					</button>
				))}
			</div>
		</div>
	)
}
