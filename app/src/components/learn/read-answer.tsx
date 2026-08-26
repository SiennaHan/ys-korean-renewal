import { getLearningRecords, saveLearningRecord } from "@/api/learning-record";
import { useActivityState } from "@/hooks/use-activity-state";
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
	FailedScreen,
	FeedbackMessage,
	Passage,
	PrimaryButton,
	ProblemCard,
	QuestionText,
	ResultScreen,
} from "@/components/main/activity";
import { type InstructedItem, useInstruction } from "@/shared/data/instruction";
import readQuestions from "@/shared/data/n5_read_answer_questions.json";
import readTexts from "@/shared/data/n5_read_answer_text.json";
import { nextLessonActivity } from "@/shared/lesson-flow";
import { useNavigate, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/**
 * 읽기 — **표시만** 한다. 데이터·기록·이동은 아래 ReadAnswer 가 쥔다.
 * 가른 이유는 fill-blank.tsx 의 FillBlankView 주석과 같다(목업 대조).
 */
export function ReadAnswerView({
	lesson,
	onExit,
	onSkip,
	current,
	total,
	onJump,
	instruction,
	passage,
	question,
	/** "ox" 면 2열로 크게, 아니면 세로 목록 */
	type,
	options,
	/** 맞힌 보기. 없으면 아직 안 맞힌 것이다 */
	correctIndex,
	/** 지금까지 틀린 보기들 — 맞힐 때까지 다시 고르므로 여럿이다 */
	wrongIndexes,
	onSelect,
	primary,
}: {
	lesson: string;
	onExit?: () => void;
	onSkip?: () => void;
	current: number;
	total: number;
	onJump?: (index: number) => void;
	instruction: ReactNode;
	passage: string;
	question: string;
	type: "choice" | "ox";
	options: string[];
	correctIndex?: number | null;
	wrongIndexes?: number[];
	onSelect: (index: number) => void;
	primary: { label: string; on: boolean; onClick: () => void };
}) {
	const { t } = useTranslation();
	const wrong = new Set(wrongIndexes ?? []);
	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={onExit} onSkip={onSkip} />
			<ActivityProgress current={current} total={total} onJump={onJump} />

			<ActivityBody
				feedback={
					correctIndex != null ? (
						<FeedbackMessage kind="correct" />
					) : wrong.size > 0 ? (
						<FeedbackMessage kind="wrong" />
					) : null
				}
			>
				<ProblemCard instruction={instruction}>
					<Passage>{passage}</Passage>
				</ProblemCard>

				<div className="response-area">
					<QuestionText>{question}</QuestionText>
					{/* O/X 는 2열로 크게, 객관식은 세로 목록 */}
					<ChoiceList
						variant={type === "ox" ? "binary" : "list"}
						inResponseArea={false}
					>
						{options.map((opt, idx) => (
							<Choice
								key={opt}
								index={idx}
								action="rpick"
								state={
									correctIndex === idx
										? "correct"
										: wrong.has(idx)
											? "wrong"
											: ""
								}
								sub={
									type === "ox"
										? t(
												opt === "O"
													? "activity.oxSame"
													: "activity.oxDifferent",
											)
										: undefined
								}
								onClick={() => onSelect(idx)}
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
						label={primary.label}
						on={primary.on}
						action="next"
						onClick={primary.onClick}
					/>
				</Dock>
			</ActivityFooter>
		</ActivityFrame>
	);
}

export default function ReadAnswer({
	bookId,
	chapterSeq,
	chapterLabel,
}: ReadAnswerProps) {
	const router = useRouter();
	const navigate = useNavigate();
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

	/** 마지막 문항을 넘기면 결과 화면 */
	const [phase, setPhase] = useState<"solving" | "result">("solving");
	/** 다시 풀기로 좁힌 문항. null 이면 과 전체다 */
	const [retryOnly, setRetryOnly] = useState<number[] | null>(null);
	/**
	 * 헤더 → 로 넘긴 문항. shell_spec §23·§28 —
	 * 건너뛴 문항은 미응답이고 결과에서 미해결이다. 정답률 분모에서도 뺀다.
	 */
	const [skipped, setSkipped] = useState<number[]>([]);

	/** 해당 지문의 질문들 */
	const questions = useMemo(() => {
		const all = (readQuestions as ReadItem[])
			.filter((q) => textIds.includes(q.text_id))
			.sort((a, b) => a.seq - b.seq);
		// 결과 화면의 [다시 풀기] 는 "그 활동의 미해결 항목만" 이다(shell_spec §3.3)
		return retryOnly ? all.filter((q) => retryOnly.includes(q.id)) : all;
	}, [textIds, retryOnly]);

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
		});
	}, [bookId, chapterSeq]);
	/*
	 * 이어하기 위치는 **서버가 준다** — ko_activity_state.current_item_index.
	 * 전에는 여기서 정답 기록으로 유추했는데, 첫 시도만 기록하도록 서버를 고친 뒤
	 * 어긋났다(BLOCKERS §6-c-1). 정답률과 진행 위치는 다른 것이라 갈랐다.
	 */
	const { startIndex, saveProgress, complete } = useActivityState({
		bookId,
		chapterSeq,
		menuType: "read-answer",
		totalItems: questions.length || null,
		retry: retryOnly !== null,
	});

	/** 서버가 준 위치로 한 번만 옮긴다. null 은 "아직 모른다" 다 */
	const jumped = useRef(false);
	useEffect(() => {
		if (jumped.current || startIndex === null) return;
		jumped.current = true;
		if (startIndex > 0 && startIndex < questions.length) {
			setCurrentIndex(startIndex);
		}
	}, [startIndex, questions.length]);

	/** 위치가 바뀌면 알린다. ✕ 로 나가도 이 값이 이미 저장돼 있다 */
	useEffect(() => {
		saveProgress(currentIndex);
	}, [currentIndex, saveProgress]);

	/*
	 * 결과로 넘어갈 때 한 번 완료를 알린다. 세 수의 뜻은 dev_spec §2.1 —
	 * answered 는 응답 수, graded 는 채점 대상, correct 는 **첫 시도** 정답이다.
	 */
	const reported = useRef(false);
	useEffect(() => {
		if (phase !== "result" || reported.current) return;
		reported.current = true;
		// wrongAttempts 는 틀린 차례대로 담는 Set 이라 비어 있지 않으면 첫 시도 오답이다.
		// 결과 화면의 firstWrongOf 와 같은 판정인데 그쪽은 그 블록 안에만 있어서 여기서 다시 센다
		const wrongCount = questions.filter(
			(q) => (wrongAttempts[q.id]?.size ?? 0) > 0,
		).length;
		const skippedCount = questions.filter((q) => skipped.includes(q.id)).length;
		void complete({
			answeredCount: questions.length - skippedCount,
			gradedCount: questions.length - skippedCount,
			correctCount: questions.length - wrongCount - skippedCount,
		});
	}, [phase, questions, wrongAttempts, skipped, complete]);

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

	if (phase === "result") {
		// wrongAttempts 는 틀린 인덱스를 **넣은 차례대로** 담는 Set 이라
		// 첫 원소가 곧 첫 시도 오답이다. 따로 상태를 두지 않는다.
		const firstWrongOf = (id: number) => {
			const set = wrongAttempts[id];
			return !set || set.size === 0 ? null : [...set][0];
		};
		const pick = (q: ReadItem, idx: number) =>
			[q.selection1, q.selection2, q.selection3, q.selection4][idx] ?? "";
		const missed = questions.filter((q) => firstWrongOf(q.id) !== null);
		const wrongIds = missed.map((q) => q.id);
		// 건너뛴 것은 오답이 아니라 안 푼 것이다 — 정답 수에서도 분모에서도 뺀다
		const skippedIds = questions
			.filter((q) => skipped.includes(q.id))
			.map((q) => q.id);
		const unresolved = [...new Set([...wrongIds, ...skippedIds])];
		return (
			<ResultScreen
				lesson={chapterLabel}
				total={questions.length}
				answered={
					questions.filter((q) => savedAnswers[q.id] !== undefined).length
				}
				graded={questions.length - skippedIds.length}
				correct={questions.length - wrongIds.length - skippedIds.length}
				wrongs={missed.map((q) => ({
					picked: pick(q, firstWrongOf(q.id) as number),
					// 이 원장에는 해설이 없다 — 문법만 grammar_focus_revised 를 들고 온다.
					// 빈 칸을 그리느니 정답을 말해 준다(player.answerIs 는 이미 있는 문구다)
					explanation: t("player.answerIs", {
						answer: pick(q, q.answer_index),
					}),
				}))}
				onExit={() => router.history.back()}
				onRetry={
					unresolved.length > 0
						? () => {
								setSavedAnswers((prev) => {
									const next = { ...prev };
									for (const id of unresolved) delete next[id];
									return next;
								});
								setWrongAttempts({});
								setSkipped([]);
								setRetryOnly(unresolved);
								setCurrentIndex(0);
								setPhase("solving");
							}
						: undefined
				}
				onNext={() => {
					const next =
						bookId && chapterSeq
							? nextLessonActivity("read-answer", bookId, chapterSeq)
							: null;
					navigate(
						next
							? {
									to: next.route,
									search: { level: bookId, lesson: chapterSeq },
								}
							: { to: "/main/textbook" },
					);
				}}
			/>
		);
	}

	if (!question || !passage) {
		return (
			<FailedScreen
				lesson={chapterLabel}
				onExit={() => router.history.back()}
				onRetry={() => window.location.reload()}
			/>
		);
	}

	const allSolved =
		questions.length > 0 &&
		questions.every((q) => savedAnswers[q.id] !== undefined);

	return (
		<ReadAnswerView
			lesson={chapterLabel}
			onExit={() => router.history.back()}
			// shell_spec §23 — 헤더 → 는 상시 있다. "현재 문항을 넘긴다"
			onSkip={() => {
				setSkipped((prev) =>
					prev.includes(question.id) ? prev : [...prev, question.id],
				);
				if (hasNext) handleNext();
				else setPhase("result");
			}}
			current={currentIndex}
			total={totalSteps}
			onJump={setCurrentIndex}
			instruction={
				<>
					{instruction.ko}
					{instruction.translated && <p>{instruction.translated}</p>}
				</>
			}
			passage={passage.text}
			question={question.question}
			type={question.type}
			options={options}
			correctIndex={isSolved ? question.answer_index : null}
			wrongIndexes={[...currentWrongSet]}
			onSelect={handleSelect}
			primary={{
				label: hasNext ? t("player.next") : t("player.showResult"),
				on: hasNext ? isSolved : allSolved,
				onClick: hasNext ? handleNext : () => setPhase("result"),
			}}
		/>
	);
}
