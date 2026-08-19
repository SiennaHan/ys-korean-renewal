import { Pencil, Trash2 } from "lucide-react";

export interface Column<T> {
	key: string;
	label: string;
	render?: (row: T) => string;
	width?: string;
}

interface DataTableProps<T> {
	rows: T[];
	columns: Column<T>[];
	loading?: boolean;
	onEdit: (row: T) => void;
	onDelete?: (row: T) => void;
	getRowKey: (row: T) => string | number;
}

export default function DataTable<T>({
	rows,
	columns,
	loading,
	onEdit,
	onDelete,
	getRowKey,
}: DataTableProps<T>) {
	if (loading) {
		return (
			<div className="flex items-center justify-center py-16 text-gray-400 text-sm">
				불러오는 중...
			</div>
		);
	}
	if (!rows.length) {
		return (
			<div className="flex items-center justify-center rounded-lg border border-gray-200 py-16 text-gray-400 text-sm">
				데이터가 없습니다.
			</div>
		);
	}

	return (
		<div className="overflow-hidden rounded-lg border border-gray-200">
			<div className="max-h-[70vh] overflow-y-auto">
				<table className="w-full text-sm">
					<thead className="sticky top-0 bg-gray-50">
						<tr>
							{columns.map((c) => (
								<th
									key={c.key}
									className="px-4 py-3 text-left font-medium text-gray-500"
									style={c.width ? { width: c.width } : undefined}
								>
									{c.label}
								</th>
							))}
							<th className="w-36 px-4 py-3 text-right font-medium text-gray-500">
								액션
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200">
						{rows.map((row) => (
							<tr key={getRowKey(row)} className="hover:bg-gray-50">
								{columns.map((c) => {
									const text = c.render
										? c.render(row)
										: String((row as Record<string, unknown>)[c.key] ?? "");
									return (
										<td
											key={c.key}
											className="max-w-[260px] truncate px-4 py-3 text-gray-700"
											title={text}
										>
											{text}
										</td>
									);
								})}
								<td className="px-4 py-3 text-right">
									<div className="flex items-center justify-end gap-1">
										<button
											type="button"
											onClick={() => onEdit(row)}
											className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-3 py-1 font-medium text-violet-700 text-xs hover:bg-violet-100"
										>
											<Pencil className="h-3 w-3" />
											편집
										</button>
										{onDelete && (
											<button
												type="button"
												onClick={() => onDelete(row)}
												className="inline-flex items-center gap-1 rounded-md bg-red-50 px-3 py-1 font-medium text-red-700 text-xs hover:bg-red-100"
											>
												<Trash2 className="h-3 w-3" />
												삭제
											</button>
										)}
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
