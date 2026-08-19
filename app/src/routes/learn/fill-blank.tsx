import FillBlank from "@/components/learn/fill-blank";
import { useStudySessionPing } from "@/hooks/use-study-session-ping";
import { createFileRoute } from "@tanstack/react-router";

interface FillBlankSearchParams {
	book?: number;
	chapter?: number;
	chapterSeq?: number;
}

export const Route = createFileRoute("/learn/fill-blank")({
	validateSearch: (search: Record<string, unknown>): FillBlankSearchParams => ({
		book: Number(search.book) || undefined,
		chapter: Number(search.chapter) || undefined,
		chapterSeq: Number(search.chapterSeq) || undefined,
	}),
	component: FillBlankPage,
});

function FillBlankPage() {
	useStudySessionPing("fill-blank");
	const { book, chapter, chapterSeq } = Route.useSearch();
	const chapterLabel = chapterSeq
		? `${chapterSeq}과 빈칸 채워 말하기`
		: "빈칸 채워 말하기";

	return (
		<FillBlank
			bookId={book}
			chapterSeq={chapterSeq}
			chapterLabel={chapterLabel}
		/>
	);
}
