import { CheckMission, type FeedbackItem, type KoChat } from "@/api/apiType";
import { getReport, resetDialog } from "@/api/chat";
import ReportHeader from "@/components/report/report-header";
import ScoreBox from "@/components/report/score-box";
import AssessmentChart from "@/components/ui/assess-chart";
import { chapters } from "@/shared/data/chapter";
import { dialogs } from "@/shared/data/dialog";
import { dialog_keywords } from "@/shared/data/dialog_keyword";
import { modules } from "@/shared/data/module";
import { units } from "@/shared/data/unit";
import { CircleArrowRight, CircleX } from "lucide-react";
import { useEffect, useState } from "react";

const tabBase =
	"text-[14px] text-[#ADB3BE] text-center font-bold border-b-2 border-[#ddd] cursor-pointer";
const selectedTabBase =
	"text-[14px] text-[#24425F] text-center font-bold border-b-3 border-[#000] cursor-pointer";

/**
 * AI 미션 대화 — 리포트 단계 (명세 §4)
 *
 * 구 경로 /book/chapter/unit/dialog/report/$id 에 라우트로 있던 것을
 * 컴포넌트로 떼어냈다. /learn/mission-chat 이 자기 상태로 띄운다.
 */
export default function MissionReport({
	dialogId,
	onRetry,
	onExit,
}: {
	dialogId: string;
	/** 대화를 초기화하고 대화 단계로 되돌린다 */
	onRetry: () => void;
	/** 활동을 끝낸다 */
	onExit: () => void;
}) {
	const dialog = dialogs.find((item) => item.id === dialogId);
	const module = modules.find((item) => item.code === dialog?.module_code);
	const unit = units.find((item) => item.id === module?.unit_id);
	const chapter = chapters.find((item) => item.id === unit?.chapter_id);

	const missionList = dialog_keywords.filter(
		(item) => item.dialog_id === dialogId,
	);

	const [isResponding, setIsResponding] = useState(false);
	const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
	const [chat, setChat] = useState<KoChat | null>();
	const [assessment, setAssessment] = useState({
		pronunciation: "",
		grammar: "",
		context: "",
		vocabulary: "",
	});
	const missions = missionList.map((item) => item.keyword);

	const retryDialog = async () => {
		setIsResponding(true);
		await resetDialog(dialogId);
		onRetry();
		setIsResponding(false);
	};

	const finishReport = onExit;

	const [chartData, setChartData] = useState({
		labels: ["발음", "문법", "내용", "어휘"],
		data: [0, 0, 0, 0],
	});

	const [scoreData, setScoreData] = useState({
		count: 0,
		completedCount: 0,
	});

	const [tabIndex, setTabIndex] = useState(0);
	const handleTab = (index: number) => {
		setTabIndex(index);
	};

	useEffect(() => {
		const fetchReport = async () => {
			setIsResponding(true);
			const report = await getReport(dialogId);
			if (report) {
				const rf = report.feedbacks;

				const convertedFeedback: FeedbackItem[] = [];
				report.feedbacks.forEach((item) => {
					let question = item.question;
					if (typeof question === "string") {
						question = JSON.parse(question);
					}

					let answer = item.answer;
					if (typeof answer === "string") {
						answer = JSON.parse(answer);
					}

					const newItem = { ...item, answer: answer, question: question };
					convertedFeedback.push(newItem);
				});

				const filterdList = convertedFeedback.filter(
					(item) => item.answer.is_all_natural === false,
				);

				setFeedbacks(filterdList);

				const rc = report.chat;
				setChat(rc);

				let c_missions = rc.completed_missions;
				if (typeof rc.completed_missions === "string")
					c_missions = JSON.parse(rc.completed_missions);

				const _missionCount = missions?.length ?? 0;
				const _completeCount = c_missions?.length ?? 0;

				setScoreData({
					count: _missionCount,
					completedCount: _completeCount,
				});

				const fcount = rf.length;

				const pronunciationScore = Math.floor(
					(convertedFeedback.filter(
						(item) => item.answer.is_pronunciation_correct === true,
					).length /
						fcount) *
						100,
				);
				const grammarScore = Math.floor(
					(convertedFeedback.filter(
						(item) => item.answer.is_grammar_correct === true,
					).length /
						fcount) *
						100,
				);
				const contextScore = Math.floor(
					(convertedFeedback.filter(
						(item) => item.answer.is_context_natural === true,
					).length /
						fcount) *
						100,
				);
				const vocabularyScore = Math.floor(
					(convertedFeedback.filter(
						(item) => item.answer.is_vocabulary_natural === true,
					).length /
						fcount) *
						100,
				);

				setChartData({
					labels: ["발음", "문법", "내용", "어휘"],
					data: [
						pronunciationScore,
						grammarScore,
						contextScore,
						vocabularyScore,
					],
				});

				// 요약은 서버가 이미 선택 언어로 생성해 주므로 그대로 표시
				const _assess = JSON.parse(rc.report);
				setAssessment({
					pronunciation: _assess.pronunciation_correct ?? "",
					grammar: _assess.grammar_correct ?? "",
					context: _assess.context_natural ?? "",
					vocabulary: _assess.vocabulary_natural ?? "",
				});
			}
			setIsResponding(false);
		};

		fetchReport();
	}, []);

	const AssessmentLabel = (props: { label: string; value: string }) => {
		return (
			<div className="rounded-[12px] bg-[#F9FAFC] p-[12px] text-[14px]">
				<div className="w-fit rounded-[5px] bg-[#DBEDFF] px-[8px] py-[2px] font-semibold text-[#0073E6]">
					{props.label}
				</div>
				<div className="mt-[8px]"> {props.value}</div>
			</div>
		);
	};

	return (
		<div className="relative h-full bg-[#F6F7F8]">
			<div className="flex h-full flex-col">
				<div className="bg-[#0180FF] px-[16px]">
					<div className="mt-[12px] flex items-center font-bold text-[20px] text-white">
						{"AI 대화 리포트"}
					</div>
					<div className="text-[#A2D1FF] text-[14px]">{"AI Chat Report"}</div>
				</div>
				<div className="scrollbar-hide flex-1 overflow-y-auto">
					<div className="bg-[#0180FF] p-[12px]">
						<ScoreBox {...scoreData} />
					</div>
					<div className="grid h-[46px] grid-cols-2">
						<button
							type="button"
							onClick={(e) => handleTab(0)}
							className={tabIndex === 0 ? selectedTabBase : tabBase}
						>
							{"평가"}
						</button>
						<button
							type="button"
							onClick={(e) => handleTab(1)}
							className={tabIndex === 1 ? selectedTabBase : tabBase}
						>
							{"나의 문장 피드백"}
						</button>
					</div>

					{tabIndex === 0 ? (
						<div className="w-full px-[12px]">
							<div className="mt-[16px] mb-[12px] font-bold text-[#383A3F] text-[16px]">
								평가
							</div>
							<div className="mt-[6px] rounded-[10px] bg-[#fff] p-[10px]">
								<AssessmentChart {...chartData} />
								<div className="mt-[20px] flex flex-col gap-[12px]">
									<AssessmentLabel
										label="발음"
										value={assessment.pronunciation}
									/>
									<AssessmentLabel label="문법" value={assessment.grammar} />
									<AssessmentLabel label="어휘" value={assessment.vocabulary} />
									<AssessmentLabel label="내용" value={assessment.context} />
								</div>
							</div>
						</div>
					) : (
						<div className="mt-[18px] w-full px-[12px]">
							<div className="mt-[16px] mb-[12px] font-bold text-[#383A3F] text-[16px]">
								나의 문장 피드백
							</div>
							<div className="mt-[6px] rounded-[10px] bg-[#fff] p-[10px] ">
								<div className="rounded-[10px] border-1 px-[10px] pt-[6px] pb-[8px]">
									{feedbacks.map((item, index) => {
										return (
											<div key={item.id}>
												<div className="pt-[5px] text-[14px]">
													<div className="w-fit rounded-[6px] bg-[#FFE8E8] px-[8px] py-[3px] font-semibold text-[#F15F49] text-[14px]">
														오답 {index + 1}
													</div>
													<div className="mt-[5px] px-[3px] text-[#4B505A] text-[14px]">
														{item.question.content[0].text}
													</div>
												</div>
												<div className="mt-[10px]">
													<div className="w-fit rounded-[6px] bg-[#24425F] px-[8px] py-[3px] font-semibold text-[#fff] text-[14px]">
														해설 {index + 1}
													</div>
													<div className="mt-[5px] px-[3px] text-[#4B505A] text-[14px]">
														{item.answer.feedback}
													</div>
												</div>
												{index < feedbacks.length - 1 && (
													<div className="mt-[8px] mb-[3px] border-[#f3f3f3] border-b-1" />
												)}
											</div>
										);
									})}
								</div>
							</div>
						</div>
					)}
					<div className="h-[8px]" />
				</div>
				<div className="grid grid-cols-2 gap-[8px] px-[20px] py-[10px]">
					<button
						type="button"
						onClick={finishReport}
						className="flex h-[56px] cursor-pointer items-center justify-center rounded-[12px] bg-[#DBEDFF] font-bold text-[#0180FF] text-[16px]"
					>
						끝내기
					</button>
					<button
						type="button"
						onClick={retryDialog}
						className="flex h-[56px] cursor-pointer items-center justify-center rounded-[12px] bg-[#0180FF] font-bold text-[#fff] text-[16px]"
					>
						다시 말해보기
					</button>
				</div>
			</div>
			{isResponding && (
				<div className="absolute top-0 flex h-full w-full items-center justify-center bg-[#00000055]">
					<div className="h-12 w-12 animate-spin rounded-full border-[#fff] border-b-3" />
				</div>
			)}
		</div>
	);
}
