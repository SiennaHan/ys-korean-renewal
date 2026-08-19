import ReadAnswer from "@/components/learn/read-answer";
import { useStudySessionPing } from "@/hooks/use-study-session-ping";
import { createFileRoute } from "@tanstack/react-router";
import { type LearnSearch, parseLearnSearch } from "./-search";

export const Route = createFileRoute("/learn/read")({
	validateSearch: (search: Record<string, unknown>): LearnSearch =>
		parseLearnSearch(search),
	component: Page,
});

function Page() {
	useStudySessionPing("read-answer");
	const { level, lesson } = Route.useSearch();
	const chapterLabel = lesson ? `${lesson}과 읽고 질문에 답하기` : "읽고 질문에 답하기";

	return (
		<ReadAnswer
			bookId={level}
			chapterSeq={lesson}
			chapterLabel={chapterLabel}
		/>
	);
}
