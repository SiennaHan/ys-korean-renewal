import WordLearning from "@/components/learn/word-learning";
import { useStudySessionPing } from "@/hooks/use-study-session-ping";
import { createFileRoute } from "@tanstack/react-router";

interface WordSearchParams {
	book?: number;
	chapter?: number;
	chapterSeq?: number;
}

export const Route = createFileRoute("/learn/word")({
	validateSearch: (search: Record<string, unknown>): WordSearchParams => ({
		book: Number(search.book) || undefined,
		chapter: Number(search.chapter) || undefined,
		chapterSeq: Number(search.chapterSeq) || undefined,
	}),
	component: WordPage,
});

function WordPage() {
	useStudySessionPing("word");
	const { book, chapter, chapterSeq } = Route.useSearch();
	const chapterLabel = chapterSeq
		? `${chapterSeq}과 단어 학습하기`
		: "단어 학습하기";

	return (
		<WordLearning
			bookId={book}
			chapterSeq={chapterSeq}
			chapterLabel={chapterLabel}
		/>
	);
}
