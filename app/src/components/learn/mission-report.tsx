import type { FeedbackItem } from "@/api/apiType";
import { getReport, resetDialog } from "@/api/chat";
import {
	type RadarValues,
	type ReportRow,
	ReportScreen,
	type SentenceFeedback,
} from "@/components/main/activity";
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
	missionCount,
	lesson,
	onRetry,
	onExit,
}: {
	dialogId: string;
	/**
	 * 그 과의 미션 수 — **부모가 원장에서 세어 넘긴다**(2026-09-01).
	 * 전에는 구 앱 덤프 `dialog_keyword.ts` 를 여기서 다시 걸러 셌는데,
	 * 그 파일이 원장과 슬롯 수가 7건 달랐다. 리포트의 분모가 대화 화면의
	 * 미션 수와 어긋나면 「3개 중 4개 달성」 같은 것이 나온다.
	 */
	missionCount: number;
	lesson: string;
	onRetry: () => void;
	onExit: () => void;
}) {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(true);
	const [completedCount, setCompletedCount] = useState(0);
	const [values, setValues] = useState<RadarValues>(EMPTY_VALUES);
	const [rows, setRows] = useState<ReportRow[]>([]);
	const [sentenceFeedback, setSentenceFeedback] = useState<SentenceFeedback[]>(
		[],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: t 를 넣으면 언어를 바꿀 때마다 getReport 가 다시 날아가고 리포트가 빈 골격으로 깜빡인다. t 는 평가 항목이 비었을 때의 대체 문구에만 쓰인다 — 이미 그려진 리포트의 그 문구가 옛 언어로 남는 것은 감수한다
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
			/*
			 * **발음 축만 성질이 다르다.** 나머지 셋은 「불리언 통과율」인데 발음은
			 * 음향 점수(0~100)의 **평균**이고, **분모도 다르다** —
			 *
			 *   문법·내용·어휘   분모 = 전체 발화
			 *   발음             분모 = **실제로 잰 발화만**
			 *
			 * 잰 발화만 세는 이유(기획 확정 2026-09-03) —
			 *  · 키보드로 보낸 발화는 소리가 없다. 0점을 주면 「발음이 나쁘다」는
			 *    거짓말이 된다
			 *  · **STT 결과를 고친 발화도 뺀다**(`edited`). 고친 문장을 기준으로 낸
			 *    점수는 「말한 것」의 점수가 아니다
			 *
			 * 한 발화도 못 쟀으면 0 을 넣는다 — 그때 총평 줄은 서버가 빈 문자열을
			 * 내고 화면이 `report.emptyPronunciation`(「평가할 발음 데이터가 없어요」)
			 * 로 대체한다. **레이더가 0 으로 접히는 것을 「0점」으로 읽을 여지가 남는데,
			 * 「측정 안 됨」을 따로 그리는 것은 목업이 필요해 별건으로 뒀다.**
			 */
			const pronScores = converted
				.map((item) => item.answer.pron)
				.filter(
					(p): p is NonNullable<typeof p> =>
						Boolean(p?.measured) && !p?.edited && typeof p?.score === "number",
				)
				.map((p) => p.score as number);
			const pronAvg =
				pronScores.length > 0
					? Math.floor(
							pronScores.reduce((a, b) => a + b, 0) / pronScores.length,
						)
					: 0;

			setValues([
				pronAvg,
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
						assessment.pronunciation_correct ?? t("report.emptyPronunciation"),
				},
				{
					axis: "grammar",
					text: assessment.grammar_correct ?? t("report.emptyGrammar"),
				},
				{
					axis: "content",
					text: assessment.context_natural ?? t("report.emptyContent"),
				},
				{
					axis: "vocabulary",
					text: assessment.vocabulary_natural ?? t("report.emptyVocabulary"),
				},
			]);

			setSentenceFeedback(
				converted
					.filter((item) => item.answer.is_all_natural === false)
					.map((item) => ({
						id: item.id,
						sentence: item.question.content[0]?.text ?? "",
						feedback: item.answer.feedback ?? "",
						// 서버가 매 발화마다 만드는데 앱이 안 그리고 있었다(2026-09-03).
						// 옛 대화 행에는 없을 수 있으므로 빈 문자열은 안 그린다
						correction: item.answer.recommend_example || undefined,
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
