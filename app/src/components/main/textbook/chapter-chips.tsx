import { Lock } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

export interface ChapterChip {
	id: number;
	label: string;
}

/** 과 칩. 교재 탭과 같은 줄 구조를 쓰고 고른 것을 가운데로 끌어온다 */
export default function ChapterChips({
	chips,
	activeId,
	onSelect,
	lockedIds,
}: {
	chips: ChapterChip[];
	activeId: number;
	onSelect: (id: number) => void;
	/**
	 * 잠긴 과의 칩 id. **누를 수는 있다** — 눌러야 왜 잠겼는지 안내가 나온다
	 * (access_and_pricing_v1 §06 "숨기지 않고 보이되 잠근다").
	 *
	 * 열린 범위를 아직 못 받았으면 비운다. 그래야 답이 오기 전에 무료 과까지
	 * 잠긴 것처럼 한 번 번쩍이지 않는다.
	 */
	lockedIds?: ReadonlySet<number>;
}) {
	const activeRef = useRef<HTMLButtonElement>(null);
	const { t } = useTranslation();

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
				const locked = lockedIds?.has(chip.id) ?? false;
				return (
					<button
						key={chip.id}
						ref={on ? activeRef : null}
						type="button"
						className={`chip3 ${on ? "on" : ""} ${locked ? "locked" : ""}`}
						aria-pressed={on}
						onClick={() => onSelect(chip.id)}
					>
						{chip.label}
						{locked && (
							<Lock
								className="lk"
								aria-label={t("paywall.lockedAria")}
								role="img"
							/>
						)}
					</button>
				);
			})}
		</div>
	);
}
