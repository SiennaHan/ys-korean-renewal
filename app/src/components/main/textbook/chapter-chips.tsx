import { useEffect, useRef } from "react";

export interface ChapterChip {
	id: number;
	label: string;
}

/** 과 칩. 교재 탭과 같은 줄 구조를 쓰고 고른 것을 가운데로 끌어온다 */
export default function ChapterChips({
	chips,
	activeId,
	onSelect,
}: {
	chips: ChapterChip[];
	activeId: number;
	onSelect: (id: number) => void;
}) {
	const activeRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		activeRef.current?.scrollIntoView({
			behavior: "smooth",
			inline: "center",
			block: "nearest",
		});
	}, [activeId]);

	return (
		<div className="strip chips">
			{chips.map((chip) => {
				const on = chip.id === activeId;
				return (
					<button
						key={chip.id}
						ref={on ? activeRef : null}
						type="button"
						className={`chip3 ${on ? "on" : ""}`}
						aria-pressed={on}
						onClick={() => onSelect(chip.id)}
					>
						{chip.label}
					</button>
				);
			})}
		</div>
	);
}
