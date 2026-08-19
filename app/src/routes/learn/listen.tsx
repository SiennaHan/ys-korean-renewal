import ListenAnswer from "@/components/learn/listen-answer";
import { useStudySessionPing } from "@/hooks/use-study-session-ping";
import { createFileRoute } from "@tanstack/react-router";
import { type LearnSearch, parseLearnSearch } from "./-search";

export const Route = createFileRoute("/learn/listen")({
	validateSearch: (search: Record<string, unknown>): LearnSearch =>
		parseLearnSearch(search),
	component: Page,
});

function Page() {
	useStudySessionPing("listen-answer");
	const { level, lesson } = Route.useSearch();
	const chapterLabel = lesson ? `${lesson}과 듣고 질문에 답하기` : "듣고 질문에 답하기";

	return (
		<ListenAnswer
			bookId={level}
			chapterSeq={lesson}
			chapter={lesson}
			chapterLabel={chapterLabel}
		/>
	);
}
