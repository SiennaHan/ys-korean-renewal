import { getLearningRecords, saveLearningRecord } from "@/api/learning-record";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import {
	ActivityAppBar,
	ActivityBody,
	ActivityFooter,
	ActivityFrame,
	ActivityProgress,
	BlankCard,
	ChipOption,
	ChipWrap,
	Dock,
	FeedbackMessage,
	PrimaryButton,
	ProblemCard,
} from "@/components/main/activity";
import { useToast } from "@/components/toast/toast-context";
import { type InstructedItem, useInstruction } from "@/shared/data/instruction";
import blankQuestions from "@/shared/data/n4_blank_question.json";
import { useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface BlankQuestion {
	id: number;
	book_id: number;
	chapter: number;
	question: string;
	selections: string;
	answer: string;
	completion: string;
	grammar_focus: string;
	/**
	 * 학습자에게 보여 줄 해설. grammar_focus 는 저작용 기호식
	 * ("받침 O → -을까요 (먹 + 을까요)")이고 이쪽이 문장이다
	 * ("받침이 있어요. 먹+을까요"). dev_spec_v1 §16 이 이것을 쓰라고 한다.
	 * 836행 중 한 행(GF-7-7-003)만 비어 있어 그때는 기호식으로 돌아간다.
	 */
	grammar_focus_revised?: string;
}

/** 지시문은 원장이 문항마다 들고 온다 */
type BlankItem = BlankQuestion & InstructedItem;

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
	const { t } = useTranslation();
	const sound = useSoundEffects();
	const { addToast } = useToast();

	const questions = useMemo(() => {
		return (blankQuestions as BlankItem[]).filter(
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
			const firstUnsolved = questions.findIndex((q) => !map[q.id]?.correct);
			if (firstUnsolved > 0) {
				setCurrentIndex(firstUnsolved);
			}
		});
	}, [bookId, chapterSeq, questions]);

	const question = questions[currentIndex];
	const instruction = useInstruction(question, "activity.instrGrammar");

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

		return {
			before,
			after,
			completionBefore,
			completionFilled,
			completionAfter,
		};
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
			<ActivityFrame>
				<ActivityAppBar
					lesson={chapterLabel}
					onExit={() => router.history.back()}
				/>
				<ActivityBody>
					<div className="state-view">
						<p>{t("state.loadFailed")}</p>
					</div>
				</ActivityBody>
			</ActivityFrame>
		);
	}

	const solved = answerState === "correct";
	const allSolved =
		questions.length > 0 && questions.every((q) => savedAnswers[q.id]?.correct);

	return (
		<ActivityFrame>
			<ActivityAppBar
				lesson={chapterLabel}
				onExit={() => router.history.back()}
			/>
			<ActivityProgress
				current={currentIndex}
				total={totalSteps}
				onJump={setCurrentIndex}
			/>

			<ActivityBody
				feedback={
					answerState === "correct" ? (
						<FeedbackMessage kind="correct" />
					) : answerState === "wrong" ? (
						<FeedbackMessage kind="wrong" />
					) : null
				}
			>
				<ProblemCard
					instruction={
						<>
							{instruction.ko}
							{instruction.translated && <p>{instruction.translated}</p>}
						</>
					}
				>
					{/* 고른 어미가 문장에 들어간 모습을 그대로 보여 준다 */}
					<BlankCard>
						{solved ? (
							<>
								{questionParts.completionBefore}
								<b>{questionParts.completionFilled}</b>
								{questionParts.completionAfter}
							</>
						) : selectedAnswer ? (
							<>
								{questionParts.before}
								<b className={isSelectionCorrect ? "" : "miss"}>
									{selectedAnswer}
								</b>
								{questionParts.after}
							</>
						) : (
							<>
								{questionParts.before}
								<u>　</u>
								{questionParts.after}
							</>
						)}
					</BlankCard>
					{selectedAnswer && (
						<div className="grammar-note">
							{question.grammar_focus_revised?.trim() || question.grammar_focus}
						</div>
					)}
				</ProblemCard>

				<ChipWrap>
					{selections.map((sel) => {
						const chosen = selectedAnswer === sel;
						return (
							<ChipOption
								key={sel}
								value={sel}
								// 칩에는 목록형에 없는 중간 상태가 있다 — 고른 뒤 채점 전
								state={
									chosen
										? sel === question.answer
											? "ok"
											: answerState === "wrong"
												? "no"
												: "on"
										: ""
								}
								onClick={() => handleSelectAnswer(sel)}
							>
								{sel}
							</ChipOption>
						);
					})}
				</ChipWrap>
			</ActivityBody>

			<ActivityFooter>
				<Dock>
					<PrimaryButton
						label={hasNext ? t("player.next") : t("player.showResult")}
						on={hasNext ? solved : allSolved}
						action="next"
						onClick={hasNext ? handleNext : () => router.history.back()}
					/>
				</Dock>
			</ActivityFooter>
		</ActivityFrame>
	);
}
