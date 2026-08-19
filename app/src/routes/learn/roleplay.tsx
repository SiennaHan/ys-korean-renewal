import AiRoleplay from "@/components/learn/ai-roleplay";
import { useStudySessionPing } from "@/hooks/use-study-session-ping";
import { createFileRoute } from "@tanstack/react-router";

interface RoleplaySearchParams {
	book?: number;
	chapter?: number;
	chapterSeq?: number;
}

export const Route = createFileRoute("/learn/roleplay")({
	validateSearch: (search: Record<string, unknown>): RoleplaySearchParams => ({
		book: Number(search.book) || undefined,
		chapter: Number(search.chapter) || undefined,
		chapterSeq: Number(search.chapterSeq) || undefined,
	}),
	component: RoleplayPage,
});

function RoleplayPage() {
	useStudySessionPing("roleplay");
	const { book, chapterSeq } = Route.useSearch();
	const chapterLabel = chapterSeq
		? `${chapterSeq}과 AI 롤플레잉`
		: "AI 롤플레잉";

	return (
		<AiRoleplay
			bookId={book}
			chapterSeq={chapterSeq}
			chapterLabel={chapterLabel}
		/>
	);
}
