import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useCallback, useEffect, useState } from "react";
import { api } from "@/api/api";
import type { ClassLevel, School } from "@/api/apiType";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, ChevronRight, Pencil, Plus, X } from "lucide-react";

export const Route = createFileRoute("/school")({
	component: SchoolPage,
});

function SchoolPage() {
	const [schools, setSchools] = useState<School[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [showForm, setShowForm] = useState(false);
	const [newCode, setNewCode] = useState("");
	const [newName, setNewName] = useState("");
	const [editingId, setEditingId] = useState<number | null>(null);
	const [editCode, setEditCode] = useState("");
	const [editName, setEditName] = useState("");

	// 반 관리
	const [expandedSchoolId, setExpandedSchoolId] = useState<number | null>(
		null,
	);
	const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
	const [classLevelsLoading, setClassLevelsLoading] = useState(false);
	const [newLevelLabel, setNewLevelLabel] = useState("");
	const [editingLevelId, setEditingLevelId] = useState<number | null>(null);
	const [editLevelLabel, setEditLevelLabel] = useState("");

	const loadSchools = useCallback(async () => {
		setIsLoading(true);
		try {
			const res = await api.get<School[]>("/school/list");
			if (res.result && res.data) {
				setSchools(res.data);
			}
		} catch {
			console.error("학교 목록 조회 실패");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadSchools();
	}, [loadSchools]);

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newCode || !newName) return;

		try {
			const res = await api.post("/school", {
				school_code: newCode,
				school_name: newName,
			});
			if (res.result) {
				setNewCode("");
				setNewName("");
				setShowForm(false);
				loadSchools();
			} else {
				alert(res.message || "학교 등록에 실패했습니다.");
			}
		} catch {
			alert("서버 오류가 발생했습니다.");
		}
	};

	const handleUpdate = async (id: number) => {
		try {
			const res = await api.patch(`/school/${id}`, {
				school_code: editCode,
				school_name: editName,
			});
			if (res.result) {
				setEditingId(null);
				loadSchools();
			}
		} catch {
			alert("수정 실패");
		}
	};

	const handleDelete = async (id: number) => {
		if (!confirm("이 학교를 삭제하시겠습니까?")) return;
		try {
			await api.delete(`/school/${id}`);
			loadSchools();
		} catch {
			alert("삭제 실패");
		}
	};

	const startEdit = (school: School) => {
		setEditingId(school.id);
		setEditCode(school.school_code);
		setEditName(school.school_name);
	};

	// ── 반 관리 ──

	const loadClassLevels = useCallback(async (schoolId: number) => {
		setClassLevelsLoading(true);
		try {
			const res = await api.get<ClassLevel[]>(
				`/school/${schoolId}/class-levels`,
			);
			if (res.result && res.data) {
				setClassLevels(res.data);
			}
		} catch {
			console.error("반 목록 조회 실패");
		} finally {
			setClassLevelsLoading(false);
		}
	}, []);

	const toggleExpand = (schoolId: number) => {
		if (expandedSchoolId === schoolId) {
			setExpandedSchoolId(null);
			setClassLevels([]);
			setEditingLevelId(null);
			setNewLevelLabel("");
		} else {
			setExpandedSchoolId(schoolId);
			setEditingLevelId(null);
			setNewLevelLabel("");
			loadClassLevels(schoolId);
		}
	};

	const handleCreateLevel = async (schoolId: number) => {
		if (!newLevelLabel.trim()) return;
		try {
			const res = await api.post(`/school/${schoolId}/class-levels`, {
				label: newLevelLabel.trim(),
			});
			if (res.result) {
				setNewLevelLabel("");
				loadClassLevels(schoolId);
			}
		} catch {
			alert("반 추가 실패");
		}
	};

	const handleUpdateLevel = async (levelId: number) => {
		if (!editLevelLabel.trim()) return;
		try {
			const res = await api.patch(`/school/class-levels/${levelId}`, {
				label: editLevelLabel.trim(),
			});
			if (res.result) {
				setEditingLevelId(null);
				if (expandedSchoolId) loadClassLevels(expandedSchoolId);
			}
		} catch {
			alert("반 수정 실패");
		}
	};

	const startEditLevel = (level: ClassLevel) => {
		setEditingLevelId(level.id);
		setEditLevelLabel(level.label);
	};

	return (
		<div className="mx-auto max-w-5xl">
			{/* 헤더 */}
			<div className="mb-8 flex items-center justify-between">
				<h1 className="font-bold text-2xl tracking-tight">학교 관리</h1>
				<button
					type="button"
					onClick={() => setShowForm(!showForm)}
					className="flex h-10 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-5 font-medium text-gray-700 text-sm transition hover:bg-gray-50"
				>
					<Plus className="h-4 w-4" />
					학교 추가
				</button>
			</div>

			{/* ── 학교 추가 다이얼로그 ── */}
			{showForm && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl">
						<div className="mb-6 flex items-center justify-between">
							<h2 className="font-semibold text-gray-900 text-lg">
								학교 추가
							</h2>
							<button
								type="button"
								onClick={() => setShowForm(false)}
								className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<form onSubmit={handleCreate} className="space-y-4">
							<div>
								<label
									htmlFor="school-code"
									className="mb-1.5 block font-medium text-gray-700 text-sm"
								>
									학교 코드
								</label>
								<Input
									id="school-code"
									value={newCode}
									onChange={(e) => setNewCode(e.target.value)}
									placeholder="예: YSU"
									required
								/>
							</div>
							<div>
								<label
									htmlFor="school-name"
									className="mb-1.5 block font-medium text-gray-700 text-sm"
								>
									학교명
								</label>
								<Input
									id="school-name"
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									placeholder="예: 연세대학교"
									required
								/>
							</div>
							<p className="text-gray-400 text-xs">
								반(학년)은 학교 등록 후 반 관리에서 추가할 수
								있습니다.
							</p>
							<div className="flex justify-end gap-2 pt-2">
								<button
									type="button"
									onClick={() => setShowForm(false)}
									className="rounded-full border border-gray-200 px-5 py-2 font-medium text-gray-600 text-sm transition hover:bg-gray-50"
								>
									취소
								</button>
								<button
									type="submit"
									className="rounded-full bg-gray-900 px-5 py-2 font-medium text-sm text-white transition hover:bg-gray-800"
								>
									등록
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* 학교 목록 테이블 */}
			<div className="overflow-x-auto rounded-xl border border-gray-200">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-gray-100 border-b bg-gray-50/80">
							<th className="px-5 py-4 text-left font-normal text-gray-500">
								학교 코드
							</th>
							<th className="px-5 py-4 text-left font-normal text-gray-500">
								학교명
							</th>
							<th className="px-5 py-4 text-left font-normal text-gray-500">
								반(학년)
							</th>
							<th className="px-5 py-4 text-left font-normal text-gray-500">
								등록일
							</th>
							<th className="w-36 px-5 py-4" />
						</tr>
					</thead>
					<tbody>
						{schools.map((school) => (
							<Fragment key={school.id}>
								<tr className="border-gray-100 border-b transition hover:bg-gray-50/50">
									{editingId === school.id ? (
										<>
											<td className="px-3 py-3">
												<Input
													value={editCode}
													onChange={(e) =>
														setEditCode(
															e.target.value,
														)
													}
													className="h-9"
												/>
											</td>
											<td className="px-3 py-3">
												<Input
													value={editName}
													onChange={(e) =>
														setEditName(
															e.target.value,
														)
													}
													className="h-9"
												/>
											</td>
											<td className="px-5 py-4">
												<button
													type="button"
													onClick={() =>
														toggleExpand(school.id)
													}
													className="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-gray-600 text-xs transition hover:bg-gray-100"
												>
													{expandedSchoolId ===
													school.id ? (
														<ChevronDown className="h-3.5 w-3.5" />
													) : (
														<ChevronRight className="h-3.5 w-3.5" />
													)}
													반 관리
												</button>
											</td>
											<td className="px-5 py-4 text-gray-400">
												{new Date(
													school.created_at,
												).toLocaleDateString("ko-KR")}
											</td>
											<td className="px-5 py-4">
												<div className="flex items-center justify-end gap-2">
													<button
														type="button"
														onClick={() =>
															handleUpdate(
																school.id,
															)
														}
														className="rounded-full border border-green-200 p-1.5 text-green-600 transition hover:bg-green-50"
													>
														<Check className="h-4 w-4" />
													</button>
													<button
														type="button"
														onClick={() =>
															setEditingId(null)
														}
														className="rounded-full border border-gray-200 p-1.5 text-gray-400 transition hover:bg-gray-100"
													>
														<X className="h-4 w-4" />
													</button>
												</div>
											</td>
										</>
									) : (
										<>
											<td className="px-5 py-4 font-medium font-mono text-gray-900">
												{school.school_code}
											</td>
											<td className="px-5 py-4 text-gray-600">
												{school.school_name}
											</td>
											<td className="px-5 py-4">
												<button
													type="button"
													onClick={() =>
														toggleExpand(school.id)
													}
													className="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-gray-600 text-xs transition hover:bg-gray-100"
												>
													{expandedSchoolId ===
													school.id ? (
														<ChevronDown className="h-3.5 w-3.5" />
													) : (
														<ChevronRight className="h-3.5 w-3.5" />
													)}
													반 관리
												</button>
											</td>
											<td className="px-5 py-4 text-gray-400">
												{new Date(
													school.created_at,
												).toLocaleDateString("ko-KR")}
											</td>
											<td className="px-5 py-4">
												<div className="flex items-center justify-end gap-2">
													<button
														type="button"
														onClick={() =>
															startEdit(school)
														}
														className="rounded-full border border-gray-200 px-4 py-1.5 font-medium text-gray-600 text-xs transition hover:bg-gray-100"
													>
														수정
													</button>
													<button
														type="button"
														onClick={() =>
															handleDelete(
																school.id,
															)
														}
														className="rounded-full border border-red-200 px-4 py-1.5 font-medium text-red-500 text-xs transition hover:bg-red-50"
													>
														삭제
													</button>
												</div>
											</td>
										</>
									)}
								</tr>

								{/* ── 반 관리 확장 영역 ── */}
								{expandedSchoolId === school.id && (
									<tr>
										<td
											colSpan={5}
											className="bg-gray-50/50 px-8 py-4"
										>
											<div className="rounded-lg border border-gray-200 bg-white p-4">
												<h3 className="mb-3 font-medium text-gray-700 text-sm">
													반(학년) 목록
												</h3>

												{classLevelsLoading ? (
													<p className="py-4 text-center text-gray-400 text-xs">
														불러오는 중...
													</p>
												) : classLevels.length ===
												  0 ? (
													<p className="py-4 text-center text-gray-400 text-xs">
														등록된 반이 없습니다.
													</p>
												) : (
													<div className="space-y-2">
														{classLevels.map(
															(level) => (
																<div
																	key={
																		level.id
																	}
																	className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-2.5"
																>
																	<span className="w-10 font-mono text-gray-400 text-xs">
																		#
																		{
																			level.id
																		}
																	</span>
																	{editingLevelId ===
																	level.id ? (
																		<>
																			<Input
																				value={
																					editLevelLabel
																				}
																				onChange={(
																					e,
																				) =>
																					setEditLevelLabel(
																						e
																							.target
																							.value,
																					)
																				}
																				className="h-8 flex-1"
																				onKeyDown={(
																					e,
																				) => {
																					if (
																						e.key ===
																						"Enter"
																					) {
																						e.preventDefault();
																						handleUpdateLevel(
																							level.id,
																						);
																					}
																				}}
																			/>
																			<button
																				type="button"
																				onClick={() =>
																					handleUpdateLevel(
																						level.id,
																					)
																				}
																				className="rounded-full border border-green-200 p-1.5 text-green-600 transition hover:bg-green-50"
																			>
																				<Check className="h-3.5 w-3.5" />
																			</button>
																			<button
																				type="button"
																				onClick={() =>
																					setEditingLevelId(
																						null,
																					)
																				}
																				className="rounded-full border border-gray-200 p-1.5 text-gray-400 transition hover:bg-gray-100"
																			>
																				<X className="h-3.5 w-3.5" />
																			</button>
																		</>
																	) : (
																		<>
																			<span className="flex-1 text-gray-700 text-sm">
																				{
																					level.label
																				}
																			</span>
																			<button
																				type="button"
																				onClick={() =>
																					startEditLevel(
																						level,
																					)
																				}
																				className="rounded-full border border-gray-200 p-1.5 text-gray-400 transition hover:bg-gray-100"
																			>
																				<Pencil className="h-3.5 w-3.5" />
																			</button>
																		</>
																	)}
																</div>
															),
														)}
													</div>
												)}

												{/* 새 반 추가 */}
												<div className="mt-3 flex items-center gap-2">
													<Input
														value={newLevelLabel}
														onChange={(e) =>
															setNewLevelLabel(
																e.target.value,
															)
														}
														placeholder="새 반 이름 (예: 7급)"
														className="h-8 flex-1"
														onKeyDown={(e) => {
															if (
																e.key ===
																"Enter"
															) {
																e.preventDefault();
																handleCreateLevel(
																	school.id,
																);
															}
														}}
													/>
													<button
														type="button"
														onClick={() =>
															handleCreateLevel(
																school.id,
															)
														}
														className="flex h-8 items-center gap-1 rounded-full border border-gray-200 px-3 font-medium text-gray-600 text-xs transition hover:bg-gray-100"
													>
														<Plus className="h-3.5 w-3.5" />
														추가
													</button>
												</div>
											</div>
										</td>
									</tr>
								)}
							</Fragment>
						))}
					</tbody>
				</table>
				{schools.length === 0 && !isLoading && (
					<p className="py-12 text-center text-gray-400">
						등록된 학교가 없습니다.
					</p>
				)}
			</div>

			{isLoading && (
				<p className="mt-8 text-center text-gray-400">
					학교 목록을 불러오는 중...
				</p>
			)}
		</div>
	);
}
