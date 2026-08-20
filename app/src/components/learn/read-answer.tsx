import { getLearningRecords, saveLearningRecord } from "@/api/learning-record";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import {
	ActivityAppBar,
	ActivityBody,
	ActivityFooter,
	ActivityFrame,
	ActivityProgress,
	Choice,
	ChoiceList,
	Dock,
	FeedbackMessage,
	Passage,
	PrimaryButton,
	ProblemCard,
	QuestionText,
} from "@/components/main/activity";
import { useToast } from "@/components/toast/toast-context";
import { type InstructedItem, useInstruction } from "@/shared/data/instruction";
import readQuestions from "@/shared/data/n5_read_answer_questions.json";
import readTexts from "@/shared/data/n5_read_answer_text.json";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

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
	const { t } = useTranslation();
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

	const allSolved =
		questions.length > 0 &&
		questions.every((q) => savedAnswers[q.id] !== undefined);

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
					isSolved ? (
						<FeedbackMessage kind="correct" />
					) : currentWrongSet.size > 0 ? (
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
					<Passage>{passage.text}</Passage>
				</ProblemCard>

				<div className="response-area">
					<QuestionText>{question.question}</QuestionText>
					{/* O/X 는 2열로 크게, 객관식은 세로 목록 */}
					<ChoiceList
						variant={question.type === "ox" ? "binary" : "list"}
						inResponseArea={false}
					>
						{options.map((opt, idx) => (
							<Choice
								key={opt}
								index={idx}
								action="rpick"
								// 맞을 때까지 다시 고를 수 있는 화면이라 틀린 것이 여럿 남는다
								state={
									isSolved && idx === question.answer_index
										? "correct"
										: currentWrongSet.has(idx)
											? "wrong"
											: ""
								}
								sub={
									question.type === "ox"
										? t(
												opt === "O"
													? "activity.oxSame"
													: "activity.oxDifferent",
											)
										: undefined
								}
								onClick={() => handleSelect(idx)}
							>
								{opt}
							</Choice>
						))}
					</ChoiceList>
				</div>
			</ActivityBody>

			<ActivityFooter>
				<Dock>
					<PrimaryButton
						label={hasNext ? t("player.next") : t("player.showResult")}
						on={hasNext ? isSolved : allSolved}
						action="next"
						onClick={hasNext ? handleNext : () => router.history.back()}
					/>
				</Dock>
			</ActivityFooter>
		</ActivityFrame>
	);
}
