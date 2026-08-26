import type { LearningRecord } from "@/api/apiType";
import { getListenAudio } from "@/api/chat";
import { getLearningRecords, saveLearningRecord } from "@/api/learning-record";
import { useActivityState } from "@/hooks/use-activity-state";
import { useSharedAudio } from "@/components/audio/audio-provider";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import {
	ActivityAppBar,
	ActivityBody,
	ActivityFooter,
	ActivityFrame,
	ActivityProgress,
	AudioRow,
	Choice,
	ChoiceList,
	Dock,
	FailedScreen,
	FeedbackMessage,
	ListenCopy,
	PrimaryButton,
	ProblemCard,
	QuestionText,
	ResultScreen,
} from "@/components/main/activity";
import { useInstruction } from "@/shared/data/instruction";
import {
	type ListenQuestion,
	getListenQuestions,
	getQuestionImagePath,
	getScriptLines,
} from "@/shared/data/listen-answer";
import { nextLessonActivity } from "@/shared/lesson-flow";
import { useNavigate, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface ListenAnswerProps {
	bookId?: number;
	chapter?: number;
	chapterSeq?: number;
	chapterLabel: string;
}

/**
 * 듣기 — **표시만** 한다. 오디오·기록·이동은 아래 ListenAnswer 가 쥔다.
 * 가른 이유는 fill-blank.tsx 의 FillBlankView 주석과 같다(목업 대조).
 */
export function ListenAnswerView({
	lesson,
	onExit,
	onSkip,
	current,
	total,
	onJump,
	instruction,
	/** "ox" 는 판단할 문장을 카드 안에 크게, 나머지는 선택지 위에 질문으로 */
	type,
	question,
	audioSub,
	onPlay,
	options,
	correctIndex,
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
	type: "choice" | "ox" | "image";
	question: string;
	audioSub?: string;
	onPlay?: () => void;
	options: { index: number; text: string; image?: ReactNode }[];
	correctIndex?: number | null;
	wrongIndexes?: number[];
	onSelect: (index: number) => void;
	primary: { label: string; on: boolean; onClick: () => void };
}) {
	const { t } = useTranslation();
	const wrong = new Set(wrongIndexes ?? []);
	const isOx = type === "ox";
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
					{/* O/X 가 판단할 문장. 들은 것이 아니라 제시된 것이다 —
					    들은 것은 오디오뿐이고 이 글자는 맞는지 가릴 대상이다.
					    카드 안에서 가장 큰 글자가 된다. 객관식은 질문이 따로 있으므로
					    선택지 위로 뺀다 */}
					{isOx && (
						<ListenCopy
							label={t("activity.statementLabel")}
							statement={question}
						/>
					)}
					<div className="listen-stimulus">
						<AudioRow
							label={t("activity.playSentence")}
							sub={audioSub ?? t("activity.audioSub")}
							onPlay={onPlay}
						/>
					</div>
				</ProblemCard>

				<div className="response-area listen-response">
					{!isOx && <QuestionText>{question}</QuestionText>}
					<ChoiceList
						variant={type === "image" ? "image" : isOx ? "binary" : "list"}
						inResponseArea={false}
					>
						{options.map((opt) => (
							<Choice
								key={opt.index}
								index={opt.index}
								state={
									correctIndex === opt.index
										? "correct"
										: wrong.has(opt.index)
											? "wrong"
											: ""
								}
								sub={
									isOx
										? t(
												opt.text === "O"
													? "activity.oxSame"
													: "activity.oxDifferent",
											)
										: undefined
								}
								onClick={() => onSelect(opt.index)}
							>
								{opt.image ?? opt.text}
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

export default function ListenAnswer({
	bookId,
	chapter,
	chapterSeq,
	chapterLabel,
}: ListenAnswerProps) {
	const router = useRouter();
	const navigate = useNavigate();
	const { t } = useTranslation();
	const sharedAudio = useSharedAudio();
	const sound = useSoundEffects();

	/** 페이지 이탈 시 음원 중단 */
	useEffect(() => {
		return () => sharedAudio.stop();
	}, [sharedAudio]);

	/** 마지막 문항을 넘기면 결과 화면 */
	const [phase, setPhase] = useState<"solving" | "result">("solving");
	/** 다시 풀기로 좁힌 문항. null 이면 과 전체다 */
	const [retryOnly, setRetryOnly] = useState<number[] | null>(null);
	/** 헤더 → 로 넘긴 문항 — shell_spec §23·§28 */
	const [skipped, setSkipped] = useState<number[]>([]);

	const questions = useMemo(() => {
		const all =
			bookId && chapterSeq ? getListenQuestions(bookId, chapterSeq) : [];
		// 결과 화면의 [다시 풀기] 는 "그 활동의 미해결 항목만" 이다(shell_spec §3.3)
		return retryOnly ? all.filter((q) => retryOnly.includes(q.id)) : all;
	}, [bookId, chapterSeq, retryOnly]);

	const [currentIndex, setCurrentIndex] = useState(0);
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	/** questionId → 발화 라인 음성 URL 배열. 문제별 캐싱으로 재요청 방지 */
	const [audioUrls, setAudioUrls] = useState<Record<number, string[]>>({});
	/** 재생 세션 id — 새 재생이 시작되면 이전 handlePlay의 스피너 정리를 무시 */
	const playSeqRef = useRef(0);
	/** questionId → 정답 인덱스 (정답 맞힌 경우만) */
	const [savedAnswers, setSavedAnswers] = useState<Record<number, number>>({});
	/** questionId → 틀린 인덱스 목록 */
	const [wrongAttempts, setWrongAttempts] = useState<
		Record<number, Set<number>>
	>({});

	/** Fetch existing records on mount — 정답만 복원 + 첫 미풀이 문제로 이동 */
	useEffect(() => {
		if (!bookId || !chapterSeq) return;
		getLearningRecords(bookId, chapterSeq, "listen-answer").then((records) => {
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
		menuType: "listen-answer",
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

	const question = questions[currentIndex] as ListenQuestion | undefined;
	const instruction = useInstruction(question, "activity.instrListen");

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
			setSelectedIndex(savedAnswers[question.id]);
		} else {
			setSelectedIndex(null);
		}
	}, [currentIndex, question?.id, savedAnswers]);

	/** 현재 문제의 틀린 시도 목록 */
	const currentWrongSet = question
		? (wrongAttempts[question.id] ?? new Set<number>())
		: new Set<number>();
	/** 현재 문제 정답 맞힘 여부 */
	const isSolved = question ? savedAnswers[question.id] !== undefined : false;
	const totalSteps = questions.length;

	/** 선택지 배열 생성 */
	const selections = useMemo(() => {
		if (!question) return [];
		return [
			{
				text: question.selection1,
				image: question.selection1_image,
				originalIndex: 0,
			},
			{
				text: question.selection2,
				image: question.selection2_image,
				originalIndex: 1,
			},
			{
				text: question.selection3,
				image: question.selection3_image,
				originalIndex: 2,
			},
			{
				text: question.selection4,
				image: question.selection4_image,
				originalIndex: 3,
			},
		].filter(
			(sel) =>
				(sel.text && sel.text.trim() !== "") ||
				(sel.image && sel.image.trim() !== ""),
		);
	}, [question]);

	/** 듣기 → 서버가 생성·캐싱한 발화 라인 음성 URL을 provider 시퀀스로 순차 재생.
	 *  문제 이동/화면 이탈 시 sharedAudio.stop() 이 시퀀스 전체를 취소한다. */
	const handlePlay = useCallback(async () => {
		if (!question) return;
		const myId = ++playSeqRef.current;
		sharedAudio.stop();
		setIsPlaying(true);
		try {
			let urls = audioUrls[question.id];
			if (!urls) {
				const lines = getScriptLines(question.script_id).map((line) => ({
					text: line.text,
					speaker: line.speaker,
					voice: line.voice,
				}));
				const fetched = await getListenAudio(lines);
				if (!fetched) return;
				urls = fetched;
				setAudioUrls((prev) => ({ ...prev, [question.id]: fetched }));
			}
			await sharedAudio.playUrls(urls);
		} finally {
			// 새 재생이 시작됐다면(더 큰 myId) 스피너 상태를 건드리지 않음
			if (playSeqRef.current === myId) setIsPlaying(false);
		}
	}, [question, sharedAudio, audioUrls]);

	/** 페이지 전환 시 재생 중단 + 자동 재생 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: auto-play on question change
	useEffect(() => {
		sharedAudio.stop();
		setIsPlaying(false);
		if (question) {
			handlePlay();
		}
	}, [currentIndex, question?.id]);

	const handlePrev = () => {
		if (currentIndex > 0) {
			setCurrentIndex(currentIndex - 1);
		}
	};

	const handleNext = () => {
		if (currentIndex < totalSteps - 1) {
			setCurrentIndex(currentIndex + 1);
		}
	};

	const handleSelect = (idx: number) => {
		if (isSolved) return;
		if (currentWrongSet.has(idx)) return;

		sound.playClick();

		if (bookId && chapterSeq && question) {
			const isCorrect = idx === question.answer_index;
			saveLearningRecord({
				bookId,
				chapterSeq,
				menuType: "listen-answer",
				questionId: question.id,
				selectedAnswer: String(idx),
				isCorrect,
			});

			if (isCorrect) {
				sound.playCorrect();
				setSelectedIndex(idx);
				setSavedAnswers((prev) => ({ ...prev, [question.id]: idx }));
			} else {
				sound.playIncorrect();
				setWrongAttempts((prev) => ({
					...prev,
					[question.id]: new Set(prev[question.id]).add(idx),
				}));
			}
		}
	};

	if (phase === "result") {
		// wrongAttempts 는 틀린 인덱스를 넣은 차례대로 담는 Set 이라 첫 원소가 첫 시도 오답이다
		const firstWrongOf = (id: number) => {
			const set = wrongAttempts[id];
			return !set || set.size === 0 ? null : [...set][0];
		};
		const pick = (q: ListenQuestion, idx: number) =>
			[q.selection1, q.selection2, q.selection3, q.selection4][idx] ?? "";
		const missed = questions.filter((q) => firstWrongOf(q.id) !== null);
		const wrongIds = missed.map((q) => q.id);
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
					// 이 원장에는 해설이 없다 — 빈 칸을 그리느니 정답을 말해 준다
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
							? nextLessonActivity("listen-answer", bookId, chapterSeq)
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

	if (!question) {
		return (
			<FailedScreen
				lesson={chapterLabel}
				onExit={() => router.history.back()}
				onRetry={() => window.location.reload()}
			/>
		);
	}

	const isImageType = question.type === "image";
	const isOxType = question.type === "ox";

	return (
		<ListenAnswerView
			lesson={chapterLabel}
			onExit={() => router.history.back()}
			// shell_spec §23 — 헤더 → 는 상시 있다. "현재 문항을 넘긴다"
			onSkip={() => {
				setSkipped((prev) =>
					prev.includes(question.id) ? prev : [...prev, question.id],
				);
				if (currentIndex < totalSteps - 1) handleNext();
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
			type={question.type}
			question={question.question}
			audioSub={isPlaying ? t("state.audioPreparing") : undefined}
			onPlay={handlePlay}
			options={selections.map((sel) => ({
				index: sel.originalIndex,
				text: sel.text,
				image: isImageType ? (
					<img
						src={getQuestionImagePath(bookId ?? 1, sel.image)}
						alt={sel.text || ""}
					/>
				) : undefined,
			}))}
			correctIndex={isSolved ? question.answer_index : null}
			wrongIndexes={[...currentWrongSet]}
			onSelect={handleSelect}
			primary={{
				label:
					currentIndex < totalSteps - 1
						? t("player.next")
						: t("player.showResult"),
				on:
					currentIndex < totalSteps - 1
						? isSolved
						: questions.length > 0 &&
							questions.every((q) => savedAnswers[q.id] !== undefined),
				onClick:
					currentIndex < totalSteps - 1 ? handleNext : () => setPhase("result"),
			}}
		/>
	);
}
