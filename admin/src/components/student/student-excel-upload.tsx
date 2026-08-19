import { useCallback, useRef, useState } from "react";
import {
	AlertCircle,
	CheckCircle2,
	FileSpreadsheet,
	Upload,
	X,
} from "lucide-react";
import * as XLSX from "xlsx";
import type { ClassLevel } from "@/api/apiType";

interface ParsedRow {
	row: number;
	email: string;
	password: string;
	name: string;
	phone: string;
	student_number: string;
	class_level: string;
	instructor: string;
}

interface ValidationError {
	row: number;
	message: string;
}

interface StudentExcelUploadProps {
	onUpload: (file: File) => Promise<void>;
	isLoading: boolean;
	disabled?: boolean;
	classLevels: ClassLevel[];
}

export default function StudentExcelUpload({
	onUpload,
	isLoading,
	disabled,
	classLevels,
}: StudentExcelUploadProps) {
	const [open, setOpen] = useState(false);
	const [file, setFile] = useState<File | null>(null);
	const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
	const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
		[],
	);
	const [isValid, setIsValid] = useState(false);
	const [isDragOver, setIsDragOver] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);

	const classLevelLabels = classLevels.map((cl) => cl.label);

	const resetState = () => {
		setFile(null);
		setParsedRows([]);
		setValidationErrors([]);
		setIsValid(false);
		setIsDragOver(false);
	};

	const handleClose = () => {
		resetState();
		setOpen(false);
	};

	const parseAndValidate = useCallback(
		(f: File) => {
			if (!f.name.endsWith(".xlsx") && !f.name.endsWith(".xls")) {
				setValidationErrors([
					{
						row: 0,
						message: "엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.",
					},
				]);
				setIsValid(false);
				setFile(null);
				return;
			}

			setFile(f);

			const reader = new FileReader();
			reader.onload = (e) => {
				try {
					const data = e.target?.result;
					const workbook = XLSX.read(data, { type: "array" });
					const sheetName = workbook.SheetNames[0];
					const worksheet = workbook.Sheets[sheetName];
					const jsonData = XLSX.utils.sheet_to_json<
						(string | number | null)[]
					>(worksheet, {
						header: 1,
						defval: "",
					});

					if (jsonData.length < 2) {
						setValidationErrors([
							{
								row: 0,
								message:
									"데이터가 없습니다. 헤더 행 아래에 학생 데이터를 입력해주세요.",
							},
						]);
						setIsValid(false);
						setParsedRows([]);
						return;
					}

					const rows: ParsedRow[] = [];
					const errors: ValidationError[] = [];

					for (let i = 1; i < jsonData.length; i++) {
						const row = jsonData[i];
						if (!row || row.every((cell) => !cell && cell !== 0))
							continue;

						const email = String(row[0] ?? "").trim();
						const password = String(row[1] ?? "").trim();
						const name = String(row[2] ?? "").trim();
						const phone = String(row[3] ?? "").trim();
						const studentNumber = String(row[4] ?? "").trim();
						const classLevel = String(row[5] ?? "").trim();
						const instructor = String(row[6] ?? "").trim();

						const rowNum = i + 1;

						if (!email) {
							errors.push({
								row: rowNum,
								message: "이메일이 비어있습니다.",
							});
						}
						if (!password) {
							errors.push({
								row: rowNum,
								message: "비밀번호가 비어있습니다.",
							});
						}
						if (!name) {
							errors.push({
								row: rowNum,
								message: "이름이 비어있습니다.",
							});
						}
						if (
							classLevel &&
							classLevelLabels.length > 0 &&
							!classLevelLabels.includes(classLevel)
						) {
							errors.push({
								row: rowNum,
								message: `반 "${classLevel}"은(는) 등록되지 않은 값입니다.`,
							});
						}

						rows.push({
							row: rowNum,
							email,
							password,
							name,
							phone,
							student_number: studentNumber,
							class_level: classLevel,
							instructor,
						});
					}

					if (rows.length === 0) {
						errors.push({
							row: 0,
							message: "유효한 데이터 행이 없습니다.",
						});
					}

					setParsedRows(rows);
					setValidationErrors(errors);
					setIsValid(errors.length === 0 && rows.length > 0);
				} catch {
					setValidationErrors([
						{
							row: 0,
							message: "엑셀 파일을 읽는 중 오류가 발생했습니다.",
						},
					]);
					setIsValid(false);
					setParsedRows([]);
				}
			};
			reader.readAsArrayBuffer(f);
		},
		[classLevelLabels],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragOver(false);
			const droppedFile = e.dataTransfer.files[0];
			if (droppedFile) {
				parseAndValidate(droppedFile);
			}
		},
		[parseAndValidate],
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragOver(false);
	}, []);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (selectedFile) {
			parseAndValidate(selectedFile);
		}
		if (fileRef.current) {
			fileRef.current.value = "";
		}
	};

	const handleSubmit = async () => {
		if (!file || !isValid) return;
		await onUpload(file);
		handleClose();
	};

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				disabled={isLoading || disabled}
				className="flex h-10 items-center gap-1.5 rounded-full bg-gray-900 px-5 font-medium text-sm text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<Upload className="h-4 w-4" />
				학생 대량 등록
			</button>

			{open && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="relative flex max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl">
						{/* 헤더 */}
						<div className="flex shrink-0 items-center justify-between border-gray-100 border-b px-8 py-5">
							<h2 className="font-semibold text-gray-900 text-lg">
								학생 대량 등록
							</h2>
							<button
								type="button"
								onClick={handleClose}
								className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
							>
								<X className="h-5 w-5" />
							</button>
						</div>

						{/* 스크롤 콘텐츠 */}
						<div className="flex-1 overflow-y-auto px-8 py-6">
							{/* 엑셀 포멧 예시 */}
							<div className="mb-6">
								<h3 className="mb-2 font-medium text-gray-700 text-sm">
									엑셀 포맷 예시
								</h3>
								<p className="mb-3 text-gray-500 text-xs">
									아래와 같은 형식의 엑셀 파일을 준비해주세요.{" "}
									<span className="text-red-500">*</span> 표시는 필수
									항목입니다.
								</p>
								<div className="overflow-x-auto rounded-lg border border-gray-200">
									<table className="w-full text-xs">
										<thead>
											<tr className="bg-gray-50">
												<th className="border-gray-200 border-r px-3 py-2 text-left font-medium text-gray-600">
													이메일 <span className="text-red-500">*</span>
												</th>
												<th className="border-gray-200 border-r px-3 py-2 text-left font-medium text-gray-600">
													비밀번호 <span className="text-red-500">*</span>
												</th>
												<th className="border-gray-200 border-r px-3 py-2 text-left font-medium text-gray-600">
													이름 <span className="text-red-500">*</span>
												</th>
												<th className="border-gray-200 border-r px-3 py-2 text-left font-medium text-gray-600">
													핸드폰 번호
												</th>
												<th className="border-gray-200 border-r px-3 py-2 text-left font-medium text-gray-600">
													학번
												</th>
												<th className="border-gray-200 border-r px-3 py-2 text-left font-medium text-gray-600">
													반
												</th>
												<th className="px-3 py-2 text-left font-medium text-gray-600">
													담당 교수자 (이메일)
												</th>
											</tr>
										</thead>
										<tbody>
											<tr className="border-gray-100 border-t">
												<td className="border-gray-200 border-r px-3 py-2 text-gray-500">
													student1@univ.ac.kr
												</td>
												<td className="border-gray-200 border-r px-3 py-2 text-gray-500">
													123456
												</td>
												<td className="border-gray-200 border-r px-3 py-2 text-gray-500">
													홍길동
												</td>
												<td className="border-gray-200 border-r px-3 py-2 text-gray-500">
													01012345678
												</td>
												<td className="border-gray-200 border-r px-3 py-2 text-gray-500">
													20240001
												</td>
												<td className="border-gray-200 border-r px-3 py-2 text-gray-500">
													{classLevels[0]?.label || "1급"}
												</td>
												<td className="px-3 py-2 text-gray-500">
													kim@univ.ac.kr
												</td>
											</tr>
											<tr className="border-gray-100 border-t">
												<td className="border-gray-200 border-r px-3 py-2 text-gray-500">
													student2@univ.ac.kr
												</td>
												<td className="border-gray-200 border-r px-3 py-2 text-gray-500">
													abcdef
												</td>
												<td className="border-gray-200 border-r px-3 py-2 text-gray-500">
													이영희
												</td>
												<td className="border-gray-200 border-r px-3 py-2 text-gray-500">
													01098765432
												</td>
												<td className="border-gray-200 border-r px-3 py-2 text-gray-500">
													20240002
												</td>
												<td className="border-gray-200 border-r px-3 py-2 text-gray-500">
													{classLevels[1]?.label ||
														classLevels[0]?.label ||
														"2급"}
												</td>
												<td className="px-3 py-2 text-gray-500">
													park@univ.ac.kr
												</td>
											</tr>
										</tbody>
									</table>
								</div>

								{/* 반 값 안내 */}
								{classLevels.length > 0 && (
									<div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3">
										<p className="mb-1.5 font-medium text-blue-700 text-xs">
											반 입력 가능 값
										</p>
										<div className="flex flex-wrap gap-1.5">
											{classLevels.map((cl) => (
												<span
													key={cl.id}
													className="rounded-full bg-white px-2.5 py-0.5 font-medium text-blue-700 text-xs shadow-sm ring-1 ring-blue-200"
												>
													{cl.label}
												</span>
											))}
										</div>
									</div>
								)}
							</div>

							{/* 파일 업로드 영역 */}
							<div className="mb-6">
								<input
									ref={fileRef}
									type="file"
									accept=".xlsx,.xls"
									onChange={handleFileChange}
									className="hidden"
								/>

								{/* 드래그 앤 드롭 영역 */}
								<div
									onDrop={handleDrop}
									onDragOver={handleDragOver}
									onDragLeave={handleDragLeave}
									className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition ${
										isDragOver
											? "border-gray-400 bg-gray-50"
											: file
												? "border-green-300 bg-green-50/30"
												: "border-gray-300 bg-gray-50/50"
									}`}
								>
									{file ? (
										<div className="flex items-center gap-3">
											<FileSpreadsheet className="h-8 w-8 text-green-600" />
											<div>
												<p className="font-medium text-gray-800 text-sm">
													{file.name}
												</p>
												<p className="text-gray-500 text-xs">
													{(file.size / 1024).toFixed(1)} KB
												</p>
											</div>
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													resetState();
												}}
												className="ml-2 rounded-full p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600"
											>
												<X className="h-4 w-4" />
											</button>
										</div>
									) : (
										<>
											<Upload className="mb-3 h-10 w-10 text-gray-400" />
											<p className="mb-1 font-medium text-gray-600 text-sm">
												엑셀 파일을 여기에 끌어다 놓으세요
											</p>
											<p className="text-gray-400 text-xs">
												.xlsx 또는 .xls 파일만 지원합니다
											</p>
										</>
									)}
								</div>

								{/* 수동 업로드 버튼 */}
								<div className="mt-3 flex justify-center">
									<button
										type="button"
										onClick={() => fileRef.current?.click()}
										className="rounded-full border border-gray-200 px-5 py-2 font-medium text-gray-600 text-sm transition hover:bg-gray-50"
									>
										파일 직접 선택
									</button>
								</div>
							</div>

							{/* 검증 결과 */}
							{file && validationErrors.length > 0 && (
								<div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
									<div className="mb-2 flex items-center gap-2">
										<AlertCircle className="h-4 w-4 text-red-500" />
										<span className="font-medium text-red-700 text-sm">
											검증 오류 ({validationErrors.length}건)
										</span>
									</div>
									<ul className="space-y-1">
										{validationErrors.map((err) => (
											<li
												key={`${err.row}-${err.message}`}
												className="text-red-600 text-xs"
											>
												{err.row > 0
													? `${err.row}행: ${err.message}`
													: err.message}
											</li>
										))}
									</ul>
								</div>
							)}

							{file && isValid && parsedRows.length > 0 && (
								<div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
									<div className="mb-3 flex items-center gap-2">
										<CheckCircle2 className="h-4 w-4 text-green-600" />
										<span className="font-medium text-green-700 text-sm">
											검증 완료 — {parsedRows.length}명의 학생 데이터가
											확인되었습니다
										</span>
									</div>
									<div className="max-h-48 overflow-auto rounded-lg border border-green-100 bg-white">
										<table className="w-full text-xs">
											<thead>
												<tr className="border-green-100 border-b bg-green-50/50">
													<th className="px-3 py-2 text-left font-medium text-gray-600">
														행
													</th>
													<th className="px-3 py-2 text-left font-medium text-gray-600">
														이메일
													</th>
													<th className="px-3 py-2 text-left font-medium text-gray-600">
														이름
													</th>
													<th className="px-3 py-2 text-left font-medium text-gray-600">
														학번
													</th>
													<th className="px-3 py-2 text-left font-medium text-gray-600">
														반
													</th>
													<th className="px-3 py-2 text-left font-medium text-gray-600">
														교수자
													</th>
												</tr>
											</thead>
											<tbody>
												{parsedRows.map((r) => (
													<tr
														key={r.row}
														className="border-gray-50 border-b last:border-b-0"
													>
														<td className="px-3 py-1.5 text-gray-400">
															{r.row}
														</td>
														<td className="px-3 py-1.5 text-gray-700">
															{r.email}
														</td>
														<td className="px-3 py-1.5 text-gray-700">
															{r.name}
														</td>
														<td className="px-3 py-1.5 text-gray-500">
															{r.student_number || "-"}
														</td>
														<td className="px-3 py-1.5 text-gray-500">
															{r.class_level || "-"}
														</td>
														<td className="px-3 py-1.5 text-gray-500">
															{r.instructor || "-"}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							)}
						</div>

						{/* 하단 버튼 */}
						<div className="flex shrink-0 items-center justify-end gap-3 border-gray-100 border-t px-8 py-5">
							<button
								type="button"
								onClick={handleClose}
								className="rounded-full border border-gray-200 px-5 py-2 font-medium text-gray-600 text-sm transition hover:bg-gray-50"
							>
								취소
							</button>
							<button
								type="button"
								onClick={handleSubmit}
								disabled={!isValid || isLoading}
								className="rounded-full bg-gray-900 px-6 py-2 font-medium text-sm text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
							>
								{isLoading ? "등록 중..." : `등록하기 (${parsedRows.length}명)`}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
