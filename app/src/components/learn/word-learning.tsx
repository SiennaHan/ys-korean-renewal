import { getLearningRecords, saveLearningRecord } from "@/api/learning-record";
import { SpeakerIcon } from "@/assets/icons";
import { useSharedAudio } from "@/components/audio/audio-provider";
import {
	ActivityAppBar,
	ActivityBody,
	ActivityFooter,
	ActivityFrame,
	ActivityProgress,
	Dock,
	FeedbackMessage,
	PreviewRow,
	PrimaryButton,
	ProblemCard,
	ResultScreen,
	WordPreviewList,
} from "@/components/main/activity";
import AudioRecorder from "@/components/problem/audio-recorder";
import { useActivityState } from "@/hooks/use-activity-state";
import { type WordItem, wordList } from "@/shared/data/word-list";
import { wordQuizList } from "@/shared/data/word-quiz";
import { nextLessonActivity } from "@/shared/lesson-flow";
import { getWordTTSAudio } from "@/shared/tts-cache";
import { useNavigate, useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import {
	Check,
	ChevronLeft,
	ChevronRight,
	Play,
	Square,
	X,
} from "lucide-react";
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
import WordQuizCard from "./word-quiz-card";

interface WordLearningProps {
	bookId?: number;
	chapterSeq?: number;
	chapterLabel: string;
}

/** 녹음 결과를 단어별로 저장 */
interface RecordingResult {
	resultWord: string;
	audioUrl: string;
}

/**
 * 현재 i18n 언어에 맞는 뜻 반환.
 *
 * i18n 코드와 데이터 열 이름이 갈린다 — ja↔jp · zh↔cn. vi 는 같다.
 * 베트남어가 오래 빠져 있었다(2026-08-26 추가). 원장에 vi 가 100% 차 있는데도
 * 화면이 안 읽어서 베트남어 사용자에게 영어가 나왔다.
 */
function getMeaning(word: WordItem, lang: string): string {
	if (lang === "ja") return word.jp || word.en;
	if (lang === "zh") return word.cn || word.en;
	if (lang === "vi") return word.vi || word.en;
	return word.en;
}

/** sound 필드에서 발음 텍스트 추출 (예: "맛있어요 [마디써요]") */
function getPronunciationDisplay(word: WordItem): {
	text: string;
	bracket: string;
} {
	if (word.sound) {
		const match = word.sound.match(/^(.+?)\s*\[(.+?)\]$/);
		if (match) {
			return { text: match[1], bracket: `[${match[2]}]` };
		}
		return { text: word.sound, bracket: "" };
	}
	// 발음 표기가 없는 단어는 대괄호를 자동으로 채우지 않고 단어만 표시
	return { text: word.word, bracket: "" };
}

/** mm:ss 포맷 */
function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * 어휘 미리보기 — **표시만** 한다. 목업 activity__wordPreview 자리다.
 *
 * 진행바가 없는 것은 shell_spec "활동별 진행 표시 정책" 의 "진행 없음" 이다 —
 * 미리보기는 퀴즈의 0번 문항이 아니라 준비 화면이라 분모에도 안 들어간다.
 */
/**
 * 어휘 문제 — **표시만** 한다. 목업 activity__wordQuiz · wordQuiz_image 자리다.
 *
 * 문제 카드 자체는 `WordQuizCard` 가 그린다. 원장이 가진 갈래는 둘이다 —
 * 뜻을 주고 낱말을 고르거나(meaning-to-word), 그림을 주고 낱말을 고른다(image-to-word).
 */
export function WordQuizPageView({
	lesson,
	onExit,
	onSkip,
	current,
	total,
	onJump,
	solved,
	card,
	primary,
}: {
	lesson: string;
	onExit?: () => void;
	onSkip?: () => void;
	current: number;
	total: number;
	onJump?: (index: number) => void;
	/** 맞혔으면 피드백 칸에 정답 문구가 뜬다 */
	solved?: boolean;
	card: ReactNode;
	primary: {
		label: string;
		on: boolean;
		action?: string;
		onClick?: () => void;
	};
}) {
	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={onExit} onSkip={onSkip} />
			<ActivityProgress current={current} total={total} onJump={onJump} />

			<ActivityBody
				feedback={solved ? <FeedbackMessage kind="correct" /> : null}
			>
				{card}
			</ActivityBody>

			<ActivityFooter>
				<Dock>
					<PrimaryButton
						label={primary.label}
						on={primary.on}
						action={primary.action ?? "next"}
						onClick={primary.onClick}
					/>
				</Dock>
			</ActivityFooter>
		</ActivityFrame>
	);
}

export function WordPreviewView({
	lesson,
	onExit,
	onSkip,
	instruction,
	rows,
	primary,
	after,
}: {
	lesson: string;
	onExit?: () => void;
	onSkip?: () => void;
	instruction: ReactNode;
	rows: {
		key: string | number;
		word: string;
		meaning: string;
		on?: boolean;
		loading?: boolean;
		onSelect?: () => void;
		onPlay?: () => void;
		/** 펼친 줄 아래에 붙는 그림·녹음. 목업에는 없는 자리다 */
		extra?: ReactNode;
	}[];
	primary: {
		label: string;
		on: boolean;
		action?: string;
		onClick?: () => void;
	};
	after?: ReactNode;
}) {
	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={onExit} onSkip={onSkip} />
			{/* 목업이 이 칸에 aria-live 를 단다 */}
			<ActivityBody feedback={null}>
				<ProblemCard instruction={instruction} />
				<WordPreviewList words={[]}>
					{rows.map((r) => (
						<Fragment key={r.key}>
							<PreviewRow
								word={r.word}
								meaning={r.meaning}
								on={r.on}
								loading={r.loading}
								onSelect={r.onSelect}
								onPlay={r.onPlay}
							/>
							{/* 펼친 줄에만 붙는 그림과 녹음 — 목업 미리보기에는 없는 자리다.
							    .word-preview-list 의 형제로 그대로 붙어야 :last-child 기반
							    구분선·모서리 라운딩이 목록 진짜 끝에 맞게 작동한다. */}
							{r.on && r.extra}
						</Fragment>
					))}
				</WordPreviewList>
			</ActivityBody>

			<ActivityFooter>
				<Dock>
					<PrimaryButton
						label={primary.label}
						on={primary.on}
						action={primary.action ?? "next"}
						onClick={primary.onClick}
					/>
				</Dock>
			</ActivityFooter>
			{after}
		</ActivityFrame>
	);
}

export default function WordLearning({
	bookId,
	chapterSeq,
	chapterLabel,
}: WordLearningProps) {
	const router = useRouter();
	const navigate = useNavigate();
	const { t, i18n } = useTranslation();
	const [selectedWordId, setSelectedWordId] = useState<number | null>(null);
	const [recordings, setRecordings] = useState<Record<number, RecordingResult>>(
		{},
	);
	const [playingWordId, setPlayingWordId] = useState<number | null>(null);
	const [playTime, setPlayTime] = useState(0);
	const [ttsLoadingWordId, setTtsLoadingWordId] = useState<number | null>(null);
	const playAudioRef = useRef<HTMLAudioElement | null>(null);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const sharedAudio = useSharedAudio();

	const [currentPage, setCurrentPage] = useState(0);
	/** questionId → selected answer index (from server) */
	const [savedAnswers, setSavedAnswers] = useState<Record<number, number>>({});
	/** 정답 후 3초 자동 이동 타이머 */
	const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	/** 페이지 이탈 시 음원 중단 + 자동 이동 타이머 정리 */
	useEffect(() => {
		return () => {
			sharedAudio.stop();
			if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
		};
	}, [sharedAudio]);

	/** 페이지 전환 시 자동 이동 타이머 초기화 */
	// currentPage 가 방아쇠다 — 몸통은 ref 만 읽지만 지우면 페이지를 넘겨도
	// 타이머가 안 지워져 이전 페이지의 자동 이동이 그대로 터진다.
	// biome-ignore lint/correctness/useExhaustiveDependencies: 페이지가 바뀔 때 타이머를 지우려고 넣은 방아쇠다
	useEffect(() => {
		if (autoAdvanceRef.current) {
			clearTimeout(autoAdvanceRef.current);
			autoAdvanceRef.current = null;
		}
	}, [currentPage]);

	const words = useMemo(() => {
		return wordList.filter(
			(w) =>
				(bookId == null || w.book_id === bookId) &&
				(chapterSeq == null || w.chapter === chapterSeq),
		);
	}, [bookId, chapterSeq]);

	/** 마지막 퀴즈를 넘기면 결과 화면 */
	const [phase, setPhase] = useState<"solving" | "result">("solving");
	/** 다시 풀기로 좁힌 퀴즈. null 이면 과 전체다 */
	const [retryOnly, setRetryOnly] = useState<number[] | null>(null);
	/**
	 * 첫 시도에 틀린 퀴즈 → 그때 고른 보기 번호.
	 * 이 화면은 오답도 서버로 보내지만(`saveLearningRecord` 의 isCorrect)
	 * 로컬 상태에는 정답만 남겨 왔다. 결과 화면의 오답 목록은 이걸 쓴다.
	 */
	const [firstWrong, setFirstWrong] = useState<Record<number, number>>({});
	/** 이미 한 번 답한 퀴즈 — "첫 시도" 를 가리려고 둔다 */
	const tried = useRef<Set<number>>(new Set());

	const quizzes = useMemo(() => {
		const all = wordQuizList.filter(
			(q) =>
				(bookId == null || q.book_id === bookId) &&
				(chapterSeq == null || q.chapter === chapterSeq),
		);
		// 결과 화면의 [다시 풀기] 는 "그 활동의 미해결 항목만" 이다(shell_spec §3.3)
		return retryOnly ? all.filter((q) => retryOnly.includes(q.id)) : all;
	}, [bookId, chapterSeq, retryOnly]);

	/** Fetch existing records on mount — 정답만 복원 + 첫 미풀이 문제로 이동 */
	useEffect(() => {
		if (!bookId || !chapterSeq) return;
		getLearningRecords(bookId, chapterSeq, "word").then((records) => {
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
		menuType: "word",
		totalItems: quizzes.length || null,
		retry: retryOnly !== null,
	});

	/** 서버가 준 위치로 한 번만 옮긴다. null 은 "아직 모른다" 다 */
	const jumped = useRef(false);
	useEffect(() => {
		if (jumped.current || startIndex === null) return;
		jumped.current = true;
		if (startIndex > 0 && startIndex <= quizzes.length) {
			setCurrentPage(startIndex);
		}
	}, [startIndex, quizzes.length]);

	/** 위치가 바뀌면 알린다. ✕ 로 나가도 이 값이 이미 저장돼 있다 */
	useEffect(() => {
		saveProgress(currentPage);
	}, [currentPage, saveProgress]);

	/*
	 * 결과로 넘어갈 때 한 번 완료를 알린다. 세 수의 뜻은 dev_spec §2.1 —
	 * answered 는 응답 수, graded 는 채점 대상, correct 는 **첫 시도** 정답이다.
	 */
	const reported = useRef(false);
	useEffect(() => {
		if (phase !== "result" || reported.current) return;
		reported.current = true;
		const wrongCount = quizzes.filter(
			(q) => firstWrong[q.id] !== undefined,
		).length;
		void complete({
			answeredCount: quizzes.length,
			gradedCount: quizzes.length,
			correctCount: quizzes.length - wrongCount,
		});
	}, [phase, quizzes, firstWrong, complete]);

	// page 0 = word list, pages 1..N = quiz questions
	const totalPages = 1 + quizzes.length;
	const hasPrev = currentPage > 0;
	const hasNext = currentPage < totalPages - 1;

	const handleWordClick = useCallback((id: number) => {
		setSelectedWordId((prev) => (prev === id ? null : id));
	}, []);

	/** 스피커 아이콘 클릭 → TTS API로 단어 음성 재생 (캐시 + SharedAudio) */
	const handleSpeakerClick = useCallback(
		async (e: React.MouseEvent, word: WordItem) => {
			e.stopPropagation(); // 카드 클릭(선택) 이벤트 방지

			setTtsLoadingWordId(word.id);
			try {
				const audioUrl = await getWordTTSAudio(word.word);
				if (!audioUrl) return;
				await sharedAudio.playUrl(audioUrl);
			} finally {
				setTtsLoadingWordId(null);
			}
		},
		[sharedAudio],
	);

	const handleSkip = useCallback(() => {
		router.history.back();
	}, [router]);

	/** 하단 AudioRecorder에서 녹음 결과가 올라오면 선택된 단어에 저장 */
	const handleRecordResult = useCallback(
		(_isCorrect: boolean, resultWord: string, audioUrl: string) => {
			if (selectedWordId != null) {
				setRecordings((prev) => ({
					...prev,
					[selectedWordId]: { resultWord, audioUrl },
				}));
			}
		},
		[selectedWordId],
	);

	/** 녹음 결과 삭제 (X 버튼) */
	const handleClearRecording = useCallback(
		(wordId: number) => {
			// 재생 중이면 멈춤
			if (playingWordId === wordId) {
				playAudioRef.current?.pause();
				setPlayingWordId(null);
				setPlayTime(0);
			}
			setRecordings((prev) => {
				const next = { ...prev };
				delete next[wordId];
				return next;
			});
		},
		[playingWordId],
	);

	/** 녹음 재생/멈춤 토글 */
	const handleTogglePlay = useCallback(
		(wordId: number, audioUrl: string) => {
			if (playingWordId === wordId) {
				// 재생 중 → 멈춤
				playAudioRef.current?.pause();
				setPlayingWordId(null);
				setPlayTime(0);
				if (timerRef.current) clearInterval(timerRef.current);
				return;
			}
			// 새로 재생
			if (playAudioRef.current) {
				playAudioRef.current.src = audioUrl;
				playAudioRef.current.currentTime = 0;
				playAudioRef.current.play();
			}
			setPlayingWordId(wordId);
			setPlayTime(0);
			if (timerRef.current) clearInterval(timerRef.current);
			timerRef.current = setInterval(() => {
				if (playAudioRef.current) {
					setPlayTime(playAudioRef.current.currentTime);
				}
			}, 100);
		},
		[playingWordId],
	);

	/** 재생 끝나면 정리 */
	useEffect(() => {
		const audio = playAudioRef.current;
		if (!audio) return;
		const onEnded = () => {
			setPlayingWordId(null);
			setPlayTime(0);
			if (timerRef.current) clearInterval(timerRef.current);
		};
		audio.addEventListener("ended", onEnded);
		return () => audio.removeEventListener("ended", onEnded);
	}, []);

	if (phase === "result") {
		const pick = (q: (typeof quizzes)[number], idx: number) =>
			[q.selection1, q.selection2, q.selection3, q.selection4][idx] ?? "";
		const missed = quizzes.filter((q) => firstWrong[q.id] !== undefined);
		const wrongIds = missed.map((q) => q.id);
		return (
			<ResultScreen
				lesson={chapterLabel}
				total={quizzes.length}
				answered={
					quizzes.filter((q) => savedAnswers[q.id] !== undefined).length
				}
				graded={quizzes.length}
				correct={quizzes.length - wrongIds.length}
				wrongs={missed.map((q) => ({
					picked: pick(q, firstWrong[q.id]),
					// 이 원장에는 해설이 없다 — 빈 칸을 그리느니 정답을 말해 준다
					explanation: t("player.answerIs", {
						answer: pick(q, q.answer_index),
					}),
				}))}
				onExit={() => router.history.back()}
				onRetry={
					wrongIds.length > 0
						? () => {
								setSavedAnswers((prev) => {
									const next = { ...prev };
									for (const id of wrongIds) delete next[id];
									return next;
								});
								setFirstWrong({});
								for (const id of wrongIds) tried.current.delete(id);
								setRetryOnly(wrongIds);
								// 0 은 단어 목록이라 퀴즈 첫 장은 1 이다
								setCurrentPage(1);
								setPhase("solving");
							}
						: undefined
				}
				onNext={() => {
					const next =
						bookId && chapterSeq
							? nextLessonActivity("word", bookId, chapterSeq)
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

	// Quiz page (page > 0)
	if (currentPage > 0) {
		const quizIndex = currentPage - 1;
		const quiz = quizzes[quizIndex];

		return (
			<WordQuizPageView
				lesson={chapterLabel}
				onExit={() => router.history.back()}
				onSkip={handleSkip}
				current={quizIndex}
				total={quizzes.length}
				onJump={(index) => setCurrentPage(index + 1)}
				solved={quiz != null && savedAnswers[quiz.id] !== undefined}
				card={
					quiz && (
						<WordQuizCard
							key={quiz.id}
							quiz={quiz}
							savedSelectedIndex={savedAnswers[quiz.id] ?? null}
							onAnswered={(questionId, selectedAnswer, isCorrect) => {
								if (!tried.current.has(questionId)) {
									tried.current.add(questionId);
									if (!isCorrect) {
										setFirstWrong((prev) => ({
											...prev,
											[questionId]: Number.parseInt(selectedAnswer, 10),
										}));
									}
								}
								if (bookId && chapterSeq) {
									saveLearningRecord({
										bookId,
										chapterSeq,
										menuType: "word",
										questionId,
										selectedAnswer,
										isCorrect,
									});
									if (isCorrect) {
										setSavedAnswers((prev) => ({
											...prev,
											[questionId]: Number.parseInt(selectedAnswer, 10),
										}));
										// 3초 후 자동으로 다음 페이지 이동
										if (autoAdvanceRef.current)
											clearTimeout(autoAdvanceRef.current);
										autoAdvanceRef.current = setTimeout(() => {
											setCurrentPage((p) => Math.min(totalPages - 1, p + 1));
										}, 3000);
									}
								}
							}}
						/>
					)
				}
				primary={{
					label: hasNext ? t("player.next") : t("player.showResult"),
					on: hasNext
						? quiz !== undefined && savedAnswers[quiz.id] !== undefined
						: quizzes.length > 0 &&
							quizzes.every((q) => savedAnswers[q.id] !== undefined),
					onClick: hasNext
						? () => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
						: () => setPhase("result"),
				}}
			/>
		);
	}

	// Word list page (page 0)
	return (
		<WordPreviewView
			lesson={chapterLabel}
			onExit={() => router.history.back()}
			onSkip={handleSkip}
			instruction={t("activity.instrWordPreview")}
			rows={words.map((w) => {
				const isSelected = selectedWordId === w.id;
				const recording = recordings[w.id];
				const isPlaying = playingWordId === w.id;
				const pronunciation = getPronunciationDisplay(w);
				return {
					key: w.id,
					word: w.word,
					meaning: getMeaning(w, i18n.language),
					on: isSelected,
					loading: ttsLoadingWordId === w.id,
					onSelect: () => handleWordClick(w.id),
					onPlay: () =>
						handleSpeakerClick(
							{ stopPropagation: () => {} } as React.MouseEvent,
							w,
						),
					extra: (
						<div className="preview-extra">
							{w.image && (
								<img src={`/textbook/${w.book_id}/${w.image}`} alt={w.word} />
							)}

							<div className="preview-record">
								<div className="preview-record-side">
									{recording && (
										<button
											type="button"
											onClick={() => handleClearRecording(w.id)}
											className="preview-record-clear"
										>
											<X className="size-[14px]" />
										</button>
									)}
								</div>

								<div className="preview-record-center">
									{recording ? (
										<span className="preview-record-result">
											{recording.resultWord}
										</span>
									) : (
										<>
											<span className="preview-record-pron">
												{pronunciation.text}
											</span>
											{pronunciation.bracket && (
												<span className="preview-record-bracket">
													{pronunciation.bracket}
												</span>
											)}
										</>
									)}
								</div>

								<div className="preview-record-side preview-record-side--right">
									{recording && (
										<>
											<span className="preview-record-timer">
												{formatTime(isPlaying ? playTime : 0)}
											</span>
											<button
												type="button"
												onClick={() =>
													handleTogglePlay(w.id, recording.audioUrl)
												}
												className="preview-record-play"
											>
												{isPlaying ? (
													<Square className="size-[12px] text-white" />
												) : (
													<Play className="ml-[2px] size-[12px] text-white" />
												)}
											</button>
										</>
									)}
								</div>
							</div>
						</div>
					),
				};
			})}
			primary={{
				label: t("activity.toQuiz"),
				on: true,
				action: "toQuiz",
				onClick: () => setCurrentPage(1),
			}}
			after={
				// biome-ignore lint/a11y/useMediaCaption: 재생 전용 숨은 오디오
				<audio ref={playAudioRef} className="hidden" />
			}
		/>
	);
}
