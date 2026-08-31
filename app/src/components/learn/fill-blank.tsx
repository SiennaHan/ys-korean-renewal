import { getLearningRecords, saveLearningRecord } from "@/api/learning-record";
import { getActivityReviewQueue } from "@/api/review-queue";
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
	LoadingScreen,
	PrimaryButton,
	ProblemCard,
	ResultScreen,
	WRONG_VISIBLE_MS,
} from "@/components/main/activity";
import { useActivityState } from "@/hooks/use-activity-state";
import {
	rowsOf,
	useChapterContent,
} from "@/shared/content/use-chapter-content";
import { type InstructedItem, useInstruction } from "@/shared/data/instruction";
import { nextLessonActivity } from "@/shared/lesson-flow";
import { useManifest } from "@/shared/store/manifest-store";
import { Navigate, useNavigate, useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ReactNode } from "react";
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
	/** 홈의 다시 풀기 카드로 들어왔나. 큐에 있는 문항만 낸다 */
	review?: boolean;
}

type AnswerState = "idle" | "selected" | "correct" | "wrong";

/**
 * 빈칸 채우기 — **표시만** 한다. 데이터·기록·이동은 아래 FillBlank 가 쥔다.
 *
 * 왜 갈랐나 — 목업 대조(`activity-parity.tsx`)가 제품이 실제로 그리는 조합을
 * 검사하지 못했다. 제품 컴포넌트가 원장을 스스로 읽어서 목업의 표본 값을
 * 넣을 수 없었고, 그래서 대조는 부품으로 화면을 **손으로 다시 조립**하고 있었다.
 * 홈이 먼저 같은 이유로 HomeView/HomeContent 로 갈렸다(224fdd4).
 */
export function FillBlankView({
	lesson,
	onExit,
	onSkip,
	current,
	total,
	onJump,
	instruction,
	answerState,
	/** 맞힌 뒤 완성된 문장. 없으면 아래 segments 로 그린다 */
	completion,
	/** 문장 조각. 조각 사이가 빈칸이다 */
	segments,
	/** 빈칸에 들어갈 글자. null 이면 빈 칸을 그린다 */
	fills,
	/** 고른 답이 오답이라 빨갛게 보여 줄 때 */
	fillMissed,
	grammarNote,
	selections,
	answer,
	selectedAnswer,
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
	answerState: AnswerState;
	completion?: {
		before?: string;
		filled: string;
		after?: string;
	} | null;
	segments: string[];
	fills?: (string | undefined)[] | null;
	fillMissed?: boolean;
	grammarNote?: string | null;
	selections: string[];
	answer: string;
	selectedAnswer: string | null;
	onSelect: (value: string) => void;
	primary: { label: string; on: boolean; onClick: () => void };
}) {
	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={onExit} onSkip={onSkip} />
			<ActivityProgress current={current} total={total} onJump={onJump} />

			<ActivityBody
				feedback={
					answerState === "correct" ? (
						<FeedbackMessage kind="correct" />
					) : answerState === "wrong" ? (
						<FeedbackMessage kind="wrong" />
					) : null
				}
			>
				<ProblemCard instruction={instruction}>
					{/* 고른 어미가 문장에 들어간 모습을 그대로 보여 준다 */}
					<BlankCard>
						{completion ? (
							<>
								{completion.before}
								<b>{completion.filled}</b>
								{completion.after}
							</>
						) : (
							segments.map((segment, index) => (
								<Fragment key={`${index}-${segment}`}>
									{segment}
									{index < segments.length - 1 &&
										(fills ? (
											<b className={fillMissed ? "miss" : ""}>
												{fills[index] ?? selectedAnswer}
											</b>
										) : (
											<span className="blank-slot" />
										))}
								</Fragment>
							))
						)}
					</BlankCard>
					{grammarNote && <div className="grammar-note">{grammarNote}</div>}
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
										? sel === answer
											? "ok"
											: answerState === "wrong"
												? "no"
												: "on"
										: ""
								}
								onClick={() => onSelect(sel)}
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

export default function FillBlank({
	bookId,
	chapterSeq,
	chapterLabel,
	review,
}: FillBlankProps) {
	const router = useRouter();
	const navigate = useNavigate();
	/** 다음 활동이 있는지 — 서버 매니페스트가 답한다(DEV-05) */
	const { counts: manifestCounts } = useManifest();
	const { t } = useTranslation();
	const sound = useSoundEffects();

	/** 다시 풀기로 좁힌 문항. null 이면 과 전체다 */
	const [retryOnly, setRetryOnly] = useState<number[] | null>(null);

	/*
	 * 홈의 다시 풀기로 들어왔으면 큐에 있는 문항만 낸다.
	 *
	 * 결과 화면의 [다시 풀기] 와 **같은 길**이다 — retryOnly 를 채우는 주체만 다르다.
	 * 그래서 복습을 위한 새 화면이 없다(BLOCKERS §9-a-1).
	 *
	 * 큐가 비어 있으면(다른 기기에서 이미 다 풀었다든가) 손대지 않는다 —
	 * retryOnly 가 빈 배열이면 문항이 0개인 화면이 된다.
	 */
	/**
	 * **문항은 서버에서 온다**(2026-08-31 · DEV-05). 전에는 번들의 원장을 걸렀다.
	 *
	 * 훅이 캐시·잠금·실패를 쥔다. 응답이 JSON 시절과 **같은 모양**이라
	 * 아래 거르는 규칙은 그대로다 — 서버가 `chapter`·`id` 로 되돌려 낸다.
	 */
	const { bundle, state: contentState } = useChapterContent(
		bookId,
		chapterSeq,
		"fill-blank",
	);
	const questions = useMemo(() => {
		const all = rowsOf<BlankItem>(bundle, "questions");
		// 결과 화면의 [다시 풀기] 는 "그 활동의 미해결 항목만" 이다(shell_spec §3.3)
		return retryOnly ? all.filter((q) => retryOnly.includes(q.id)) : all;
	}, [bundle, retryOnly]);

	const [currentIndex, setCurrentIndex] = useState(0);
	const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
	const [answerState, setAnswerState] = useState<AnswerState>("idle");
	/** 마지막 문항을 넘기면 결과 화면. 미션대화가 브리핑·대화·리포트를 넘기는 것과 같은 꼴이다 */
	const [phase, setPhase] = useState<"solving" | "result">("solving");
	/**
	 * 첫 시도에 틀린 문항 → 그때 고른 답.
	 *
	 * 결과 화면의 오답 목록이 이걸 쓴다. 서버로도 보내지만(아래) 다시 읽어 오지는
	 * 않는다 — `getLearningRecords` 를 받는 자리가 `is_correct` 인 것만 복원한다.
	 * 그래서 **새로고침하면 이 목록이 빈다.** BLOCKERS §9-c 에 적었다.
	 */
	const [firstWrong, setFirstWrong] = useState<Record<number, string>>({});
	/** 이미 한 번 답한 문항 — "첫 시도" 를 가리려고 둔다 */
	const tried = useRef<Set<number>>(new Set());
	/**
	 * 헤더 → 로 넘긴 문항. shell_spec §23·§28 —
	 * 건너뛴 문항은 진행바에서 미응답이고 결과에서 **미해결**이다.
	 * 정답률에도 넣지 않는다(분모에서 뺀다).
	 */
	const [skipped, setSkipped] = useState<number[]>([]);
	const wrongResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	/** questionId → { selectedAnswer, isCorrect } from server */
	const [savedAnswers, setSavedAnswers] = useState<
		Record<number, { answer: string; correct: boolean }>
	>({});

	/*
	 * 이어하기 위치는 **서버가 준다** — ko_activity_state.current_item_index.
	 *
	 * 전에는 여기서 `findIndex(q => !map[q.id]?.correct)` 로 유추했다. 첫 시도만
	 * 기록하도록 서버를 고친 뒤 그 유추가 어긋났다 — 재시도로 맞힌 문항이 영원히
	 * "안 푼 것" 으로 남아 새로고침마다 그리로 되돌아갔다(BLOCKERS §6-c-1).
	 * 정답률과 진행 위치는 다른 것이라 갈랐다.
	 */
	const seeded = useRef(false);
	useEffect(() => {
		if (seeded.current || !review || !bookId || !chapterSeq) return;
		// questions 는 retryOnly 가 null 인 지금 **과 전체**다 — 그래서 여기서 걸러야 한다
		if (questions.length === 0) return;
		seeded.current = true;
		let alive = true;
		getActivityReviewQueue({ bookId, chapterSeq, menuType: "fill-blank" }).then(
			(q) => {
				if (!alive) return;
				/*
				 * **콘텐츠에 없는 문항은 버린다** (dev_spec §2.3 "콘텐츠 삭제 대응").
				 * 큐는 서버에 있고 문항은 프런트 번들에 있어서, 콘텐츠가 바뀌면 큐에
				 * 없는 id 가 남는다. 걸러 내지 않으면 문항 0개인 화면이 되어
				 * "활동을 불러오지 못했어요" 가 뜬다 — 실제로 그렇게 나왔다.
				 * 하나도 안 남으면 손대지 않는다 — 과 전체로 여는 것이 낫다.
				 */
				const valid = new Set(questions.map((x) => x.id));
				const ids = q.items
					.map((it) => it.questionId)
					.filter((id) => valid.has(id));
				if (ids.length > 0) setRetryOnly(ids);
			},
		);
		return () => {
			alive = false;
		};
	}, [review, bookId, chapterSeq, questions]);

	const { startIndex, saveProgress, complete } = useActivityState({
		bookId,
		chapterSeq,
		menuType: "fill-blank",
		totalItems: questions.length || null,
		retry: retryOnly !== null,
	});

	/** 지난 답 복원 — 위치가 아니라 **답**만 쓴다 */
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
		});
	}, [bookId, chapterSeq]);

	/** 서버가 준 위치로 한 번만 옮긴다. null 은 "아직 모른다" 다 */
	const jumped = useRef(false);
	useEffect(() => {
		if (jumped.current || startIndex === null) return;
		jumped.current = true;
		if (startIndex > 0 && startIndex < questions.length) {
			setCurrentIndex(startIndex);
		}
	}, [startIndex, questions.length]);

	/** 문항이 바뀌면 알린다. ✕ 로 나가도 이 값이 이미 저장돼 있다 */
	useEffect(() => {
		saveProgress(currentIndex);
	}, [currentIndex, saveProgress]);

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

			const isFirstTry = !tried.current.has(question.id);
			tried.current.add(question.id);

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
						review,
					});
					setSavedAnswers((prev) => ({
						...prev,
						[question.id]: { answer: sel, correct: true },
					}));
				}
			} else {
				setAnswerState("wrong");
				sound.playIncorrect();
				if (isFirstTry) {
					setFirstWrong((prev) => ({ ...prev, [question.id]: sel }));
					// 형제 셋(읽기·듣기·어휘)은 오답도 보내는데 이 화면만 안 보내고 있었다.
					// dev_spec §2.1·§16 은 첫 시도 오답을 남기라고 한다 — 복습 큐가 그걸로 찬다.
					// 서버가 첫 행을 덮지 않게 고쳐졌으므로(7f8d63d) 이제 그대로 남는다.
					if (bookId && chapterSeq) {
						saveLearningRecord({
							bookId,
							chapterSeq,
							menuType: "fill-blank",
							questionId: question.id,
							selectedAnswer: sel,
							isCorrect: false,
							review,
						});
					}
				}
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

	/*
	 * 결과 화면으로 넘어갈 때 한 번 완료를 알린다.
	 *
	 * 세 수의 뜻은 dev_spec §2.1 에 있다 — answered 는 응답한 수(정오답 무관),
	 * graded 는 채점 대상(건너뛴 것은 뺀다), correct 는 **첫 시도** 정답이다.
	 * 건너뛴 문항은 오답이 아니라 안 푼 것이므로 분자·분모에서 모두 뺀다.
	 *
	 * 서버가 ko_learning_record 로 다시 셀 수도 있지만 그러면 건너뜀을 알 수 없다 —
	 * 그 표에는 남지 않기 때문이다. 그래서 화면이 세어 보낸다.
	 */
	/*
	 * **한 번만 보내면 안 된다.** 건너뛴 문항이 남으면 서버가 완료로 치지 않고
	 * `in_progress` 로 둔다(`repo_activity_state.complete` · shell_spec §1).
	 * 학습자가 [다시 풀기]나 진행바로 돌아가 그것을 풀면 **그때 완료가 되어야
	 * 한다**(시나리오 14). `reported` 불리언 하나로 막으면 돌아가 풀어도 다시
	 * 안 보내서 **영원히 미완료**다 — 완료 기준을 바꾸면서 생긴 구멍이고,
	 * 자모 쪽(`use-jamo-activity-state`)이 먼저 같은 자리를 밟았다.
	 *
	 * 그래서 보낸 **값**을 기억한다. 수가 달라지면 다시 보내고 같으면 안 보낸다.
	 */
	const sentSig = useRef<string | null>(null);
	useEffect(() => {
		if (phase !== "result") return;
		const wrongCount = questions.filter((q) => firstWrong[q.id]).length;
		const skippedCount = questions.filter((q) => skipped.includes(q.id)).length;
		const answeredCount = questions.length - skippedCount;
		const correctCount = questions.length - wrongCount - skippedCount;
		const sig = `${answeredCount}/${correctCount}`;
		if (sentSig.current === sig) return;
		sentSig.current = sig;
		void complete({
			answeredCount,
			gradedCount: answeredCount,
			correctCount,
		});
	}, [phase, questions, firstWrong, skipped, complete]);

	if (phase === "result") {
		const wrongIds = questions.filter((q) => firstWrong[q.id]).map((q) => q.id);
		// 건너뛴 것은 오답이 아니라 **안 푼 것**이다 — 정답 수에서도 분모에서도 뺀다
		const skippedIds = questions
			.filter((q) => skipped.includes(q.id))
			.map((q) => q.id);
		const unresolved = [...new Set([...wrongIds, ...skippedIds])];
		return (
			<ResultScreen
				lesson={chapterLabel}
				total={questions.length}
				answered={questions.filter((q) => savedAnswers[q.id]?.correct).length}
				graded={questions.length - skippedIds.length}
				correct={questions.length - wrongIds.length - skippedIds.length}
				/*
				 * **미해결을 다 보여 준다** — 오답과 건너뜀 둘 다(§28).
				 * 전에는 오답만 넘겨서 **건너뛴 문항이 결과에 아예 안 보였다.**
				 * [다시 풀기] 는 그것을 포함해 돌려주는데 목록에는 없으니,
				 * 무엇을 다시 푸는지 알 수 없었다.
				 */
				wrongs={questions
					.filter((q) => unresolved.includes(q.id))
					.map((q) => ({
						kind: firstWrong[q.id] ? ("wrong" as const) : ("skipped" as const),
						picked: firstWrong[q.id] ?? "",
						// 저작용 기호식(grammar_focus)이 아니라 문장 쪽을 쓴다 — 위 타입 주석 참고.
						// 836행 중 한 행만 비어 있어 그때만 기호식으로 돌아간다
						explanation: q.grammar_focus_revised || q.grammar_focus,
					}))}
				onExit={() => router.history.back()}
				onRetry={
					unresolved.length > 0
						? () => {
								// 틀렸던 문항만 다시. 그 문항의 정답 기록을 지워야 다시 풀린다
								setSavedAnswers((prev) => {
									const next = { ...prev };
									for (const id of unresolved) delete next[id];
									return next;
								});
								setFirstWrong({});
								for (const id of unresolved) tried.current.delete(id);
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
							? nextLessonActivity(
									manifestCounts,
									"fill-blank",
									bookId,
									chapterSeq,
								)
							: null;
					// 과의 마지막 활동이면 갈 다음이 없다 — 목업 정본이 이 버튼을
					// 늘 켜 두고 그리므로, 눌러도 아무 일 없는 버튼을 만들지 않으려고
					// 과 목록으로 보낸다
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

	/**
	 * 콘텐츠가 서버에서 오면서 생긴 세 갈래(2026-08-31 · DEV-05).
	 *
	 * **`locked` 와 `failed` 를 가른다** — 사용자에게 할 말이 다르다. 잠긴 것은
	 * 구독을 권할 자리고, 실패는 다시 시도를 권할 자리다. 뭉뚱그리면 둘 다 틀린
	 * 말을 한다. 잠김은 사실 여기까지 오기 전에 목록 화면이 막지만, **주소를
	 * 직접 치면 여기로 온다** — 그래서 화면에도 갈래가 있어야 한다.
	 */
	if (contentState === "loading") {
		return (
			<LoadingScreen
				lesson={chapterLabel}
				current={0}
				total={0}
				onExit={() => router.history.back()}
			/>
		);
	}
	/*
	 * **잠긴 과는 결제 안내로 보낸다.** 목록 화면이 자물쇠를 그리지만 주소를 직접
	 * 치면 그 목록을 거치지 않는다 — 게임이 `GameGate` 로 같은 자리를 막는 것과
	 * 같은 사정이다. 「인터넷을 확인하세요」로 뭉뚱그리면 구독하면 열린다는 것을
	 * 알 길이 없다.
	 */
	if (contentState === "locked") {
		/*
		 * **결제 안내를 여기서 그리지 않는다.** `PaywallPanel` 의 스타일이
		 * `nav.css` 안에서 `.nav-frame` 아래에만 정의돼 있는데(95~115행)
		 * `/learn/*` 은 그 껍데기 밖이라 **글자만 남는다** — 실제로 그렇게 떴다.
		 *
		 * 자물쇠가 사는 곳은 교재 목록이다. 거기로 돌려보내면 이미 있는 잠금 UI 가
		 * 제 모양으로 뜬다. 게임은 `GameGate` 가 `.nav-frame` 안이라 직접 그릴 수 있다.
		 */
		return <Navigate to="/main/textbook" replace />;
	}
	if (contentState === "failed" || !question) {
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
		<FillBlankView
			lesson={chapterLabel}
			onExit={() => router.history.back()}
			// shell_spec §23 — 헤더 → 는 상시 있다. "현재 문항을 넘긴다"
			onSkip={() => {
				setSkipped((prev) =>
					prev.includes(question.id) ? prev : [...prev, question.id],
				);
				/*
				 * 건너뛴 문항을 **다시 풀기에 예약한다** (기획 확정 2026-08-27).
				 *
				 * 전에는 이 배열이 화면 안에만 있어서, 결과 화면의 [다시 풀기] 는
				 * 건너뛴 것을 가리켰지만 **그 화면을 벗어나면 사라졌다** — 다음날
				 * 홈의 「다시 풀 문항」에는 오답만 떴다. `skipped: true` 를 실으면
				 * 서버가 `reason='skipped'` 로 예약한다.
				 *
				 * **오답과 같이 내일부터 보인다**(`nextKstMidnightUtc`) — 안 푼 것이니
				 * 오늘 바로 내보낼 수도 있었지만 두 갈래로 갈리면 복잡해서 같게 뒀다.
				 *
				 * 서버는 건너뜀에 **학습 기록 행을 만들지 않는다** — 만들면
				 * 전체 진행률이 건너뛰기만으로 오른다(`business/learning_record.py`).
				 */
				if (bookId && chapterSeq) {
					saveLearningRecord({
						bookId,
						chapterSeq,
						menuType: "fill-blank",
						questionId: question.id,
						selectedAnswer: "",
						isCorrect: false,
						skipped: true,
						review,
					});
				}
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
			answerState={answerState}
			completion={
				solved
					? {
							before: questionParts.completionBefore,
							filled: questionParts.completionFilled,
							after: questionParts.completionAfter,
						}
					: null
			}
			segments={questionParts.segments}
			fills={selectedAnswer ? selectedParts : null}
			fillMissed={!isSelectionCorrect}
			grammarNote={
				selectedAnswer
					? question.grammar_focus_revised?.trim() || question.grammar_focus
					: null
			}
			selections={selections}
			answer={question.answer}
			selectedAnswer={selectedAnswer}
			onSelect={handleSelectAnswer}
			primary={{
				label: hasNext ? t("player.next") : t("player.showResult"),
				on: hasNext ? solved : allSolved,
				onClick: hasNext ? handleNext : () => setPhase("result"),
			}}
		/>
	);
}
