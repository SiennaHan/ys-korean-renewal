import Content4 from "@/components/main/content4";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/main/clip")({
	component: Wrapped,
});

/** 아직 목업으로 옮기지 않은 화면. .scroll 은 예전 레이아웃이 하던 일을 대신한다 */
function Wrapped() {
	return (
		<div className="scroll">
			<Content4 />
		</div>
	);
}
