import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileEdit, Gamepad2 } from "lucide-react";

export const Route = createFileRoute("/game/")({
	component: GameHubPage,
});

const cards = [
	{
		id: "vocashot",
		title: "낱말맞추기",
		desc: "VocaShot 멀티플레이어 방을 만들고 관리합니다.",
		icon: Gamepad2,
		color: "bg-violet-100 text-violet-600",
		to: "/game/vocashot" as const,
	},
	{
		id: "content",
		title: "컨텐츠 편집",
		desc: "5종 게임의 학습 컨텐츠(친구, 문항, 어휘 등)를 직접 편집합니다.",
		icon: FileEdit,
		color: "bg-amber-100 text-amber-600",
		to: "/game/content" as const,
	},
];

function GameHubPage() {
	const navigate = useNavigate();
	return (
		<div>
			<div className="mb-6">
				<h1 className="font-bold text-2xl text-gray-900">게임관리</h1>
				<p className="mt-1 text-gray-500 text-sm">
					게임 방 운영과 컨텐츠 편집을 한 곳에서 관리합니다.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{cards.map((c) => (
					<button
						key={c.id}
						type="button"
						onClick={() => navigate({ to: c.to })}
						className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 text-left transition hover:border-violet-300 hover:shadow-sm"
					>
						<div
							className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${c.color}`}
						>
							<c.icon className="h-6 w-6" />
						</div>
						<div className="flex-1">
							<div className="font-semibold text-gray-900 text-sm">
								{c.title}
							</div>
							<div className="mt-0.5 text-gray-500 text-xs">{c.desc}</div>
						</div>
					</button>
				))}
			</div>
		</div>
	);
}
