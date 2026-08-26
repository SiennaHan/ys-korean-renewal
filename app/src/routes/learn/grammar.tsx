import FillBlank from "@/components/learn/fill-blank";
import { useStudySessionPing } from "@/hooks/use-study-session-ping";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { type LearnSearch, parseLearnSearch } from "./-search";

export const Route = createFileRoute("/learn/grammar")({
	validateSearch: (search: Record<string, unknown>): LearnSearch =>
		parseLearnSearch(search),
	component: Page,
});

function Page() {
	useStudySessionPing("fill-blank");
	const { level, lesson, review } = Route.useSearch();
	const { t } = useTranslation();
	// 목업의 상단은 급과 과만 말한다 — 활동 이름은 문제 카드가 말한다
	const chapterLabel = t("player.lessonTitle", { level, lesson });

	return (
		<FillBlank
			bookId={level}
			chapterSeq={lesson}
			chapterLabel={chapterLabel}
			review={review}
		/>
	);
}
