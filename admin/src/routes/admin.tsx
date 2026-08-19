import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/api/api";
import type { AdminUser, School } from "@/api/apiType";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/admin")({
	component: AdminPage,
});

function AdminPage() {
	const [admins, setAdmins] = useState<AdminUser[]>([]);
	const [schools, setSchools] = useState<School[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	// 관리자 추가 다이얼로그
	const [showAddDialog, setShowAddDialog] = useState(false);
	const [addForm, setAddForm] = useState({
		email: "",
		password: "",
		name: "",
		role: "student_admin",
		school_code: "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);

	// 관리자 수정 다이얼로그
	const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
	const [editForm, setEditForm] = useState({
		name: "",
		role: "",
		school_code: "",
		password: "",
	});

	const adminUser = useMemo(() => {
		try {
			return JSON.parse(localStorage.getItem("adminUser") || "{}");
		} catch {
			return {};
		}
	}, []);

	const isMasterAdmin = adminUser.role === "master_admin";

	const schoolNameMap = useMemo(() => {
		const map: Record<string, string> = {};
		for (const s of schools) {
			map[s.school_code] = s.school_name;
		}
		return map;
	}, [schools]);

	const loadAdmins = useCallback(async () => {
		setIsLoading(true);
		try {
			const res = await api.get<AdminUser[]>("/admin/list");
			if (res.result && res.data) {
				setAdmins(res.data);
			}
		} catch {
			console.error("관리자 목록 조회 실패");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadAdmins();
	}, [loadAdmins]);

	useEffect(() => {
		if (!isMasterAdmin) return;
		const loadSchools = async () => {
			try {
				const res = await api.get<School[]>("/school/list");
				if (res.result && res.data) {
					setSchools(res.data);
				}
			} catch {
				console.error("학교 목록 조회 실패");
			}
		};
		loadSchools();
	}, [isMasterAdmin]);

	const handleApprove = async (id: number) => {
		try {
			await api.patch(`/admin/${id}/approve`);
			loadAdmins();
		} catch {
			alert("승인 실패");
		}
	};

	const handleReject = async (id: number) => {
		if (!confirm("이 관리자를 거부하시겠습니까?")) return;
		try {
			await api.patch(`/admin/${id}/reject`);
			loadAdmins();
		} catch {
			alert("거부 실패");
		}
	};

	const handleDelete = async (id: number) => {
		if (!confirm("이 관리자를 삭제하시겠습니까?")) return;
		try {
			await api.delete(`/admin/${id}`);
			loadAdmins();
		} catch {
			alert("삭제 실패");
		}
	};

	// 관리자 추가
	const handleAddSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!addForm.email || !addForm.password || !addForm.name) {
			alert("이메일, 비밀번호, 이름은 필수 입력입니다.");
			return;
		}
		setIsSubmitting(true);
		try {
			const res = await api.post("/admin", {
				email: addForm.email,
				password: addForm.password,
				name: addForm.name,
				role: isMasterAdmin ? addForm.role : "student_admin",
				school_code: isMasterAdmin
					? addForm.school_code || null
					: adminUser.schoolCode || null,
			});
			if (res.result) {
				setShowAddDialog(false);
				setAddForm({
					email: "",
					password: "",
					name: "",
					role: "student_admin",
					school_code: "",
				});
				loadAdmins();
			} else {
				alert(res.message || "관리자 등록에 실패했습니다.");
			}
		} catch {
			alert("서버 오류가 발생했습니다.");
		} finally {
			setIsSubmitting(false);
		}
	};

	// 관리자 수정
	const openEditDialog = (admin: AdminUser) => {
		setEditingAdmin(admin);
		setEditForm({
			name: admin.name,
			role: admin.role,
			school_code: admin.school_code || "",
			password: "",
		});
	};

	const handleEditSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingAdmin) return;
		try {
			const body: Record<string, string | null> = {
				name: editForm.name,
				role: isMasterAdmin ? editForm.role : "student_admin",
				school_code: isMasterAdmin
					? editForm.school_code || null
					: adminUser.schoolCode || null,
			};
			if (editForm.password) {
				body.password = editForm.password;
			}
			const res = await api.patch(`/admin/${editingAdmin.id}`, body);
			if (res.result) {
				setEditingAdmin(null);
				loadAdmins();
			} else {
				alert(res.message || "수정에 실패했습니다.");
			}
		} catch {
			alert("수정에 실패했습니다.");
		}
	};

	const getRoleName = (role: string) => {
		switch (role) {
			case "master_admin":
				return "마스터 관리자";
			case "school_admin":
				return "학교 관리자";
			case "student_admin":
				return "학생 관리자";
			default:
				return role;
		}
	};

	const getRoleBadgeClass = (role: string) => {
		switch (role) {
			case "master_admin":
				return "inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 font-medium text-violet-700 text-xs";
			case "school_admin":
				return "inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 font-medium text-blue-700 text-xs";
			case "student_admin":
				return "inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 font-medium text-gray-600 text-xs";
			default:
				return "inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 font-medium text-gray-600 text-xs";
		}
	};

	const pendingAdmins = admins.filter((a) => !a.is_approved);
	const approvedAdmins = admins.filter((a) => a.is_approved);

	return (
		<div className="mx-auto max-w-5xl space-y-10">
			{/* 헤더 */}
			<div className="flex items-center justify-between">
				<h1 className="font-bold text-2xl tracking-tight">관리자</h1>
				<button
					type="button"
					onClick={() => setShowAddDialog(true)}
					className="flex h-10 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-5 font-medium text-gray-700 text-sm transition hover:bg-gray-50"
				>
					<Plus className="h-4 w-4" />
					{isMasterAdmin ? "관리자 생성" : "학생 관리자 생성"}
				</button>
			</div>

			{/* 승인 대기 (master_admin only) */}
			{isMasterAdmin && (
				<section>
					<h2 className="mb-4 font-semibold text-gray-900 text-lg">
						승인 대기{" "}
						<span className="ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-100 px-2 font-medium text-amber-700 text-xs">
							{pendingAdmins.length}
						</span>
					</h2>
					{pendingAdmins.length > 0 ? (
						<div className="overflow-x-auto rounded-xl border border-gray-200">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-gray-100 border-b bg-gray-50/80">
										<th className="px-5 py-4 text-left font-normal text-gray-500">
											이름
										</th>
										<th className="px-5 py-4 text-left font-normal text-gray-500">
											이메일
										</th>
										<th className="px-5 py-4 text-left font-normal text-gray-500">
											신청일
										</th>
										<th className="w-32 px-5 py-4" />
									</tr>
								</thead>
								<tbody>
									{pendingAdmins.map((admin) => (
										<tr
											key={admin.id}
											className="border-gray-100 border-b transition last:border-b-0 hover:bg-gray-50/50"
										>
											<td className="px-5 py-4 font-medium text-gray-900">
												{admin.name}
											</td>
											<td className="px-5 py-4 text-gray-600">
												{admin.email}
											</td>
											<td className="px-5 py-4 text-gray-400">
												{new Date(
													admin.created_at,
												).toLocaleDateString("ko-KR")}
											</td>
											<td className="px-5 py-4">
												<div className="flex items-center justify-end gap-2">
													<button
														type="button"
														onClick={() =>
															handleApprove(
																admin.id,
															)
														}
														className="rounded-full border border-green-200 px-4 py-1.5 font-medium text-green-600 text-xs transition hover:bg-green-50"
													>
														승인
													</button>
													<button
														type="button"
														onClick={() =>
															handleReject(
																admin.id,
															)
														}
														className="rounded-full border border-red-200 px-4 py-1.5 font-medium text-red-500 text-xs transition hover:bg-red-50"
													>
														거부
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<div className="rounded-xl border border-gray-200 py-12 text-center">
							<p className="text-gray-400">
								승인 대기 중인 관리자가 없습니다.
							</p>
						</div>
					)}
				</section>
			)}

			{/* 관리자 목록 */}
			<section>
				<h2 className="mb-4 font-semibold text-gray-900 text-lg">
					{isMasterAdmin ? "관리자 목록" : "학생 관리자 목록"}{" "}
					<span className="ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-100 px-2 font-medium text-gray-600 text-xs">
						{approvedAdmins.length}
					</span>
				</h2>
				{!isLoading && approvedAdmins.length === 0 ? (
					<div className="rounded-xl border border-gray-200 py-20 text-center">
						<p className="text-gray-400">
							{isMasterAdmin
								? "등록된 관리자가 없습니다."
								: "등록된 학생 관리자가 없습니다."}
						</p>
					</div>
				) : approvedAdmins.length > 0 ? (
					<div className="overflow-x-auto rounded-xl border border-gray-200">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-gray-100 border-b bg-gray-50/80">
									<th className="px-5 py-4 text-left font-normal text-gray-500">
										이름
									</th>
									<th className="px-5 py-4 text-left font-normal text-gray-500">
										이메일
									</th>
									<th className="px-5 py-4 text-left font-normal text-gray-500">
										구분
									</th>
									{isMasterAdmin && (
										<th className="px-5 py-4 text-left font-normal text-gray-500">
											학교
										</th>
									)}
									<th className="px-5 py-4 text-left font-normal text-gray-500">
										등록일
									</th>
									<th className="w-36 px-5 py-4" />
								</tr>
							</thead>
							<tbody>
								{approvedAdmins.map((admin) => (
									<tr
										key={admin.id}
										className="border-gray-100 border-b transition last:border-b-0 hover:bg-gray-50/50"
									>
										<td className="px-5 py-4 font-medium text-gray-900">
											{admin.name}
										</td>
										<td className="px-5 py-4 text-gray-600">
											{admin.email}
										</td>
										<td className="px-5 py-4">
											<span
												className={getRoleBadgeClass(
													admin.role,
												)}
											>
												{getRoleName(admin.role)}
											</span>
										</td>
										{isMasterAdmin && (
											<td className="px-5 py-4 text-gray-600">
												{admin.school_code
													? schoolNameMap[
															admin.school_code
														] || admin.school_code
													: "-"}
											</td>
										)}
										<td className="px-5 py-4 text-gray-400">
											{new Date(
												admin.created_at,
											).toLocaleDateString("ko-KR")}
										</td>
										<td className="px-5 py-4">
											<div className="flex items-center justify-end gap-2">
												<button
													type="button"
													onClick={() =>
														openEditDialog(admin)
													}
													className="rounded-full border border-gray-200 px-4 py-1.5 font-medium text-gray-600 text-xs transition hover:bg-gray-100"
												>
													수정
												</button>
												<button
													type="button"
													onClick={() =>
														handleDelete(admin.id)
													}
													className="rounded-full border border-red-200 px-4 py-1.5 font-medium text-red-500 text-xs transition hover:bg-red-50"
												>
													삭제
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : null}
			</section>

			{isLoading && (
				<p className="text-center text-gray-400">
					관리자 목록을 불러오는 중...
				</p>
			)}

			{/* ── 관리자 추가 다이얼로그 ── */}
			{showAddDialog && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl">
						<div className="mb-6 flex items-center justify-between">
							<h2 className="font-semibold text-gray-900 text-lg">
								{isMasterAdmin
									? "관리자 추가"
									: "학생 관리자 추가"}
							</h2>
							<button
								type="button"
								onClick={() => setShowAddDialog(false)}
								className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<form
							onSubmit={handleAddSubmit}
							className="space-y-4"
						>
							<div>
								<label
									htmlFor="add-email"
									className="mb-1.5 block font-medium text-gray-700 text-sm"
								>
									이메일{" "}
									<span className="text-red-500">*</span>
								</label>
								<Input
									id="add-email"
									type="email"
									value={addForm.email}
									onChange={(e) =>
										setAddForm((p) => ({
											...p,
											email: e.target.value,
										}))
									}
									placeholder="admin@example.com"
									required
								/>
							</div>
							<div>
								<label
									htmlFor="add-password"
									className="mb-1.5 block font-medium text-gray-700 text-sm"
								>
									비밀번호{" "}
									<span className="text-red-500">*</span>
								</label>
								<Input
									id="add-password"
									type="password"
									value={addForm.password}
									onChange={(e) =>
										setAddForm((p) => ({
											...p,
											password: e.target.value,
										}))
									}
									placeholder="6자 이상"
									required
								/>
							</div>
							<div>
								<label
									htmlFor="add-name"
									className="mb-1.5 block font-medium text-gray-700 text-sm"
								>
									이름{" "}
									<span className="text-red-500">*</span>
								</label>
								<Input
									id="add-name"
									value={addForm.name}
									onChange={(e) =>
										setAddForm((p) => ({
											...p,
											name: e.target.value,
										}))
									}
									required
								/>
							</div>
							{isMasterAdmin && (
								<>
									<div>
										<label
											htmlFor="add-role"
											className="mb-1.5 block font-medium text-gray-700 text-sm"
										>
											구분
										</label>
										<select
											id="add-role"
											value={addForm.role}
											onChange={(e) =>
												setAddForm((p) => ({
													...p,
													role: e.target.value,
												}))
											}
											className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
										>
											<option value="student_admin">
												학생 관리자
											</option>
											<option value="school_admin">
												학교 관리자
											</option>
											<option value="master_admin">
												마스터 관리자
											</option>
										</select>
									</div>
									<div>
										<label
											htmlFor="add-school-code"
											className="mb-1.5 block font-medium text-gray-700 text-sm"
										>
											학교
										</label>
										<select
											id="add-school-code"
											value={addForm.school_code}
											onChange={(e) =>
												setAddForm((p) => ({
													...p,
													school_code:
														e.target.value,
												}))
											}
											className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
										>
											<option value="">선택 안 함</option>
											{schools.map((s) => (
												<option
													key={s.id}
													value={s.school_code}
												>
													{s.school_name} (
													{s.school_code})
												</option>
											))}
										</select>
									</div>
								</>
							)}
							<div className="flex justify-end gap-2 pt-2">
								<button
									type="button"
									onClick={() => setShowAddDialog(false)}
									className="rounded-full border border-gray-200 px-5 py-2 font-medium text-gray-600 text-sm transition hover:bg-gray-50"
								>
									취소
								</button>
								<button
									type="submit"
									disabled={isSubmitting}
									className="rounded-full bg-gray-900 px-5 py-2 font-medium text-sm text-white transition hover:bg-gray-800 disabled:opacity-50"
								>
									{isSubmitting ? "등록 중..." : "등록"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* ── 관리자 수정 다이얼로그 ── */}
			{editingAdmin && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl">
						<div className="mb-6 flex items-center justify-between">
							<h2 className="font-semibold text-gray-900 text-lg">
								{isMasterAdmin
									? "관리자 정보 수정"
									: "학생 관리자 정보 수정"}
							</h2>
							<button
								type="button"
								onClick={() => setEditingAdmin(null)}
								className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<form
							onSubmit={handleEditSubmit}
							className="space-y-4"
						>
							<div>
								<label
									htmlFor="edit-email"
									className="mb-1.5 block font-medium text-gray-700 text-sm"
								>
									이메일
								</label>
								<Input
									id="edit-email"
									value={editingAdmin.email}
									disabled
									className="bg-gray-50"
								/>
							</div>
							<div>
								<label
									htmlFor="edit-name"
									className="mb-1.5 block font-medium text-gray-700 text-sm"
								>
									이름
								</label>
								<Input
									id="edit-name"
									value={editForm.name}
									onChange={(e) =>
										setEditForm((p) => ({
											...p,
											name: e.target.value,
										}))
									}
									required
								/>
							</div>
							<div>
								<label
									htmlFor="edit-password"
									className="mb-1.5 block font-medium text-gray-700 text-sm"
								>
									비밀번호 변경
								</label>
								<Input
									id="edit-password"
									type="password"
									value={editForm.password}
									onChange={(e) =>
										setEditForm((p) => ({
											...p,
											password: e.target.value,
										}))
									}
									placeholder="변경 시에만 입력"
								/>
								<p className="mt-1 text-gray-400 text-xs">
									비워두면 기존 비밀번호가 유지됩니다.
								</p>
							</div>
							{isMasterAdmin && (
								<>
									<div>
										<label
											htmlFor="edit-role"
											className="mb-1.5 block font-medium text-gray-700 text-sm"
										>
											구분
										</label>
										<select
											id="edit-role"
											value={editForm.role}
											onChange={(e) =>
												setEditForm((p) => ({
													...p,
													role: e.target.value,
												}))
											}
											className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
										>
											<option value="student_admin">
												학생 관리자
											</option>
											<option value="school_admin">
												학교 관리자
											</option>
											<option value="master_admin">
												마스터 관리자
											</option>
										</select>
									</div>
									<div>
										<label
											htmlFor="edit-school-code"
											className="mb-1.5 block font-medium text-gray-700 text-sm"
										>
											학교
										</label>
										<select
											id="edit-school-code"
											value={editForm.school_code}
											onChange={(e) =>
												setEditForm((p) => ({
													...p,
													school_code:
														e.target.value,
												}))
											}
											className="flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
										>
											<option value="">선택 안 함</option>
											{schools.map((s) => (
												<option
													key={s.id}
													value={s.school_code}
												>
													{s.school_name} (
													{s.school_code})
												</option>
											))}
										</select>
									</div>
								</>
							)}
							<div className="flex justify-end gap-2 pt-2">
								<button
									type="button"
									onClick={() => setEditingAdmin(null)}
									className="rounded-full border border-gray-200 px-5 py-2 font-medium text-gray-600 text-sm transition hover:bg-gray-50"
								>
									취소
								</button>
								<button
									type="submit"
									className="rounded-full bg-gray-900 px-5 py-2 font-medium text-sm text-white transition hover:bg-gray-800"
								>
									저장
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
