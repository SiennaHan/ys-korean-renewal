import { getLearningRecords, saveLearningRecord } from "@/api/learning-record";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import { useToast } from "@/components/toast/toast-context";
import { type InstructedItem, useInstruction } from "@/shared/data/instruction";
import readQuestions from "@/shared/data/n5_read_answer_questions.json";
import readTexts from "@/shared/data/n5_read_answer_text.json";
import { useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface ReadText {
	id: number;
	book_id: number;
	chapter: number;
	type: string;
	text: string;
}

interface ReadQuestion {
	id: number;
	text_id: number;
	seq: number;
	question: string;
	type: "choice" | "ox";
	selection1: string;
	selection2: string;
	selection3: string;
	selection4: string;
	answer_index: number;
}

/** 지시문은 원장이 문항마다 들고 온다 */
type ReadItem = ReadQuestion & InstructedItem;

interface ReadAnswerProps {
	bookId?: number;
	chapterSeq?: number;
	chapterLabel: string;
}

export default function ReadAnswer({
	bookId,
	chapterSeq,
	chapterLabel,
}: ReadAnswerProps) {
	const router = useRouter();
	const sound = useSoundEffects();
	const { addToast } = useToast();

	/** 해당 book/chapter의 지문 */
	const texts = useMemo(() => {
		return (readTexts as ReadText[]).filter(
			(t) =>
				(bookId == null || t.book_id === bookId) &&
				(chapterSeq == null || t.chapter === chapterSeq),
		);
	}, [bookId, chapterSeq]);

	const textIds = useMemo(() => texts.map((t) => t.id), [texts]);

	/** 해당 지문의 질문들 */
	const questions = useMemo(() => {
		return (readQuestions as ReadItem[])
			.filter((q) => textIds.includes(q.text_id))
			.sort((a, b) => a.seq - b.seq);
	}, [textIds]);

	const [currentIndex, setCurrentIndex] = useState(0);
	const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
	/** questionId → 정답 인덱스 (정답 맞힌 경우만) */
	const [savedAnswers, setSavedAnswers] = useState<Record<number, number>>({});
	/** questionId → 틀린 인덱스 목록 */
	const [wrongAttempts, setWrongAttempts] = useState<
		Record<number, Set<number>>
	>({});

	/** Fetch existing records on mount — 정답만 복원 + 첫 미풀이 문제로 이동 */
	useEffect(() => {
		if (!bookId || !chapterSeq) return;
		getLearningRecords(bookId, chapterSeq, "read-answer").then((records) => {
			const map: Record<number, number> = {};
			for (const r of records) {
				if (r.selected_answer != null && r.is_correct) {
					map[r.question_id] = Number.parseInt(r.selected_answer, 10);
				}
			}
			setSavedAnswers(map);
			const firstUnsolved = questions.findIndex((q) => map[q.id] === undefined);
			if (firstUnsolved > 0) {
				setCurrentIndex(firstUnsolved);
			}
		});
	}, [bookId, chapterSeq, questions]);

	const question = questions[currentIndex];
	const instruction = useInstruction(question, "activity.instrReading");

	/** Restore saved answer when navigating to a question — 정답만 복원 */
	useEffect(() => {
		if (question && savedAnswers[question.id] !== undefined) {
			setSelectedAnswer(savedAnswers[question.id]);
		} else {
			setSelectedAnswer(null);
		}
	}, [currentIndex, question?.id, savedAnswers]);

	/** 현재 문제의 틀린 시도 목록 */
	const currentWrongSet = question
		? (wrongAttempts[question.id] ?? new Set<number>())
		: new Set<number>();
	/** 현재 문제 정답 맞힘 여부 */
	const isSolved = question ? savedAnswers[question.id] !== undefined : false;
	const totalSteps = questions.length;

	/** 현재 질문에 대응하는 지문 */
	const passage = useMemo(() => {
		if (!question) return null;
		return texts.find((t) => t.id === question.text_id);
	}, [question, texts]);

	/** 선택지 배열 */
	const options = useMemo(() => {
		if (!question) return [];
		return [
			question.selection1,
			question.selection2,
			question.selection3,
			question.selection4,
		].filter((s) => s !== "");
	}, [question]);

	const handleSelect = useCallback(
		(idx: number) => {
			if (isSolved) return; // 이미 정답 맞힌 경우
			if (currentWrongSet.has(idx)) return; // 이미 시도한 오답

			sound.playClick();

			if (bookId && chapterSeq && question) {
				const isCorrect = idx === question.answer_index;
				saveLearningRecord({
					bookId,
					chapterSeq,
					menuType: "read-answer",
					questionId: question.id,
					selectedAnswer: String(idx),
					isCorrect,
				});

				if (isCorrect) {
					sound.playCorrect();
					addToast("Correct", "success");
					setSelectedAnswer(idx);
					setSavedAnswers((prev) => ({ ...prev, [question.id]: idx }));
				} else {
					sound.playIncorrect();
					addToast("Incorrect", "error");
					setWrongAttempts((prev) => ({
						...prev,
						[question.id]: new Set(prev[question.id]).add(idx),
					}));
				}
			}
		},
		[bookId, chapterSeq, question, isSolved, currentWrongSet],
	);

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

	if (!question || !passage) {
		return (
			<div className="flex h-full flex-col items-center justify-center bg-white">
				<p className="text-[#888] text-[14px]">데이터가 없습니다</p>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col bg-white">
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
			<div className="scrollbar-hide flex-1 overflow-y-auto px-[20px] pt-[8px] pb-[100px]">
				{/* O/X 문항은 지시문이 다르다. 원장이 문항마다 들고 온다 */}
				<h1 className="font-bold text-[#383A3F] text-[20px] leading-tight">
					{instruction.ko}
				</h1>
				{instruction.translated && (
					<p className="mt-[4px] text-[#979DA8] text-[14px]">
						{instruction.translated}
					</p>
				)}

				{/* Passage */}
				<div className="mt-[20px] rounded-[12px] bg-[#F9FAFC] p-[16px]">
					<p className="whitespace-pre-line text-[#383A3F] text-[15px] leading-relaxed">
						{passage.text}
					</p>
				</div>

				{/* Question */}
				<div className="mt-[20px] mb-[16px]">
					<p className="font-semibold text-[#383A3F] text-[16px]">
						{question.question}
					</p>
				</div>

				{/* OX Buttons */}
				{question.type === "ox" && (
					<div className="flex gap-[12px] pb-[20px]">
						{options.map((opt, idx) => {
							const isAnswer = question.answer_index === idx;
							const isWrong = currentWrongSet.has(idx);
							const isSolvedCorrect = isSolved && isAnswer;

							return (
								<button
									key={opt}
									type="button"
									onClick={() => handleSelect(idx)}
									disabled={isSolved || isWrong}
									className={clsx(
										"flex h-[80px] flex-1 cursor-pointer items-center justify-center rounded-[16px] border-2 font-bold text-[32px] transition-all",
										isSolvedCorrect
											? "border-[#359AFF] border-[3px] bg-[#359AFF] text-white"
											: isWrong
												? "border-[#E5E8EC] bg-gray-100 text-[#bbb] opacity-70"
												: "border-[#E5E8EC] bg-[#F9FAFC] text-[#7F848D]",
										(isSolved || isWrong) && "cursor-not-allowed",
									)}
								>
									{opt}
								</button>
							);
						})}
					</div>
				)}

				{/* Multiple choice */}
				{question.type === "choice" && (
					<div className="flex flex-col gap-[10px] pb-[20px]">
						{options.map((opt, idx) => {
							const isAnswer = question.answer_index === idx;
							const isWrong = currentWrongSet.has(idx);
							const isSolvedCorrect = isSolved && isAnswer;

							return (
								<button
									key={opt}
									type="button"
									onClick={() => handleSelect(idx)}
									disabled={isSolved || isWrong}
									className={clsx(
										"w-full cursor-pointer rounded-[12px] border-2 px-[16px] py-[14px] text-left transition-all",
										isSolvedCorrect
											? "border-[#359AFF] border-[3px] bg-[#E9F2FC]"
											: isWrong
												? "border-[#E5E8EC] bg-gray-100 opacity-70"
												: "border-[#E5E8EC] bg-[#F9FAFC]",
										(isSolved || isWrong) && "cursor-not-allowed",
									)}
								>
									<span
										className={clsx(
											"text-[15px]",
											isSolvedCorrect
												? "font-semibold text-[#359AFF]"
												: isWrong
													? "text-[#bbb]"
													: "text-[#383A3F]",
										)}
									>
										{opt}
									</span>
								</button>
							);
						})}
					</div>
				)}
			</div>

			{/* Footer */}
			<div className="sticky bottom-0 border-[#F6F7F8] border-t bg-white px-[16px] py-[12px]">
				<div className="flex items-center justify-between">
					<button
						type="button"
						onClick={handlePrev}
						disabled={!hasPrev}
						className={clsx(
							"flex size-[36px] items-center justify-center",
							hasPrev
								? "cursor-pointer text-[#0180FF]"
								: "cursor-default text-[#E5E8EC]",
						)}
					>
						<ChevronLeft className="size-[24px]" />
					</button>

					<div className="flex items-center gap-[4px]">
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

					{!hasNext ? (
						<button
							type="button"
							onClick={() => router.history.back()}
							disabled={
								questions.length === 0 ||
								!questions.every((q) => savedAnswers[q.id] !== undefined)
							}
							className={clsx(
								"flex h-[36px] items-center justify-center gap-[4px] rounded-full px-[14px] font-semibold text-[14px]",
								questions.length > 0 &&
									questions.every((q) => savedAnswers[q.id] !== undefined)
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
							className="flex size-[36px] cursor-pointer items-center justify-center text-[#0180FF]"
						>
							<ChevronRight className="size-[24px]" />
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
