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
	FailedScreen,
	FeedbackMessage,
	PrimaryButton,
	ProblemCard,
	WRONG_VISIBLE_MS,
} from "@/components/main/activity";
import { type InstructedItem, useInstruction } from "@/shared/data/instruction";
import blankQuestions from "@/shared/data/n4_blank_question.json";
import { useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
	Fragment,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
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
	const wrongResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
	/*
	 * 의존성을 건드리지 않는다. 원래 적혀 있던 [currentIndex, question?.id,
	 * savedAnswers] 그대로다.
	 *
	 * 한때 [question, savedAnswers] 로 좁혔다가 되돌렸다. "question 이 useMemo
	 * 배열의 원소라 currentIndex 가 바뀌면 question 도 바뀐다" 는 논리였는데,
	 * 그것이 참이려면 배열에 같은 객체가 두 번 들어가지 않는다는 보장이 필요하다.
	 * 그 보장을 코드로 확인할 방법이 없고, 틀리면 **문항을 넘겨도 저장한 답이
	 * 복원되지 않는다.** 답 복원은 학습자가 바로 알아차리는 동작이다.
	 *
	 * 이 저장소의 게이트(typecheck · parity · build)는 훅이 언제 다시 도는지를
	 * 검사하지 못한다. 검사로 잡히지 않는 동작 변경은 하지 않는 것이 맞다 —
	 * 린트를 맞추는 것보다 지금 도는 동작이 중요하다.
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: 지금 배열이 맞다 — 위 주석 참고
	useEffect(() => {
		if (question && savedAnswers[question.id]?.correct) {
			const saved = savedAnswers[question.id];
			setSelectedAnswer(saved.answer);
			setAnswerState("correct");
		} else {
			setSelectedAnswer(null);
			setAnswerState("idle");
		}
	}, [currentIndex, question?.id, savedAnswers]);

	useEffect(
		() => () => {
			if (wrongResetTimer.current) clearTimeout(wrongResetTimer.current);
		},
		[],
	);
	const totalSteps = questions.length;

	/** selections 파싱: 콤마로 분리 */
	const selections = useMemo(() => {
		if (!question) return [];
		return question.selections.split(",").map((s) => s.trim());
	}, [question]);

	/** 선택지 클릭 — 선택 즉시 채점 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: sound.* 는 useSoundEffects 가 매 렌더마다 새로 만드는 함수다. 넣으면 이 콜백이 매 렌더 새로 만들어져 메모가 사라진다
	const handleSelectAnswer = useCallback(
		(sel: string) => {
			if (answerState === "correct" || !question) return;
			if (wrongResetTimer.current) {
				clearTimeout(wrongResetTimer.current);
				wrongResetTimer.current = null;
			}
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
				wrongResetTimer.current = setTimeout(() => {
					setSelectedAnswer(null);
					setAnswerState("idle");
					wrongResetTimer.current = null;
				}, WRONG_VISIBLE_MS);
			}
		},
		[answerState, selectedAnswer, question, bookId, chapterSeq],
	);

	/** 선택한 답이 맞는지 */
	const isSelectionCorrect = selectedAnswer === question?.answer;

	/**
	 * 빈칸 표시: 원장에는 한 문장 안에 빈칸이 둘인 문항도 있다.
	 * 모든 `( )` 를 같은 밑줄로 바꾸고, `으면 … 을수록` 같은 복합 선택지는
	 * 말줄임표를 기준으로 나눠 각각의 빈칸에 넣는다.
	 */
	const questionParts = useMemo(() => {
		if (!question) return { segments: [""], completionFilled: "" };
		// 빈칸 패턴: "(     )" (5칸) 또는 "( )" (1칸)
		const segments = question.question.split(/\(\s*\)/);

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
			segments,
			completionBefore,
			completionFilled,
			completionAfter,
		};
	}, [question]);

	const selectedParts = useMemo(
		() => selectedAnswer?.split(/\s*…\s*/) ?? [],
		[selectedAnswer],
	);

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
			<FailedScreen
				lesson={chapterLabel}
				onExit={() => router.history.back()}
				onRetry={() => window.location.reload()}
			/>
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
							questionParts.segments.map((segment, index) => (
								<Fragment key={`${index}-${segment}`}>
									{segment}
									{index < questionParts.segments.length - 1 && (
										<b className={isSelectionCorrect ? "" : "miss"}>
											{selectedParts[index] ?? selectedAnswer}
										</b>
									)}
								</Fragment>
							))
						) : (
							questionParts.segments.map((segment, index) => (
								<Fragment key={`${index}-${segment}`}>
									{segment}
									{index < questionParts.segments.length - 1 && (
										<span className="blank-slot" />
									)}
								</Fragment>
							))
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
