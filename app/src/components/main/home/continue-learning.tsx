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
}: {
	kind: TaskKind;
	title: ReactNode;
	body: ReactNode;
	onClick: () => void;
}) {
	const Icon = ICON[kind];
	return (
		<button type="button" className="task" onClick={onClick}>
			<span className="ic">
				<Icon />
			</span>
			<span className="tx">
				<span className="t1">{title}</span>
				<span className="t2">{body}</span>
			</span>
			<span className="go">
				<IconRight />
			</span>
		</button>
	);
}
