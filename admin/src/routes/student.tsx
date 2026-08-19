import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api/api";
import type {
	BatchResult,
	ClassLevel,
	Instructor,
	School,
	Student,
} from "@/api/apiType";
import StudentExcelUpload from "@/components/student/student-excel-upload";
import { Input } from "@/components/ui/input";
import { Plus, Search, X } from "lucide-react";

export const Route = createFileRoute("/student")({
	component: StudentPage,
});

function StudentPage() {
	const [students, setStudents] = useState<Student[]>([]);
	const [schools, setSchools] = useState<School[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [resultMessage, setResultMessage] = useState<string | null>(null);

	const [selectedSchoolCode, setSelectedSchoolCode] = useState("");
	const [searchText, setSearchText] = useState("");
	const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// 다이얼로그
	const [showAddDialog, setShowAddDialog] = useState(false);
	const [editingStudent, setEditingStudent] = useState<Student | null>(null);
	const [editForm, setEditForm] = useState({
		name: "",
		phone: "",
		student_number: "",
		class_level: "",
		instructor: "",
	});
	const [addForm, setAddForm] = useState({
		email: "",
		password: "",
		name: "",
		phone: "",
		student_number: "",
		class_level: "",
		instructor: "",
	});

	const adminUser = useMemo(() => {
		try {
			return JSON.parse(localStorage.getItem("adminUser") || "{}");
		} catch {
			return {};
		}
	}, []);

	const isMasterAdmin = adminUser.role === "master_admin";
	const effectiveSchoolCode = isMasterAdmin
		? selectedSchoolCode
		: adminUser.schoolCode || "";

	// 학교 목록 로드
	useEffect(() => {
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
	}, []);

	const schoolNameMap = useMemo(() => {
		const map: Record<string, string> = {};
		for (const s of schools) {
			map[s.school_code] = s.school_name;
		}
		return map;
	}, [schools]);

	const [classLevelsForSchool, setClassLevelsForSchool] = useState<
		ClassLevel[]
	>([]);

	useEffect(() => {
		const loadClassLevels = async () => {
			if (!effectiveSchoolCode) {
				setClassLevelsForSchool([]);
				return;
			}
			const school = schools.find(
				(s) => s.school_code === effectiveSchoolCode,
			);
			if (!school) {
				setClassLevelsForSchool([]);
				return;
			}
			try {
				const res = await api.get<ClassLevel[]>(
					`/school/${school.id}/class-levels`,
				);
				if (res.result && res.data) {
					setClassLevelsForSchool(res.data);
				}
			} catch {
				setClassLevelsForSchool([]);
			}
		};
		loadClassLevels();
	}, [effectiveSchoolCode, schools]);

	// 담당 교수자 (학생관리자) 목록 로드
	const [instructors, setInstructors] = useState<Instructor[]>([]);

	useEffect(() => {
		const loadInstructors = async () => {
			if (!effectiveSchoolCode) {
				setInstructors([]);
				return;
			}
			try {
				const res = await api.get<Instructor[]>(
					`/student/instructors?school_code=${effectiveSchoolCode}`,
				);
				if (res.result && res.data) {
					setInstructors(res.data);
				}
			} catch {
				setInstructors([]);
			}
		};
		loadInstructors();
	}, [effectiveSchoolCode]);

	const loadStudents = useCallback(
		async (schoolCode: string, search: string) => {
			setIsLoading(true);
			try {
				const params = new URLSearchParams();
				if (schoolCode) params.set("school_code", schoolCode);
				if (search) params.set("search", search);
				const query = params.toString();
				const res = await api.get<Student[]>(
					`/student/list${query ? `?${query}` : ""}`,
				);
				if (res.result && res.data) {
					setStudents(res.data);
				}
			} catch {
				console.error("학생 목록 조회 실패");
			} finally {
				setIsLoading(false);
			}
		},
		[],
	);

	useEffect(() => {
		loadStudents(effectiveSchoolCode, searchText);
	}, [effectiveSchoolCode, loadStudents, searchText]);

	const handleSearchChange = (value: string) => {
		setSearchText(value);
		if (debounceTimer.current) clearTimeout(debounceTimer.current);
		debounceTimer.current = setTimeout(() => {
			loadStudents(effectiveSchoolCode, value);
		}, 300);
	};

	// 학생 추가 (단일 등록)
	const handleAddSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isMasterAdmin && !selectedSchoolCode) {
			setResultMessage("학교를 선택해주세요.");
			return;
		}
		if (!addForm.email || !addForm.password || !addForm.name) {
			alert("이메일, 비밀번호, 이름은 필수 입력입니다.");
			return;
		}
		setIsSubmitting(true);
		setResultMessage(null);
		try {
			const res = await api.post<BatchResult>("/student/batch", {
				school_code: effectiveSchoolCode,
				students: [
					{
						email: addForm.email,
						password: addForm.password,
						name: addForm.name,
						phone: addForm.phone || null,
						student_number: addForm.student_number || null,
						class_level: addForm.class_level || null,
						instructor: addForm.instructor || null,
					},
				],
			});
			if (res.result && res.data) {
				const { created, errors } = res.data;
				if (errors.length > 0) {
					setResultMessage(`오류: ${errors[0].error}`);
				} else {
					setResultMessage(`${created.length}명 등록 완료`);
					setShowAddDialog(false);
					setAddForm({
						email: "",
						password: "",
						name: "",
						phone: "",
						student_number: "",
						class_level: "",
						instructor: "",
					});
					loadStudents(effectiveSchoolCode, searchText);
				}
			}
		} catch {
			setResultMessage("등록 중 오류가 발생했습니다.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleExcelUpload = async (file: File) => {
		if (isMasterAdmin && !selectedSchoolCode) {
			setResultMessage("학교를 선택해주세요.");
			return;
		}
		setIsSubmitting(true);
		setResultMessage(null);
		try {
			const formData = new FormData();
			formData.append("file", file);
			formData.append("school_code", effectiveSchoolCode);
			const res = await api.upload<BatchResult>(
				"/student/upload",
				formData,
			);
			if (res.result && res.data) {
				const { created, errors } = res.data;
				setResultMessage(
					`${created.length}명 등록 완료${errors.length > 0 ? `, ${errors.length}건 오류` : ""}`,
				);
				loadStudents(effectiveSchoolCode, searchText);
			}
		} catch {
			setResultMessage("엑셀 업로드 중 오류가 발생했습니다.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (id: number) => {
		if (!confirm("이 학생을 삭제하시겠습니까?")) return;
		try {
			await api.delete(`/student/${id}`);
			loadStudents(effectiveSchoolCode, searchText);
		} catch {
			console.error("삭제 실패");
		}
	};

	// 수정 다이얼로그
	const openEditDialog = (student: Student) => {
		setEditingStudent(student);
		setEditForm({
			name: student.name,
			phone: student.phone || "",
			student_number: student.student_number || "",
			class_level: student.class_level || "",
			instructor: student.instructor || "",
		});
	};

	const handleEditSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingStudent) return;
		try {
			const res = await api.patch(`/student/${editingStudent.id}`, {
				name: editForm.name,
				phone: editForm.phone || null,
				student_number: editForm.student_number || null,
				class_level: editForm.class_level || null,
				instructor: editForm.instructor || null,
			});
			if (res.result) {
				setEditingStudent(null);
				loadStudents(effectiveSchoolCode, searchText);
			}
		} catch {
			alert("수정에 실패했습니다.");
		}
	};

	return (
		<div className="mx-auto max-w-6xl">
			{/* 헤더 */}
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-bold text-2xl tracking-tight">학생 관리</h1>
				<div className="flex items-center gap-3">
					{isMasterAdmin && (
						<select
							value={selectedSchoolCode}
							onChange={(e) => setSelectedSchoolCode(e.target.value)}
							className="h-10 rounded-full border border-gray-200 bg-white px-4 pr-8 font-medium text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
						>
							<option value="">학교 선택</option>
							{schools.map((s) => (
								<option key={s.id} value={s.school_code}>
									{s.school_name} ({s.school_code})
								</option>
							))}
						</select>
					)}
					<button
						type="button"
						onClick={() => setShowAddDialog(true)}
						disabled={isMasterAdmin && !selectedSchoolCode}
						className="flex h-10 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-5 font-medium text-gray-700 text-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<Plus className="h-4 w-4" />
						학생 생성
					</button>
					<StudentExcelUpload
						onUpload={handleExcelUpload}
						isLoading={isSubmitting}
						disabled={isMasterAdmin && !selectedSchoolCode}
						classLevels={classLevelsForSchool}
					/>
				</div>
			</div>

			{/* 검색 */}
			<div className="mb-6 flex items-center gap-3">
				<div className="relative">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3.5 h-4 w-4 text-gray-400" />
					<Input
						value={searchText}
						onChange={(e) => handleSearchChange(e.target.value)}
						placeholder="이름, 학번, 학과를 입력해 주세요.."
						className="h-10 w-64 rounded-full border-gray-200 bg-white pl-10 text-sm placeholder:text-gray-400 focus-visible:ring-gray-300"
					/>
				</div>
			</div>

			{resultMessage && (
				<div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800 text-sm">
					{resultMessage}
				</div>
			)}

			{/* 학생 목록 테이블 */}
			{!isLoading && students.length === 0 ? (
				<div className="rounded-xl border border-gray-200 py-20 text-center">
					<p className="text-gray-400">등록된 학생이 없습니다.</p>
				</div>
			) : students.length > 0 ? (
				<div className="overflow-x-auto rounded-xl border border-gray-200">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-gray-100 border-b bg-gray-50/80">
								<th className="px-5 py-4 text-left font-normal text-gray-500">
									이름
								</th>
								<th className="px-5 py-4 text-left font-normal text-gray-500">
									반
								</th>
								<th className="px-5 py-4 text-left font-normal text-gray-500">
									학번
								</th>
								<th className="px-5 py-4 text-left font-normal text-gray-500">
									로그인 이메일
								</th>
								<th className="px-5 py-4 text-left font-normal text-gray-500">
									휴대폰 번호
								</th>
								{isMasterAdmin && (
									<th className="px-5 py-4 text-left font-normal text-gray-500">
										학교
									</th>
								)}
								<th className="px-5 py-4 text-left font-normal text-gray-500">
									담당 교수자
								</th>
								<th className="w-36 px-5 py-4" />
							</tr>
						</thead>
						<tbody>
							{students.map((s) => (
								<tr
									key={s.id}
									className="border-gray-100 border-b transition last:border-b-0 hover:bg-gray-50/50"
								>
									<td className="px-5 py-4 font-medium text-gray-900">
										{s.name}
									</td>
									<td className="px-5 py-4 text-gray-600">
										{s.class_level || "-"}
									</td>
									<td className="px-5 py-4 text-gray-600">
										{s.student_number || "-"}
									</td>
									<td className="px-5 py-4 text-gray-600">
										{s.email}
									</td>
									<td className="px-5 py-4 text-gray-600">
										{s.phone || "-"}
									</td>
									{isMasterAdmin && (
										<td className="px-5 py-4 text-gray-600">
											{s.school_code
												? schoolNameMap[s.school_code] ||
													s.school_code
												: "-"}
										</td>
									)}
									<td className="px-5 py-4 text-gray-600">
										{s.instructor || "-"}
									</td>
									<td className="px-5 py-4">
										<div className="flex items-center justify-end gap-2">
											<button
												type="button"
												onClick={() => openEditDialog(s)}
												className="rounded-full border border-gray-200 px-4 py-1.5 font-medium text-gray-600 text-xs transition hover:bg-gray-100"
											>
												수정
											</button>
											<button
												type="button"
												onClick={() => handleDelete(s.id)}
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

			{isLoading && (
				<p className="mt-8 text-center text-gray-400">
					학생 목록을 불러오는 중...
				</p>
			)}

			{/* ── 학생 추가 다이얼로그 ── */}
			{showAddDialog && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl">
						<div className="mb-6 flex items-center justify-between">
							<h2 className="font-semibold text-gray-900 text-lg">
								학생 추가
							</h2>
							<button
								type="button"
								onClick={() => setShowAddDialog(false)}
								className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<form onSubmit={handleAddSubmit} className="space-y-4">
							<div>
								<label
									htmlFor="add-email"
									className="mb-1.5 block font-medium text-gray-700 text-sm"
								>
									로그인 메일{" "}
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
									placeholder="email@example.com"
									required
								/>
							</div>
							<div>
								<label
									htmlFor="add-password"
									className="mb-1.5 block font-medium text-gray-700 text-sm"
								>
									초기 비밀번호{" "}
									<span className="text-red-500">*</span>
								</label>
								<Input
									id="add-password"
									value={addForm.password}
									onChange={(e) =>
										setAddForm((p) => ({
											...p,
											password: e.target.value,
										}))
									}
									placeholder="123456"
									required
								/>
							</div>
							<div>
								<label
									htmlFor="add-name"
									className="mb-1.5 block font-medium text-gray-700 text-sm"
								>
									이름 <span className="text-red-500">*</span>
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
							<div>
								<label
									htmlFor="add-phone"
									className="mb-1.5 block font-medium text-gray-700 text-sm"
								>
									핸드폰 번호
								</label>
								<Input
									id="add-phone"
									value={addForm.phone}
									onChange={(e) =>
										setAddForm((p) => ({
											...p,
											phone: e.target.value,
										}))
									}
									placeholder="01000000000"
								/>
							</div>
							<div>
								<label
									htmlFor="add-student-number"
									className="mb-1.5 block font-medium text-gray-700 text-sm"
								>
									학번
								</label>
								<Input
									id="add-student-number"
									value={addForm.student_number}
									onChange={(e) =>
										setAddForm((p) => ({
											...p,
											student_number: e.target.value,
										}))
									}
								/>
							</div>
							<div>
								<label
									htmlFor="add-class-level"
									className="mb-1.5 block font-medium text-gray-700 text-sm"
								>
									반
								</label>
								<select
									id="add-class-level"
									value={addForm.class_level}
									onChange={(e) =>
										setAddForm((p) => ({
											...p,
											class_level: e.target.value,
										}))
									}
									className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
								>
									<option value="">선택</option>
									{classLevelsForSchool.map((level) => (
										<option key={level.id} value={level.label}>
											{level.label}
										</option>
									))}
								</select>
							</div>
							<div>
								<label
									htmlFor="add-instructor"
									className="mb-1.5 block font-medium text-gray-700 text-sm"
								>
									담당 교수자
								</label>
								<select
									id="add-instructor"
									value={addForm.instructor}
									onChange={(e) =>
										setAddForm((p) => ({
											...p,
											instructor: e.target.value,
										}))
									}
									className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
								>
									<option value="">선택</option>
									{instructors.map((inst) => (
										<option key={inst.id} value={inst.email}>
											{inst.name} ({inst.email})
										</option>
									))}
								</select>
							</div>
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

			{/* ── 학생 수정 다이얼로그 ── */}
			{editingStudent && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl">
						<div className="mb-6 flex items-center justify-between">
							<h2 className="font-semibold text-gray-900 text-lg">
								학생 정보 수정
							</h2>
							<button
								type="button"
								onClick={() => setEditingStudent(null)}
								className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<form onSubmit={handleEditSubmit} className="space-y-4">
							<div>
								<label
									htmlFor="edit-email"
									className="mb-1.5 block font-medium text-gray-700 text-sm"
								>
									이메일
								</label>
								<Input
									id="edit-email"
									value={editingStudent.email}
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
									htmlFor="edit-phone"
									className="mb-1.5 block font-medium text-gray-700 text-sm"
								>
									핸드폰 번호
								</label>
								<Input
									id="edit-phone"
									value={editForm.phone}
									onChange={(e) =>
										setEditForm((p) => ({
											...p,
											phone: e.target.value,
										}))
									}
								/>
							</div>
							<div>
								<label
									htmlFor="edit-student-number"
									className="mb-1.5 block font-medium text-gray-700 text-sm"
								>
									학번
								</label>
								<Input
									id="edit-student-number"
									value={editForm.student_number}
									onChange={(e) =>
										setEditForm((p) => ({
											...p,
											student_number: e.target.value,
										}))
									}
								/>
							</div>
							<div>
								<label
									htmlFor="edit-class-level"
									className="mb-1.5 block font-medium text-gray-700 text-sm"
								>
									반
								</label>
								<select
									id="edit-class-level"
									value={editForm.class_level}
									onChange={(e) =>
										setEditForm((p) => ({
											...p,
											class_level: e.target.value,
										}))
									}
									className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
								>
									<option value="">선택</option>
									{classLevelsForSchool.map((level) => (
										<option key={level.id} value={level.label}>
											{level.label}
										</option>
									))}
								</select>
							</div>
							<div>
								<label
									htmlFor="edit-instructor"
									className="mb-1.5 block font-medium text-gray-700 text-sm"
								>
									담당 교수자
								</label>
								<select
									id="edit-instructor"
									value={editForm.instructor}
									onChange={(e) =>
										setEditForm((p) => ({
											...p,
											instructor: e.target.value,
										}))
									}
									className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
								>
									<option value="">선택</option>
									{instructors.map((inst) => (
										<option key={inst.id} value={inst.email}>
											{inst.name} ({inst.email})
										</option>
									))}
								</select>
							</div>
							<div className="flex justify-end gap-2 pt-2">
								<button
									type="button"
									onClick={() => setEditingStudent(null)}
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
