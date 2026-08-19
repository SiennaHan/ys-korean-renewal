import { useEffect, useState } from "react";
import { X } from "lucide-react";

export interface FieldSpec {
	key: string;
	label: string;
	type: "text" | "number" | "json";
	rows?: number;
	disabled?: boolean;
	editableOnCreate?: boolean;
	placeholder?: string;
}

interface EditModalProps {
	title: string;
	open: boolean;
	mode?: "edit" | "create";
	initialValue: Record<string, unknown>;
	fields: FieldSpec[];
	onSave: (
		payload: Record<string, unknown>,
	) => Promise<{ ok: boolean; error?: string }>;
	onClose: () => void;
}

export default function EditModal({
	title,
	open,
	mode = "edit",
	initialValue,
	fields,
	onSave,
	onClose,
}: EditModalProps) {
	const [draft, setDraft] = useState<Record<string, string>>({});
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});

	const isDisabled = (f: FieldSpec) => {
		if (mode === "create" && f.editableOnCreate) return false;
		return !!f.disabled;
	};

	useEffect(() => {
		if (!open) return;
		const next: Record<string, string> = {};
		for (const f of fields) {
			const v = initialValue[f.key];
			if (f.type === "json") {
				next[f.key] = JSON.stringify(v ?? null, null, 2);
			} else if (v === null || v === undefined) {
				next[f.key] = "";
			} else {
				next[f.key] = String(v);
			}
		}
		setDraft(next);
		setError(null);
		setJsonErrors({});
	}, [open, initialValue, fields]);

	if (!open) return null;

	const handleSave = async () => {
		const payload: Record<string, unknown> = {};
		const newJsonErrors: Record<string, string> = {};
		for (const f of fields) {
			if (isDisabled(f)) continue;
			const raw = draft[f.key] ?? "";
			if (f.type === "json") {
				try {
					payload[f.key] = JSON.parse(raw);
				} catch (err) {
					newJsonErrors[f.key] =
						err instanceof Error ? err.message : "JSON parse error";
				}
			} else if (f.type === "number") {
				const n = Number(raw);
				if (raw === "" || Number.isNaN(n)) {
					newJsonErrors[f.key] = "숫자를 입력하세요";
				} else {
					payload[f.key] = n;
				}
			} else {
				payload[f.key] = raw;
			}
		}
		if (Object.keys(newJsonErrors).length) {
			setJsonErrors(newJsonErrors);
			return;
		}
		setSaving(true);
		setError(null);
		const res = await onSave(payload);
		setSaving(false);
		if (res.ok) {
			onClose();
		} else {
			setError(res.error ?? "저장에 실패했습니다.");
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
			<div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
				<div className="flex items-center justify-between border-b px-5 py-3">
					<h2 className="font-semibold text-gray-900 text-lg">{title}</h2>
					<button
						type="button"
						onClick={onClose}
						className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				<div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
					{error && (
						<div className="whitespace-pre-line rounded-md bg-red-50 px-3 py-2 text-red-700 text-sm">
							{error}
						</div>
					)}
					{fields.map((f) => {
						const disabled = isDisabled(f);
						return (
							<div key={f.key}>
								<label
									htmlFor={`field-${f.key}`}
									className="mb-1 block font-medium text-gray-700 text-sm"
								>
									{f.label}
									{disabled && (
										<span className="ml-1 text-gray-400 text-xs">
											(읽기 전용)
										</span>
									)}
								</label>
								{f.type === "json" ? (
									<textarea
										id={`field-${f.key}`}
										value={draft[f.key] ?? ""}
										onChange={(e) =>
											setDraft({ ...draft, [f.key]: e.target.value })
										}
										rows={f.rows ?? 6}
										disabled={disabled}
										className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-gray-900 text-xs focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:bg-gray-50 disabled:text-gray-500"
									/>
								) : (
									<input
										id={`field-${f.key}`}
										type={f.type === "number" ? "number" : "text"}
										value={draft[f.key] ?? ""}
										placeholder={f.placeholder}
										onChange={(e) =>
											setDraft({ ...draft, [f.key]: e.target.value })
										}
										disabled={disabled}
										className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:bg-gray-50 disabled:text-gray-500"
									/>
								)}
								{jsonErrors[f.key] && (
									<p className="mt-1 text-red-600 text-xs">
										{jsonErrors[f.key]}
									</p>
								)}
							</div>
						);
					})}
				</div>
				<div className="flex justify-end gap-2 border-t px-5 py-3">
					<button
						type="button"
						onClick={onClose}
						className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 text-sm hover:bg-gray-50"
					>
						취소
					</button>
					<button
						type="button"
						onClick={handleSave}
						disabled={saving}
						className="rounded-md bg-violet-600 px-4 py-2 font-medium text-sm text-white hover:bg-violet-700 disabled:opacity-50"
					>
						{saving ? "저장 중..." : "저장"}
					</button>
				</div>
			</div>
		</div>
	);
}
