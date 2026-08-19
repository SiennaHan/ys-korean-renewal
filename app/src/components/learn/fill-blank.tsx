import {
	getLearningRecords,
	saveLearningRecord,
} from "@/api/learning-record";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import { useToast } from "@/components/toast/toast-context";
import blankQuestions from "@/shared/data/n4_blank_question.json";
import { useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface BlankQuestion {
	id: number;
	book_id: number;
	chapter: number;
	question: string;
	selections: string;
	options: string;
	answer: string;
	completion: string;
	grammar_focus: string;
}

interface FillBlankProps {
	bookId?: number;
	chapterSeq?: number;
	chapterLabel: string;
}

type AnswerState = "idle" | "selected" | "correct" | "wrong";

export default function FillBlank({
	bookId,
	chapterSeq,
	chapterLabel,
}: FillBlankProps) {
	const router = useRouter();
	const sound = useSoundEffects();
	const { addToast } = useToast();

	const questions = useMemo(() => {
		return (blankQuestions as BlankQuestion[]).filter(
			(q) =>
				(bookId == null || q.book_id === bookId) &&
				(chapterSeq == null || q.chapter === chapterSeq),
		);
	}, [bookId, chapterSeq]);

	const [currentIndex, setCurrentIndex] = useState(0);
	const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
	const [answerState, setAnswerState] = useState<AnswerState>("idle");
	/** questionId → { selectedAnswer, isCorrect } from server */
	const [savedAnswers, setSavedAnswers] = useState<
		Record<number, { answer: string; correct: boolean }>
	>({});

	/** Fetch existing records on mount + 첫 미풀이 문제로 이동 */
	useEffect(() => {
		if (!bookId || !chapterSeq) return;
		getLearningRecords(bookId, chapterSeq, "fill-blank").then((records) => {
			const map: Record<number, { answer: string; correct: boolean }> = {};
			for (const r of records) {
				if (r.selected_answer != null) {
					map[r.question_id] = {
						answer: r.selected_answer,
						correct: r.is_correct,
					};
				}
			}
			setSavedAnswers(map);
			const firstUnsolved = questions.findIndex(
				(q) => !map[q.id]?.correct,
			);
			if (firstUnsolved > 0) {
				setCurrentIndex(firstUnsolved);
			}
		});
	}, [bookId, chapterSeq, questions]);

	const question = questions[currentIndex] as BlankQuestion | undefined;

	/** Restore saved answer when navigating to a question */
	useEffect(() => {
		if (question && savedAnswers[question.id]) {
			const saved = savedAnswers[question.id];
			setSelectedAnswer(saved.answer);
			setAnswerState(saved.correct ? "correct" : "wrong");
		} else {
			setSelectedAnswer(null);
			setAnswerState("idle");
		}
	}, [currentIndex, question?.id, savedAnswers]);
	const totalSteps = questions.length;

	/** selections 파싱: 콤마로 분리 */
	const selections = useMemo(() => {
		if (!question) return [];
		return question.selections.split(",").map((s) => s.trim());
	}, [question]);

	/** 선택지 클릭 — 선택 즉시 채점 */
	const handleSelectAnswer = useCallback(
		(sel: string) => {
			if (answerState === "correct" || !question) return;
			if (selectedAnswer === sel) {
				// 같은 걸 다시 클릭 → 해제
				sound.playClick();
				setSelectedAnswer(null);
				setAnswerState("idle");
				return;
			}

			setSelectedAnswer(sel);

			if (sel === question.answer) {
				setAnswerState("correct");
				sound.playCorrect();
				addToast("Correct", "success");
				if (bookId && chapterSeq) {
					saveLearningRecord({
						bookId,
						chapterSeq,
						menuType: "fill-blank",
						questionId: question.id,
						selectedAnswer: sel,
						isCorrect: true,
					});
					setSavedAnswers((prev) => ({
						...prev,
						[question.id]: { answer: sel, correct: true },
					}));
				}
			} else {
				setAnswerState("wrong");
				sound.playIncorrect();
				addToast("Incorrect", "error");
			}
		},
		[answerState, selectedAnswer, question, bookId, chapterSeq],
	);

	/** 선택한 답이 맞는지 */
	const isSelectionCorrect = selectedAnswer === question?.answer;

	/** 빈칸 표시: 선택 전엔 넓은 밑줄, 선택 후엔 텍스트 교체 */
	const questionParts = useMemo(() => {
		if (!question) return { before: "", after: "", completionFilled: "" };
		// 빈칸 패턴: "(     )" (5칸) 또는 "( )" (1칸)
		const blankPattern = /\(\s+\)/;
		const match = question.question.match(blankPattern);
		if (!match || match.index === undefined)
			return { before: question.question, after: "", completionFilled: "" };
		const idx = match.index;
		const before = question.question.slice(0, idx);
		const after = question.question.slice(idx + match[0].length);

		// completion의 <b>...</b> 태그가 볼드로 강조할 영역을 그대로 표시한다.
		// 태그 안쪽만 볼드로 렌더하고, 태그 문자열 자체는 화면에 노출하지 않는다.
		const comp = question.completion;
		const bMatch = comp.match(/<b>([\s\S]*?)<\/b>/);

		let completionBefore = "";
		let completionFilled = comp.replace(/<\/?b>/g, "");
		let completionAfter = "";
		if (bMatch?.index !== undefined) {
			completionBefore = comp.slice(0, bMatch.index);
			completionFilled = bMatch[1];
			completionAfter = comp.slice(bMatch.index + bMatch[0].length);
		}

		return { before, after, completionBefore, completionFilled, completionAfter };
	}, [question]);

	/** 이전/다음 문제 */
	const handlePrev = useCallback(() => {
		if (currentIndex > 0) {
			setCurrentIndex(currentIndex - 1);
		}
	}, [currentIndex]);

	const handleNext = useCallback(() => {
		if (currentIndex < totalSteps - 1) {
			setCurrentIndex(currentIndex + 1);
		}
	}, [currentIndex, totalSteps]);

	const hasPrev = currentIndex > 0;
	const hasNext = currentIndex < totalSteps - 1;

	if (!question) {
		return (
			<div className="flex h-full flex-col items-center justify-center bg-white">
				<p className="text-[#888] text-[14px]">데이터가 없습니다</p>
			</div>
		);
	}

	return (
		<div className="relative flex h-full flex-col bg-white">
			{/* Header */}
			<div className="sticky top-0 z-10 bg-white">
				<div className="flex h-[48px] items-center px-[4px]">
					<button
						type="button"
						onClick={() => router.history.back()}
						className="flex size-[44px] cursor-pointer items-center justify-center"
					>
						<X className="size-[20px] text-[#383A3F]" />
					</button>
					<div className="flex-1 pr-[44px] text-center">
						<p className="text-[#979DA8] text-[14px]">{chapterLabel}</p>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="scrollbar-hide flex-1 overflow-y-auto px-[20px] pt-[8px] pb-[180px]">
				{/* Title */}
				<h1 className="font-bold text-[#383A3F] text-[20px] leading-tight">
					빈칸에 알맞은 것을 고르세요.
				</h1>
				<p className="mt-[4px] text-[#979DA8] text-[14px]">
					Choose the correct word.
				</p>

				{/* Question with blank */}
				<div className="mt-[20px] rounded-[12px] border border-[#DBEDFF] bg-[#F0F7FF] px-[16px] py-[14px]">
					<p className="font-medium text-[#383A3F] text-[18px] leading-relaxed">
						{selectedAnswer && isSelectionCorrect ? (
							<>
								{questionParts.completionBefore}
								<span className="font-bold text-[#0180FF]">
									{questionParts.completionFilled}
								</span>
								{questionParts.completionAfter}
							</>
						) : selectedAnswer ? (
							<>
								{questionParts.before}
								<span
									className={clsx(
										"font-bold",
										isSelectionCorrect
											? "text-[#0180FF]"
											: "text-[#bbb]",
									)}
								>
									{selectedAnswer}
								</span>
								{questionParts.after}
							</>
						) : (
							<>
								{questionParts.before}
								<span className="inline-block w-[80px] text-center text-[#C8CCD3]">
									({"　　　　"})
								</span>
								{questionParts.after}
							</>
						)}
					</p>
				</div>

				{/* Selection buttons */}
				<div className="mt-[16px] flex flex-wrap gap-[8px]">
					{selections.map((sel) => {
						const isSelected = selectedAnswer === sel;
						const isCorrectSel = sel === question?.answer;
						const showCorrect = answerState === "correct" && isSelected;
						const showWrongSel = isSelected && !isCorrectSel;

						return (
							<button
								key={sel}
								type="button"
								onClick={() => handleSelectAnswer(sel)}
								disabled={answerState === "correct"}
								className={clsx(
									"rounded-[8px] border px-[16px] py-[10px] font-medium text-[15px] transition-colors",
									showCorrect
										? "border-[#359AFF] border-[2px] bg-[#359AFF] text-white"
										: showWrongSel
											? "border-[#E5E8EC] bg-gray-100 text-[#bbb] opacity-70"
											: isSelected
												? "border-[#0180FF] bg-[#E9F2FC] text-[#0180FF]"
												: "border-[#E5E8EC] bg-white text-[#383A3F]",
									answerState === "correct"
										? "cursor-not-allowed"
										: "cursor-pointer",
								)}
							>
								{sel}
							</button>
						);
					})}
				</div>

				{/* Grammar focus — shown after selecting an answer */}
				{selectedAnswer && (
					<div className="mt-[12px] rounded-[10px] bg-[#F9FAFC] px-[14px] py-[10px]">
						<p className="text-[#7F848D] text-[13px]">
							{question.grammar_focus}
						</p>
					</div>
				)}

				{/* 정답 표시 */}
				{answerState === "correct" && (
					<div className="mt-[16px] flex items-center gap-[6px]">
						<div className="flex size-[20px] items-center justify-center rounded-full bg-[#359AFF]">
							<span className="font-bold text-[12px] text-white">✓</span>
						</div>
						<span className="font-medium text-[#359AFF] text-[14px]">
							정답입니다!
						</span>
					</div>
				)}

				{/* 오답 표시 */}
				{answerState === "wrong" && (
					<div className="mt-[16px] flex items-center gap-[6px]">
						<div className="flex size-[20px] items-center justify-center rounded-full bg-[#ADB3BE]">
							<span className="font-bold text-[12px] text-white">✗</span>
						</div>
						<span className="font-medium text-[#ADB3BE] text-[14px]">
							다시 골라 보세요
						</span>
					</div>
				)}
			</div>

			{/* Bottom bar with recording + navigation */}
			<div className="absolute right-0 bottom-0 left-0 z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0)0%,#FFF_50%)] pt-[40px]">
				<div className="flex items-center px-[16px]">
					{/* Left arrow */}
					<button
						type="button"
						onClick={handlePrev}
						disabled={!hasPrev}
						className={clsx(
							"flex size-[36px] shrink-0 items-center justify-center",
							hasPrev
								? "cursor-pointer text-[#0180FF]"
								: "cursor-default text-[#E5E8EC]",
						)}
					>
						<ChevronLeft className="size-[24px]" />
					</button>

					<div className="flex-1" />

					{/* Right arrow / 완료 */}
					{!hasNext ? (
						<button
							type="button"
							onClick={() => router.history.back()}
							disabled={
								questions.length === 0 ||
								!questions.every((q) => savedAnswers[q.id]?.correct)
							}
							className={clsx(
								"flex h-[36px] shrink-0 items-center justify-center gap-[4px] rounded-full px-[14px] font-semibold text-[14px]",
								questions.length > 0 &&
									questions.every((q) => savedAnswers[q.id]?.correct)
									? "cursor-pointer bg-[#0180FF] text-white"
									: "bg-[#E5E8EC] text-[#ADB3BE]",
							)}
						>
							<Check className="size-[16px]" />
							완료
						</button>
					) : (
						<button
							type="button"
							onClick={handleNext}
							className="flex size-[36px] shrink-0 cursor-pointer items-center justify-center text-[#0180FF]"
						>
							<ChevronRight className="size-[24px]" />
						</button>
					)}
				</div>

				{/* Progress dots */}
				{totalSteps > 1 && (
					<div className="flex items-center justify-center gap-[4px] pt-[4px] pb-[8px]">
						{Array.from({ length: totalSteps }, (_, i) => (
							<div
								key={questions[i].id}
								className={clsx(
									"rounded-full",
									i === currentIndex
										? "h-[5px] w-[16px] bg-[#0180FF]"
										: "size-[5px] bg-[#E5E8EC]",
								)}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
