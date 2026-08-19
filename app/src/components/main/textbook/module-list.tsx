import clsx from "clsx";

interface ModuleItem {
	id: string;
	title: string;
	isCompleted: boolean;
	disabled?: boolean;
}

interface ModuleSection {
	label: string;
	modules: ModuleItem[];
}

interface ModuleListProps {
	chapterTitle: string;
	sections: ModuleSection[];
	onModuleClick: (id: string) => void;
}

function CompletionBadge({ isCompleted }: { isCompleted: boolean }) {
	return (
		<div
			className={clsx(
				"shrink-0 px-[6px] py-[2px] rounded-[4px] text-[12px] font-semibold",
				isCompleted
					? "bg-[#E7FBCE] text-[#11C378]"
					: "bg-[#E5E8EC] text-[#ADB3BE]",
			)}
		>
			{isCompleted ? "완료" : "미완료"}
		</div>
	);
}

export default function ModuleList({
	chapterTitle,
	sections,
	onModuleClick,
}: ModuleListProps) {
	return (
		<div className="px-[16px]">
			<div className="bg-white rounded-[12px] overflow-hidden">
				{/* Chapter title */}
				<div className="px-[12px] py-[12px] border-b border-[#F6F7F8]">
					<p className="text-[14px] font-bold text-[#0180FF]">
						{chapterTitle}
					</p>
				</div>

				{/* Module sections */}
				<div className="px-[12px] py-[10px]">
					{sections.map((section, sIdx) => (
						<div key={section.label}>
							{sIdx > 0 && <div className="h-[16px]" />}
							<p className="text-[10px] font-semibold text-[#666B73] mb-[8px]">
								{section.label}
							</p>
							<div className="flex flex-col gap-[8px]">
								{section.modules.map((mod) => (
									<button
										key={mod.id}
										type="button"
										disabled={mod.disabled}
										onClick={() => onModuleClick(mod.id)}
										className={clsx(
											"flex items-center justify-between rounded-[6px] h-[46px] px-[16px] transition-colors w-full text-left",
											mod.disabled
												? "bg-[#F2F3F5] cursor-not-allowed opacity-40"
												: "bg-[#F9FAFC] cursor-pointer hover:bg-[#F0F2F5]",
										)}
									>
										<p
											className={clsx(
												"text-[14px] font-semibold",
												mod.disabled
													? "text-[#ADB3BE]"
													: "text-[#24425F]",
											)}
										>
											{mod.title}
										</p>
										{!mod.disabled && (
											<CompletionBadge
												isCompleted={mod.isCompleted}
											/>
										)}
									</button>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
