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
	WordPreviewList,
} from "@/components/main/activity";
import AudioRecorder from "@/components/problem/audio-recorder";
import { type WordItem, wordList } from "@/shared/data/word-list";
import { wordQuizList } from "@/shared/data/word-quiz";
import { getWordTTSAudio } from "@/shared/tts-cache";
import { useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import {
	Check,
	ChevronLeft,
	ChevronRight,
	Play,
	Square,
	X,
} from "lucide-react";
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

export default function WordLearning({
	bookId,
	chapterSeq,
	chapterLabel,
}: WordLearningProps) {
	const router = useRouter();
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

	const quizzes = useMemo(() => {
		return wordQuizList.filter(
			(q) =>
				(bookId == null || q.book_id === bookId) &&
				(chapterSeq == null || q.chapter === chapterSeq),
		);
	}, [bookId, chapterSeq]);

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
			// 이미 푼 퀴즈가 있으면 첫 미풀이 퀴즈로 이어서 이동 (page 0 = 단어목록, 1~ = 퀴즈)
			// 아무것도 안 풀었으면(firstUnsolved === 0) 단어목록(page 0)에 그대로 머문다
			const firstUnsolved = quizzes.findIndex((q) => map[q.id] === undefined);
			if (firstUnsolved > 0) {
				setCurrentPage(firstUnsolved + 1);
			}
		});
	}, [bookId, chapterSeq, quizzes]);

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

	// Quiz page (page > 0)
	if (currentPage > 0) {
		const quizIndex = currentPage - 1;
		const quiz = quizzes[quizIndex];

		return (
			<ActivityFrame>
				<ActivityAppBar
					lesson={chapterLabel}
					onExit={() => router.history.back()}
					onSkip={handleSkip}
				/>
				<ActivityProgress
					current={quizIndex}
					total={quizzes.length}
					onJump={(index) => setCurrentPage(index + 1)}
				/>

				<ActivityBody
					feedback={
						quiz && savedAnswers[quiz.id] !== undefined ? (
							<FeedbackMessage kind="correct" />
						) : null
					}
				>
					{quiz && (
						<WordQuizCard
							key={quiz.id}
							quiz={quiz}
							savedSelectedIndex={savedAnswers[quiz.id] ?? null}
							onAnswered={(questionId, selectedAnswer, isCorrect) => {
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
					)}
				</ActivityBody>

				<ActivityFooter>
					<Dock>
						<PrimaryButton
							label={hasNext ? t("player.next") : t("player.showResult")}
							on={
								hasNext
									? quiz !== undefined && savedAnswers[quiz.id] !== undefined
									: quizzes.length > 0 &&
										quizzes.every((q) => savedAnswers[q.id] !== undefined)
							}
							action="next"
							onClick={
								hasNext
									? () => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
									: () => router.history.back()
							}
						/>
					</Dock>
				</ActivityFooter>
			</ActivityFrame>
		);
	}

	// Word list page (page 0)
	return (
		<ActivityFrame>
			<ActivityAppBar
				lesson={chapterLabel}
				onExit={() => router.history.back()}
				onSkip={handleSkip}
			/>
			<ActivityBody>
				<ProblemCard instruction={t("activity.instrWordPreview")} />
				<WordPreviewList words={[]}>
					{words.map((w) => {
						const isSelected = selectedWordId === w.id;
						const recording = recordings[w.id];
						const isPlaying = playingWordId === w.id;
						const pronunciation = getPronunciationDisplay(w);

						return (
							<Fragment key={w.id}>
								<PreviewRow
									word={w.word}
									meaning={getMeaning(w, i18n.language)}
									on={isSelected}
									loading={ttsLoadingWordId === w.id}
									onSelect={() => handleWordClick(w.id)}
									onPlay={() =>
										handleSpeakerClick(
											{ stopPropagation: () => {} } as React.MouseEvent,
											w,
										)
									}
								/>
								{/* 펼친 줄에만 붙는 그림과 녹음 — 목업 미리보기에는 없는 자리다.
								    .word-preview-list 의 형제로 그대로 붙어야 :last-child 기반
								    구분선·모서리 라운딩이 목록 진짜 끝에 맞게 작동한다. */}
								{isSelected && (
									<div className="preview-extra">
										{w.image && (
											<img
												src={`/textbook/${w.book_id}/${w.image}`}
												alt={w.word}
											/>
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
								)}
							</Fragment>
						);
					})}
				</WordPreviewList>
			</ActivityBody>

			<ActivityFooter>
				<Dock>
					<PrimaryButton
						label={t("activity.toQuiz")}
						on
						action="toQuiz"
						onClick={() => setCurrentPage(1)}
					/>
				</Dock>
			</ActivityFooter>

			{/* biome-ignore lint/a11y/useMediaCaption: 재생 전용 숨은 오디오 */}
			<audio ref={playAudioRef} className="hidden" />
		</ActivityFrame>
	);
}
