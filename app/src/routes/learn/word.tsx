import WordLearning from "@/components/learn/word-learning";
import { useStudySessionPing } from "@/hooks/use-study-session-ping";
import { createFileRoute } from "@tanstack/react-router";
import { type LearnSearch, parseLearnSearch } from "./-search";

export const Route = createFileRoute("/learn/word")({
	validateSearch: (search: Record<string, unknown>): LearnSearch =>
		parseLearnSearch(search),
	component: Page,
});

function Page() {
	useStudySessionPing("word");
	const { level, lesson } = Route.useSearch();
	const chapterLabel = lesson ? `${lesson}과 단어 학습하기` : "단어 학습하기";

	return (
		<WordLearning
			bookId={level}
			chapterSeq={lesson}
			chapterLabel={chapterLabel}
		/>
	);
}
