import FillBlank from "@/components/learn/fill-blank";
import { useStudySessionPing } from "@/hooks/use-study-session-ping";
import { createFileRoute } from "@tanstack/react-router";
import { type LearnSearch, parseLearnSearch } from "./-search";

export const Route = createFileRoute("/learn/grammar")({
	validateSearch: (search: Record<string, unknown>): LearnSearch =>
		parseLearnSearch(search),
	component: Page,
});

function Page() {
	useStudySessionPing("fill-blank");
	const { level, lesson } = Route.useSearch();
	const chapterLabel = lesson ? `${lesson}과 빈칸 채워 말하기` : "빈칸 채워 말하기";

	return (
		<FillBlank
			bookId={level}
			chapterSeq={lesson}
			chapterLabel={chapterLabel}
		/>
	);
}
