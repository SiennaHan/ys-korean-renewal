import { useRef, useEffect } from "react";
import clsx from "clsx";

interface ChapterChip {
	id: number;
	label: string;
}

interface ChapterChipsProps {
	chips: ChapterChip[];
	activeId: number;
	onSelect: (id: number) => void;
}

export default function ChapterChips({
	chips,
	activeId,
	onSelect,
}: ChapterChipsProps) {
	const activeRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		activeRef.current?.scrollIntoView({
			behavior: "smooth",
			inline: "center",
			block: "nearest",
		});
	}, [activeId]);

	return (
		<div className="flex gap-[6px] px-[16px] overflow-x-auto scrollbar-hide">
			{chips.map((chip) => {
				const isActive = chip.id === activeId;
				return (
					<button
						key={chip.id}
						ref={isActive ? activeRef : null}
						type="button"
						onClick={() => onSelect(chip.id)}
						className={clsx(
							"shrink-0 px-[12px] py-[6px] rounded-[8px] text-[14px] font-semibold cursor-pointer transition-colors",
							isActive
								? "bg-[#DBEDFF] border border-[#59ACFF] text-[#0A6ACB] font-bold"
								: "bg-white text-[#C8CCD3]",
						)}
					>
						{chip.label}
					</button>
				);
			})}
		</div>
	);
}
