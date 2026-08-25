import type { FeedbackItem } from "@/api/apiType";
import { getReport, resetDialog } from "@/api/chat";
import {
	type RadarValues,
	type ReportRow,
	ReportScreen,
	type SentenceFeedback,
} from "@/components/main/activity";
import { dialog_keywords } from "@/shared/data/dialog_keyword";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const EMPTY_VALUES: RadarValues = [0, 0, 0, 0];

function parseJson<T>(value: unknown, fallback: T): T {
	if (typeof value === "string") {
		try {
			return JSON.parse(value) as T;
		} catch {
			return fallback;
		}
	}
	return value && typeof value === "object" ? (value as T) : fallback;
}

/**
 * AI 미션 대화 — 리포트 단계.
 *
 * 실제 서버 데이터·문장별 피드백·재시도 동작은 그대로 두고, 화면 구조만
 * 활동 공통 ReportScreen 으로 옮긴다. 목업용 리포트로 통째로 바꾸면
 * 두 번째 탭과 실제 피드백이 사라지기 때문에 데이터 변환만 여기서 맡는다.
 */
export default function MissionReport({
	dialogId,
	lesson,
	onRetry,
	onExit,
}: {
	dialogId: string;
	lesson: string;
	onRetry: () => void;
	onExit: () => void;
}) {
	const { t } = useTranslation();
	const missionCount = useMemo(
		() => dialog_keywords.filter((item) => item.dialog_id === dialogId).length,
		[dialogId],
	);
	const [loading, setLoading] = useState(true);
	const [completedCount, setCompletedCount] = useState(0);
	const [values, setValues] = useState<RadarValues>(EMPTY_VALUES);
	const [rows, setRows] = useState<ReportRow[]>([]);
	const [sentenceFeedback, setSentenceFeedback] = useState<SentenceFeedback[]>(
		[],
	);

	useEffect(() => {
		let mounted = true;
		/* 로컬 목이나 리포트 생성 서버가 응답하지 않아도 화면 전체를 영원히
		 * 가리지 않는다. 요청은 계속 기다리고, 느리면 빈 리포트 골격을 먼저 연다. */
		const loadingGuard = window.setTimeout(() => {
			if (mounted) setLoading(false);
		}, 6000);
		const fetchReport = async () => {
			setLoading(true);
			const report = await getReport(dialogId);
			if (!report || !mounted) {
				if (mounted) setLoading(false);
				return;
			}

			const converted = (report.feedbacks ?? []).map((item) => ({
				...item,
				question: parseJson(item.question, {
					role: "user",
					content: [{ type: "text", text: "" }],
				}),
				answer: parseJson(item.answer, {
					is_logic_valid: false,
					completed_missions: [],
					status: "",
					feedback: "",
					is_all_natural: true,
					is_pronunciation_correct: false,
					is_grammar_correct: false,
					is_context_natural: false,
					is_vocabulary_natural: false,
					recommend_example: "",
				}),
			})) as FeedbackItem[];

			const count = converted.length;
			const score = (predicate: (item: FeedbackItem) => boolean) =>
				count > 0
					? Math.floor((converted.filter(predicate).length / count) * 100)
					: 0;
			setValues([
				score((item) => item.answer.is_pronunciation_correct === true),
				score((item) => item.answer.is_grammar_correct === true),
				score((item) => item.answer.is_context_natural === true),
				score((item) => item.answer.is_vocabulary_natural === true),
			]);

			const completed = parseJson<string[]>(report.chat.completed_missions, []);
			setCompletedCount(completed.length);

			const assessment = parseJson<Record<string, string>>(
				report.chat.report,
				{},
			);
			setRows([
				{
					axis: "pronunciation",
					text:
						assessment.pronunciation_correct ?? "평가할 발음 데이터가 없어요.",
				},
				{
					axis: "grammar",
					text: assessment.grammar_correct ?? "평가할 문법 데이터가 없어요.",
				},
				{
					axis: "content",
					text: assessment.context_natural ?? "평가할 내용 데이터가 없어요.",
				},
				{
					axis: "vocabulary",
					text: assessment.vocabulary_natural ?? "평가할 어휘 데이터가 없어요.",
				},
			]);

			setSentenceFeedback(
				converted
					.filter((item) => item.answer.is_all_natural === false)
					.map((item) => ({
						id: item.id,
						sentence: item.question.content[0]?.text ?? "",
						feedback: item.answer.feedback ?? "",
					})),
			);
			setLoading(false);
		};

		void fetchReport();
		return () => {
			mounted = false;
			window.clearTimeout(loadingGuard);
		};
	}, [dialogId]);

	const retryDialog = async () => {
		setLoading(true);
		await resetDialog(dialogId);
		onRetry();
	};

	return (
		<ReportScreen
			lesson={lesson}
			hits={completedCount}
			missions={missionCount}
			values={values}
			rows={rows}
			sentenceFeedback={sentenceFeedback}
			loading={loading}
			retryLabel={t("report.retryConversation")}
			nextLabel={t("report.finishLearning")}
			onExit={onExit}
			onRetry={() => void retryDialog()}
			onNext={onExit}
		/>
	);
}
