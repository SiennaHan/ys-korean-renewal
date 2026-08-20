import Content5 from "@/components/main/content5";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/main/my")({
	component: Wrapped,
});

/** 아직 목업으로 옮기지 않은 화면. .scroll 은 예전 레이아웃이 하던 일을 대신한다 */
function Wrapped() {
	return (
		<div className="scroll">
			<Content5 />
		</div>
	);
}
