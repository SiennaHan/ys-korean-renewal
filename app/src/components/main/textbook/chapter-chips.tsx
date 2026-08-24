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

	/*
	 * activeId 는 **재실행 방아쇠**다. 몸통이 읽는 것은 ref 하나뿐이라 biome 은
	 * activeId 를 불필요하다고 보는데, 지우면 의존성이 비어 마운트 때 한 번만 돌고
	 * **탭을 바꿔도 그 탭이 화면 안으로 안 들어온다.** 지금이 맞다.
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: activeId 가 바뀔 때 스크롤하려고 넣은 방아쇠다 — 몸통은 ref 만 읽는다
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
