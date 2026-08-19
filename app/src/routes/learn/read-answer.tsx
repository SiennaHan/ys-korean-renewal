import ReadAnswer from "@/components/learn/read-answer";
import { useStudySessionPing } from "@/hooks/use-study-session-ping";
import { createFileRoute } from "@tanstack/react-router";

interface ReadAnswerSearchParams {
	book?: number;
	chapter?: number;
	chapterSeq?: number;
}

export const Route = createFileRoute("/learn/read-answer")({
	validateSearch: (
		search: Record<string, unknown>,
	): ReadAnswerSearchParams => ({
		book: Number(search.book) || undefined,
		chapter: Number(search.chapter) || undefined,
		chapterSeq: Number(search.chapterSeq) || undefined,
	}),
	component: ReadAnswerPage,
});

function ReadAnswerPage() {
	useStudySessionPing("read-answer");
	const { book, chapter, chapterSeq } = Route.useSearch();
	const chapterLabel = chapterSeq
		? `${chapterSeq}과 읽고 질문에 답하기`
		: "읽고 질문에 답하기";

	return (
		<ReadAnswer
			bookId={book}
			chapterSeq={chapterSeq}
			chapterLabel={chapterLabel}
		/>
	);
}
