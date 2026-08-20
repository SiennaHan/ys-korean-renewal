import { useEffect, useRef } from "react";

export interface BookTab {
	id: number | "jamo";
	label: string;
}

/**
 * 교재 탭 — 한글 · 1급 · 2급 …
 *
 * 고른 것을 가운데로 끌어온다. 급이 늘어나면 화면 밖으로 밀리는데,
 * 지금 어디인지가 안 보이면 어디로 갈지도 못 정한다.
 */
export default function BookTabs({
	tabs,
	activeId,
	onSelect,
}: {
	tabs: BookTab[];
	activeId: number | "jamo";
	onSelect: (id: number | "jamo") => void;
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
		<div className="strip">
			{tabs.map((tab) => {
				const on = tab.id === activeId;
				return (
					<button
						key={tab.id}
						ref={on ? activeRef : null}
						type="button"
						className={`tab2 ${on ? "on" : ""}`}
						aria-pressed={on}
						onClick={() => onSelect(tab.id)}
					>
						{tab.label}
					</button>
				);
			})}
		</div>
	);
}
