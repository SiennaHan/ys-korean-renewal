import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listRoomsByCreator, deleteRoom } from "@/lib/vocashot/appsync";
import type { Room } from "@/lib/vocashot/types";
import { Plus, Monitor, Trash2 } from "lucide-react";

export const Route = createFileRoute("/game/vocashot/")({
	component: GameListPage,
});

function GameListPage() {
	const navigate = useNavigate();
	const [rooms, setRooms] = useState<Room[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const adminUser = useMemo(() => {
		try {
			return JSON.parse(localStorage.getItem("adminUser") || "{}");
		} catch {
			return {};
		}
	}, []);

	useEffect(() => {
		if (!adminUser.email) return;
		let cancelled = false;
		setIsLoading(true);
		listRoomsByCreator(adminUser.email)
			.then((data) => {
				if (!cancelled) setRooms(data);
			})
			.catch((err) => {
				console.error("Failed to fetch rooms:", err);
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false);
			})
		return () => {
			cancelled = true;
		}
	}, [adminUser.email]);

	const handleDelete = async (pin: string) => {
		if (!window.confirm(`PIN ${pin} 게임을 삭제하시겠습니까?`)) return;
		try {
			await deleteRoom(pin);
			setRooms((prev) => prev.filter((r) => r.pin !== pin));
		} catch (err) {
			console.error("Failed to delete room:", err);
		}
	}

	const phaseLabel = (phase: string) => {
		switch (phase) {
			case "LOBBY":
				return (
					<span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 font-medium text-gray-700 text-xs">
						대기중
					</span>
				)
			case "PLAYING":
			case "COUNTDOWN":
				return (
					<span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 font-medium text-green-700 text-xs">
						진행중
					</span>
				)
			case "ENDED":
				return (
					<span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 font-medium text-red-700 text-xs">
						종료
					</span>
				)
			default:
				return (
					<span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 font-medium text-gray-500 text-xs">
						{phase}
					</span>
				)
		}
	}

	const formatDate = (ts: number) => {
		const d = new Date(ts);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
	}

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl text-gray-900">낱말맞추기</h1>
					<p className="mt-1 text-gray-500 text-sm">
						VocaShot 멀티플레이어 방을 생성하고 관리합니다.
					</p>
				</div>
				<button
					type="button"
					onClick={() => navigate({ to: "/game/vocashot/create" })}
					className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 font-semibold text-sm text-white transition hover:bg-violet-700"
				>
					<Plus className="h-4 w-4" />
					새 게임 만들기
				</button>
			</div>

			{isLoading ? (
				<div className="flex items-center justify-center py-20 text-gray-400">
					불러오는 중...
				</div>
			) : rooms.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 py-20 text-gray-400">
					<p className="text-sm">생성된 게임이 없습니다.</p>
					<p className="mt-1 text-xs">
						"새 게임 만들기" 버튼을 눌러 첫 게임을 만들어 보세요.
					</p>
				</div>
			) : (
				<div className="overflow-hidden rounded-lg border border-gray-200">
					<table className="w-full text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left font-medium text-gray-500">
									PIN
								</th>
								<th className="px-4 py-3 text-left font-medium text-gray-500">
									상태
								</th>
								<th className="px-4 py-3 text-left font-medium text-gray-500">
									문제 수
								</th>
								<th className="px-4 py-3 text-left font-medium text-gray-500">
									최대 인원
								</th>
								<th className="px-4 py-3 text-left font-medium text-gray-500">
									생성일
								</th>
								<th className="px-4 py-3 text-right font-medium text-gray-500">
									액션
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200">
							{rooms.map((room) => (
								<tr key={room.pin} className="hover:bg-gray-50">
									<td className="px-4 py-3 font-mono font-semibold text-gray-900 tracking-wider">
										{room.pin}
									</td>
									<td className="px-4 py-3">
										{phaseLabel(room.runtime.phase)}
									</td>
									<td className="px-4 py-3 text-gray-600">
										{room.config.questions.length}
									</td>
									<td className="px-4 py-3 text-gray-600">
										{room.config.maxPlayers}
									</td>
									<td className="px-4 py-3 text-gray-500">
										{formatDate(room.runtime.createdAt)}
									</td>
									<td className="px-4 py-3 text-right">
										<div className="flex items-center justify-end gap-2">
											<button
												type="button"
												onClick={() =>
													navigate({
														to: "/game/vocashot/host/$pin",
														params: { pin: room.pin },
													})
												}
												className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 font-medium text-blue-700 text-xs transition hover:bg-blue-100"
											>
												<Monitor className="h-3.5 w-3.5" />
												호스트
											</button>
											<button
												type="button"
												onClick={() => handleDelete(room.pin)}
												className="inline-flex items-center gap-1 rounded-md bg-red-50 px-3 py-1.5 font-medium text-red-700 text-xs transition hover:bg-red-100"
											>
												<Trash2 className="h-3.5 w-3.5" />
												삭제
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	)
}
