import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileEdit } from "lucide-react";

export const Route = createFileRoute("/game/")({
	component: GameHubPage,
});

/*
 * **교실용 VocaShot 카드가 여기 있었다 — 2026-08-29 에 걷었다.**
 * 선생님이 방을 열면 학생이 PIN 을 치고 들어오는 방식이었는데, 그 학생
 * 클라이언트를 2026-08-24 에 지웠다(`games_spec_v1` §19 ⑥). 즉 방을 열 수는
 * 있는데 들어올 학생이 없는 상태로 남아 있었다. 명세 §18 이 처음부터
 * 「방·appsync·구독 4종을 버린다」로 정해 둔 것을 마저 한 것이다.
 */
const cards = [
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
					게임에 나가는 학습 컨텐츠를 편집합니다.
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
