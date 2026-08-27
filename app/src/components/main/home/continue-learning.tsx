import {
	IconBook,
	IconPlay,
	IconRedo,
	IconRight,
} from "@/components/main/nav/icons";
import type { ReactNode } from "react";

/**
 * 오늘 할 일 — 홈에서 가장 먼저 눌리는 한 자리.
 *
 * 세 갈래가 같은 자리를 나눠 쓴다. 여러 개를 늘어놓지 않는 것이 요점이다 —
 * 지금 무엇을 하면 되는지가 하나로 정해져야 학생이 고르지 않는다.
 */
export type TaskKind = "resume" | "review" | "none";

const ICON: Record<TaskKind, () => ReactNode> = {
	resume: IconPlay,
	review: IconRedo,
	none: IconBook,
};

export default function TaskCard({
	kind,
	title,
	body,
	onClick,
	waiting,
}: {
	kind: TaskKind;
	title: ReactNode;
	body: ReactNode;
	onClick: () => void;
	/**
	 * **지금은 할 수 없는 일**이다 — 알리기만 하고 누를 수 없게 한다.
	 *
	 * 다시 풀기가 그렇다. 오늘 틀리거나 건너뛴 문항은 **내일부터** 나오는데
	 * (`available_at` = 다음 날 KST 00:00) 카드의 개수는 보관 전체를 센다.
	 * 그래서 오늘 틀린 직후에는 개수가 뜨는데 갈 곳이 없었다 — 눌러도 아무 일이
	 * 없는 버튼이었다. 누를 수 없게 만들고 문구로 언제 되는지 말한다.
	 *
	 * `<button disabled>` 이 아니라 `<div>` 로 바꾼다 — 비활성 버튼은 초점을 못
	 * 받아 스크린리더가 건너뛰므로, 개수를 알려 주는 이 카드가 안 읽힌다.
	 */
	waiting?: boolean;
}) {
	const Icon = ICON[kind];
	const inner = (
		<>
			<span className="ic">
				<Icon />
			</span>
			<span className="tx">
				<span className="t1">{title}</span>
				<span className="t2">{body}</span>
			</span>
			{/* 갈 곳이 없으면 화살표도 두지 않는다 — 누를 수 있다는 신호다 */}
			{!waiting && (
				<span className="go">
					<IconRight />
				</span>
			)}
		</>
	);
	if (waiting) {
		return <div className="task waiting">{inner}</div>;
	}
	return (
		<button type="button" className="task" onClick={onClick}>
			{inner}
		</button>
	);
}
