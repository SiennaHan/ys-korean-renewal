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
