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

	// biome-ignore lint/correctness/useExhaustiveDependencies: sound.* 는 useSoundEffects 가 매 렌더마다 새로 만드는 함수다. 넣으면 이 콜백이 매 렌더 새로 만들어져 메모가 사라진다
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
					setSelectedAnswer(idx);
					setSavedAnswers((prev) => ({ ...prev, [question.id]: idx }));
				} else {
					sound.playIncorrect();
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
