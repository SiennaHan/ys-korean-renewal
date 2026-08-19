import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

interface StudentRow {
	_key: string;
	email: string;
	password: string;
	name: string;
	phone: string;
	studentNumber: string;
	classLevel: string;
	instructor: string;
}

let _rowId = 0;
const emptyRow = (): StudentRow => ({
	_key: `row-${++_rowId}`,
	email: "",
	password: "",
	name: "",
	phone: "",
	studentNumber: "",
	classLevel: "",
	instructor: "",
});

const CLASS_LEVELS = ["1급", "2급", "3급", "4급", "5급", "6급"];

interface StudentTableProps {
	onSubmit: (students: StudentRow[]) => void;
	isLoading: boolean;
}

export default function StudentTable({ onSubmit, isLoading }: StudentTableProps) {
	const [rows, setRows] = useState<StudentRow[]>(
		Array.from({ length: 10 }, () => emptyRow()),
	);

	const updateRow = (index: number, field: keyof StudentRow, value: string) => {
		setRows((prev) => {
			const next = [...prev];
			next[index] = { ...next[index], [field]: value };
			return next;
		});
	};

	const addRows = () => {
		setRows((prev) => [...prev, ...Array.from({ length: 5 }, () => emptyRow())]);
	};

	const removeRow = (index: number) => {
		setRows((prev) => prev.filter((_, i) => i !== index));
	};

	const handleSubmit = () => {
		const validRows = rows.filter((r) => r.email && r.password && r.name);
		if (validRows.length === 0) {
			alert("등록할 학생 정보를 입력해주세요.");
			return;
		}
		onSubmit(validRows);
	};

	const handlePaste = (
		e: React.ClipboardEvent,
		startRow: number,
		startCol: number,
	) => {
		const pasteData = e.clipboardData.getData("text");
		if (!pasteData.includes("\t") && !pasteData.includes("\n")) return;

		e.preventDefault();
		const pasteRows = pasteData.split("\n").filter((r) => r.trim());
		const fields: (keyof StudentRow)[] = [
			"email",
			"password",
			"name",
			"phone",
			"studentNumber",
			"classLevel",
			"instructor",
		];

		setRows((prev) => {
			const next = [...prev];
			for (let i = 0; i < pasteRows.length; i++) {
				const rowIdx = startRow + i;
				while (next.length <= rowIdx) next.push(emptyRow());

				const cells = pasteRows[i].split("\t");
				for (let j = 0; j < cells.length; j++) {
					const colIdx = startCol + j;
					if (colIdx < fields.length) {
						next[rowIdx] = { ...next[rowIdx], [fields[colIdx]]: cells[j].trim() };
					}
				}
			}
			return next;
		});
	};

	return (
		<div>
			<div className="mb-4 rounded-lg border bg-violet-50 p-4">
				<p className="font-medium text-sm text-violet-900">입력 데이터 확인</p>
				<p className="mt-1 text-muted-foreground text-sm">
					아래 표에 데이터를 입력하거나 붙여넣어 주세요. (최대 5,000개까지 생성
					가능)
				</p>
			</div>

			<div className="overflow-x-auto rounded-lg border">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b bg-muted/50">
							<th className="w-12 px-3 py-3 text-center font-medium">No</th>
							<th className="min-w-[160px] px-3 py-3 text-left font-medium">
								<span className="text-destructive">로그인 메일 *</span>
							</th>
							<th className="min-w-[120px] px-3 py-3 text-left font-medium">
								<span className="text-destructive">초기 비밀번호 *</span>
							</th>
							<th className="min-w-[100px] px-3 py-3 text-left font-medium">
								<span className="text-destructive">이름 *</span>
							</th>
							<th className="min-w-[140px] px-3 py-3 text-left font-medium">
								핸드폰 번호
							</th>
							<th className="min-w-[100px] px-3 py-3 text-left font-medium">
								학번
							</th>
							<th className="min-w-[80px] px-3 py-3 text-left font-medium">
								반
							</th>
							<th className="min-w-[120px] px-3 py-3 text-left font-medium">
								담당 교수자
							</th>
							<th className="w-10 px-2 py-3" />
						</tr>
						<tr className="border-b bg-muted/30 text-muted-foreground text-xs">
							<td className="px-3 py-1.5 text-center">참고</td>
							<td className="px-3 py-1.5">필수 기입</td>
							<td className="px-3 py-1.5">필수 기입 (추후 변경 가능)</td>
							<td className="px-3 py-1.5">필수 기입</td>
							<td className="px-3 py-1.5">미입력 시 자동 기입 (01000000000)</td>
							<td className="px-3 py-1.5">생략 가능</td>
							<td className="px-3 py-1.5">1급 - 6급</td>
							<td className="px-3 py-1.5">담당 교수자명</td>
							<td />
						</tr>
					</thead>
					<tbody>
						{rows.map((row, idx) => (
							<tr key={row._key} className="border-b last:border-b-0">
								<td className="px-3 py-1.5 text-center text-muted-foreground">
									{idx + 1}
								</td>
								<td className="px-1 py-1">
									<Input
										value={row.email}
										onChange={(e) =>
											updateRow(idx, "email", e.target.value)
										}
										onPaste={(e) => handlePaste(e, idx, 0)}
										placeholder="email@example.com"
										className="h-8 border-0 shadow-none focus-visible:ring-0"
									/>
								</td>
								<td className="px-1 py-1">
									<Input
										value={row.password}
										onChange={(e) =>
											updateRow(idx, "password", e.target.value)
										}
										onPaste={(e) => handlePaste(e, idx, 1)}
										placeholder="123456"
										className="h-8 border-0 shadow-none focus-visible:ring-0"
									/>
								</td>
								<td className="px-1 py-1">
									<Input
										value={row.name}
										onChange={(e) =>
											updateRow(idx, "name", e.target.value)
										}
										onPaste={(e) => handlePaste(e, idx, 2)}
										className="h-8 border-0 shadow-none focus-visible:ring-0"
									/>
								</td>
								<td className="px-1 py-1">
									<Input
										value={row.phone}
										onChange={(e) =>
											updateRow(idx, "phone", e.target.value)
										}
										onPaste={(e) => handlePaste(e, idx, 3)}
										placeholder="01000000000"
										className="h-8 border-0 shadow-none focus-visible:ring-0"
									/>
								</td>
								<td className="px-1 py-1">
									<Input
										value={row.studentNumber}
										onChange={(e) =>
											updateRow(idx, "studentNumber", e.target.value)
										}
										onPaste={(e) => handlePaste(e, idx, 4)}
										className="h-8 border-0 shadow-none focus-visible:ring-0"
									/>
								</td>
								<td className="px-1 py-1">
									<select
										value={row.classLevel}
										onChange={(e) =>
											updateRow(idx, "classLevel", e.target.value)
										}
										className="h-8 w-full rounded-md bg-transparent px-2 text-sm focus:outline-none"
									>
										<option value="">선택</option>
										{CLASS_LEVELS.map((level) => (
											<option key={level} value={level}>
												{level}
											</option>
										))}
									</select>
								</td>
								<td className="px-1 py-1">
									<Input
										value={row.instructor}
										onChange={(e) =>
											updateRow(idx, "instructor", e.target.value)
										}
										onPaste={(e) => handlePaste(e, idx, 6)}
										className="h-8 border-0 shadow-none focus-visible:ring-0"
									/>
								</td>
								<td className="px-1 py-1">
									<button
										type="button"
										onClick={() => removeRow(idx)}
										className="p-1 text-muted-foreground hover:text-destructive"
									>
										<Trash2 className="h-3.5 w-3.5" />
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<div className="mt-3 flex justify-center">
				<Button variant="outline" size="sm" onClick={addRows}>
					<Plus className="mr-1 h-3.5 w-3.5" />학생 추가
				</Button>
			</div>

			<Button
				className="mt-6 w-full"
				size="lg"
				onClick={handleSubmit}
				disabled={isLoading}
			>
				{isLoading ? "등록 중..." : "등록하기"}
			</Button>
		</div>
	);
}

export type { StudentRow };
