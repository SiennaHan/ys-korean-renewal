import ListenAnswer from "@/components/learn/listen-answer";
import { useStudySessionPing } from "@/hooks/use-study-session-ping";
import { createFileRoute } from "@tanstack/react-router";

interface ListenAnswerSearchParams {
	book?: number;
	chapter?: number;
	chapterSeq?: number;
}

export const Route = createFileRoute("/learn/listen-answer")({
	validateSearch: (
		search: Record<string, unknown>,
	): ListenAnswerSearchParams => ({
		book: Number(search.book) || undefined,
		chapter: Number(search.chapter) || undefined,
		chapterSeq: Number(search.chapterSeq) || undefined,
	}),
	component: ListenAnswerPage,
});

function ListenAnswerPage() {
	useStudySessionPing("listen-answer");
	const { book, chapter, chapterSeq } = Route.useSearch();
	const chapterLabel = chapterSeq
		? `${chapterSeq}과 듣고 질문에 답하기`
		: "듣고 질문에 답하기";

	return (
		<ListenAnswer
			bookId={book}
			chapter={chapter}
			chapterSeq={chapterSeq}
			chapterLabel={chapterLabel}
		/>
	);
}
