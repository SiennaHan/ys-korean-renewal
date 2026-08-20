import { getLearningRecords, saveLearningRecord } from "@/api/learning-record";
import { SpeakerIcon } from "@/assets/icons";
import { useSharedAudio } from "@/components/audio/audio-provider";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/** 현재 i18n 언어에 맞는 뜻 반환 */
function getMeaning(word: WordItem, lang: string): string {
	if (lang === "ja") return word.jp || word.en;
	if (lang === "zh") return word.cn || word.en;
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
	const { i18n } = useTranslation();
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
			<div className="relative flex h-full flex-col bg-white">
				{/* Header */}
				<div className="sticky top-0 z-10 border-[#F6F7F8] border-b bg-white">
					<div className="flex h-[48px] items-center justify-between px-[16px]">
						<button
							type="button"
							onClick={() => router.history.back()}
							className="flex cursor-pointer items-center justify-center"
						>
							<X className="size-[20px] text-[#383A3F]" />
						</button>
						<p className="text-[#878787] text-[14px]">{chapterLabel}</p>
						<button
							type="button"
							onClick={handleSkip}
							className="flex cursor-pointer items-center gap-[2px]"
						>
							<span className="text-[#8d8d8d] text-[12px]">skip</span>
							<ChevronRight className="size-[12px] text-[#8d8d8d]" />
						</button>
					</div>
				</div>

				{/* Quiz content */}
				<div className="flex-1 overflow-y-auto pb-[120px]">
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
				</div>

				{/* Footer — roleplay style */}
				<div className="absolute right-0 bottom-0 left-0 z-10">
					<div className="flex items-center bg-[linear-gradient(180deg,rgba(255,255,255,0)0%,#FFF_50%)] px-[16px] pt-[40px]">
						<button
							type="button"
							onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
							className={clsx(
								"flex size-[36px] shrink-0 items-center justify-center",
								hasPrev
									? "cursor-pointer text-[#0180FF]"
									: "cursor-default text-[#E5E8EC]",
							)}
							disabled={!hasPrev}
						>
							<ChevronLeft className="size-[24px]" />
						</button>
						<div className="flex-1" />
						{!hasNext ? (
							<button
								type="button"
								onClick={() => router.history.back()}
								disabled={
									quizzes.length === 0 ||
									!quizzes.every((q) => savedAnswers[q.id] !== undefined)
								}
								className={clsx(
									"flex h-[36px] shrink-0 items-center justify-center gap-[4px] rounded-full px-[14px] font-semibold text-[14px]",
									quizzes.length > 0 &&
										quizzes.every((q) => savedAnswers[q.id] !== undefined)
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
								onClick={() =>
									setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
								}
								className="flex size-[36px] shrink-0 cursor-pointer items-center justify-center text-[#0180FF]"
							>
								<ChevronRight className="size-[24px]" />
							</button>
						)}
					</div>
					{totalPages > 1 && (
						<div className="flex items-center justify-center gap-[4px] bg-white pt-[4px] pb-[8px]">
							{Array.from({ length: totalPages }, (_, i) => (
								<div
									key={i}
									className={clsx(
										"rounded-full transition-all",
										i === currentPage
											? "h-[5px] w-[16px] bg-[#0180FF]"
											: "size-[5px] bg-[#E5E8EC]",
									)}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		);
	}

	// Word list page (page 0)
	return (
		<div className="relative flex h-full flex-col bg-white">
			{/* Header */}
			<div className="sticky top-0 z-10 border-[#F6F7F8] border-b bg-white">
				<div className="flex h-[48px] items-center justify-between px-[16px]">
					<button
						type="button"
						onClick={() => router.history.back()}
						className="flex cursor-pointer items-center justify-center"
					>
						<X className="size-[20px] text-[#383A3F]" />
					</button>
					<p className="text-[#878787] text-[14px]">{chapterLabel}</p>
					<button
						type="button"
						onClick={handleSkip}
						className="flex cursor-pointer items-center gap-[2px]"
					>
						<span className="text-[#8d8d8d] text-[12px]">skip</span>
						<ChevronRight className="size-[12px] text-[#8d8d8d]" />
					</button>
				</div>
			</div>

			{/* Title */}
			<div className="px-[16px] pt-[16px] pb-[8px]">
				<h1 className="font-semibold text-[24px] text-black leading-[32px]">
					전체 단어를 읽어 보세요.
				</h1>
				<p className="mt-[2px] text-[#555] text-[18px] leading-[23px]">
					Preview the words from this lesson.
				</p>
			</div>

			{/* Word list */}
			<div className="scrollbar-hide flex-1 overflow-y-auto px-[16px] pb-[120px]">
				<div className="flex flex-col gap-[12px] pt-[8px]">
					{words.map((w) => {
						const isSelected = selectedWordId === w.id;
						const recording = recordings[w.id];
						const isPlaying = playingWordId === w.id;
						const pronunciation = getPronunciationDisplay(w);

						return (
							<div
								key={w.id}
								className="w-full overflow-hidden rounded-[8px] text-left shadow-[0px_0px_5px_-0.4px_rgba(94,129,169,0.3)]"
							>
								{/* Blue top section */}
								<div
									className={clsx(
										"flex h-[41px] cursor-pointer items-center gap-[8px] px-[16px]",
										isSelected ? "bg-[#4396F4]" : "bg-[#e9f2fc]",
									)}
									onClick={() => handleWordClick(w.id)}
									onKeyDown={() => {}}
								>
									{/* Speaker button — TTS 재생 */}
									<button
										type="button"
										onClick={(e) => handleSpeakerClick(e, w)}
										disabled={ttsLoadingWordId === w.id}
										className="flex shrink-0 cursor-pointer items-center justify-center disabled:cursor-not-allowed"
									>
										{ttsLoadingWordId === w.id ? (
											<div className="size-[14px] animate-spin rounded-full border-2 border-transparent border-b-[#4396F4]" />
										) : (
											<SpeakerIcon
												color={isSelected ? "#fff" : "#4396F4"}
												size={14}
											/>
										)}
									</button>
									<span
										className={clsx(
											"font-medium text-[20px]",
											isSelected ? "text-white" : "text-black",
										)}
									>
										{w.word}
									</span>
								</div>
								{/* Meaning section */}
								<div
									className="flex h-[27px] cursor-pointer items-center border-[#f0f0f0] border-t px-[16px]"
									onClick={() => handleWordClick(w.id)}
									onKeyDown={() => {}}
								>
									<span className="text-[#878787] text-[14px]">
										{getMeaning(w, i18n.language)}
									</span>
								</div>

								{/* Word image — only when selected and image exists */}
								{isSelected && w.image && (
									<div className="flex items-center justify-center border-[#f0f0f0] border-t bg-white px-[12px] py-[10px]">
										<img
											src={`/textbook/${w.book_id}/${w.image}`}
											alt={w.word}
											className="h-[120px] w-auto rounded-[8px] object-contain"
										/>
									</div>
								)}

								{/* Expanded recording area — only when selected */}
								{isSelected && (
									<div className="flex items-center gap-[8px] border-[#f0f0f0] border-t bg-white px-[12px] py-[10px]">
										{/* X button — only after recording */}
										<div className="w-[28px]">
											{recording && (
												<button
													type="button"
													onClick={() => handleClearRecording(w.id)}
													className="flex size-[28px] cursor-pointer items-center justify-center rounded-full bg-[#E5E8EC]"
												>
													<X className="size-[14px] text-[#878787]" />
												</button>
											)}
										</div>

										{/* Center: pronunciation text + recorded word */}
										<div className="flex flex-1 flex-col items-center gap-[2px]">
											{recording ? (
												<span className="text-[#4396F4] text-[14px]">
													{recording.resultWord}
												</span>
											) : (
												<>
													<span className="text-[#B0B0B0] text-[14px]">
														{pronunciation.text}
													</span>
													{pronunciation.bracket && (
														<span className="text-[#C8C8C8] text-[12px]">
															{pronunciation.bracket}
														</span>
													)}
												</>
											)}
										</div>

										{/* Right: play/stop button + timer — only after recording */}
										<div className="flex w-[60px] items-center justify-end gap-[4px]">
											{recording && (
												<>
													<span className="text-[#878787] text-[12px]">
														{formatTime(isPlaying ? playTime : 0)}
													</span>
													<button
														type="button"
														onClick={() =>
															handleTogglePlay(w.id, recording.audioUrl)
														}
														className="flex size-[28px] cursor-pointer items-center justify-center rounded-full bg-[#0180FF]"
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
								)}
							</div>
						);
					})}
				</div>
			</div>

			{/* Bottom bar — roleplay style: arrows flanking recorder */}
			<div className="absolute right-0 bottom-0 left-0 z-10">
				<div className="flex items-center bg-[linear-gradient(180deg,rgba(255,255,255,0)0%,#FFF_50%)] px-[16px] pt-[40px]">
					<button
						type="button"
						onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
						className={clsx(
							"flex size-[36px] shrink-0 items-center justify-center",
							hasPrev
								? "cursor-pointer text-[#0180FF]"
								: "cursor-default text-[#E5E8EC]",
						)}
						disabled={!hasPrev}
					>
						<ChevronLeft className="size-[24px]" />
					</button>
					<div className="flex-1">
						<AudioRecorder
							setResult={handleRecordResult}
							disabled={selectedWordId == null}
						/>
					</div>
					<button
						type="button"
						onClick={() =>
							setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
						}
						className={clsx(
							"flex size-[36px] shrink-0 items-center justify-center",
							hasNext
								? "cursor-pointer text-[#0180FF]"
								: "cursor-default text-[#E5E8EC]",
						)}
						disabled={!hasNext}
					>
						<ChevronRight className="size-[24px]" />
					</button>
				</div>
				{totalPages > 1 && (
					<div className="flex items-center justify-center gap-[4px] bg-white pt-[4px] pb-[8px]">
						{Array.from({ length: totalPages }, (_, i) => (
							<div
								key={i}
								className={clsx(
									"rounded-full transition-all",
									i === currentPage
										? "h-[5px] w-[16px] bg-[#0180FF]"
										: "size-[5px] bg-[#E5E8EC]",
								)}
							/>
						))}
					</div>
				)}
			</div>

			{/* biome-ignore lint/a11y/useMediaCaption: playback-only hidden audio */}
			<audio ref={playAudioRef} className="hidden" />
		</div>
	);
}
