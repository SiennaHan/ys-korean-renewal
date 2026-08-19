import type { LearningRecord } from "@/api/apiType";
import { getListenAudio } from "@/api/chat";
import { getLearningRecords, saveLearningRecord } from "@/api/learning-record";
import { useSharedAudio } from "@/components/audio/audio-provider";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import { useToast } from "@/components/toast/toast-context";
import {
	type ListenQuestion,
	getListenQuestions,
	getQuestionImagePath,
	getScriptLines,
} from "@/shared/data/listen-answer";
import { useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import {
	Check,
	ChevronLeft,
	ChevronRight,
	Loader2,
	Volume2,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ListenAnswerProps {
	bookId?: number;
	chapter?: number;
	chapterSeq?: number;
	chapterLabel: string;
}

export default function ListenAnswer({
	bookId,
	chapter,
	chapterSeq,
	chapterLabel,
}: ListenAnswerProps) {
	const router = useRouter();
	const sharedAudio = useSharedAudio();
	const sound = useSoundEffects();
	const { addToast } = useToast();

	/** 페이지 이탈 시 음원 중단 */
	useEffect(() => {
		return () => sharedAudio.stop();
	}, [sharedAudio]);

	const questions = useMemo(
		() => (bookId && chapterSeq ? getListenQuestions(bookId, chapterSeq) : []),
		[bookId, chapterSeq],
	);

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
			// 첫 번째 안 푼 문제로 이동
			const firstUnsolved = questions.findIndex((q) => map[q.id] === undefined);
			if (firstUnsolved > 0) {
				setCurrentIndex(firstUnsolved);
			}
		});
	}, [bookId, chapterSeq, questions]);

	const question = questions[currentIndex] as ListenQuestion | undefined;

	/** Restore saved answer when navigating to a question — 정답만 복원 */
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
				addToast("Correct", "success");
				setSelectedIndex(idx);
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
	};

	if (!question) {
		return (
			<div className="flex h-full flex-col items-center justify-center bg-white">
				<p className="text-[#888] text-[14px]">데이터가 없습니다</p>
			</div>
		);
	}

	const isImageType = question.type === "image";
	const isOxType = question.type === "ox";

	return (
		<div className="flex h-full flex-col bg-white">
			{/* Header */}
			<div className="sticky top-0 z-10 bg-white">
				<div className="flex h-[48px] items-center px-[4px]">
					<button
						type="button"
						onClick={() => router.history.back()}
						className="flex size-[44px] cursor-pointer items-center justify-center"
					>
						<X className="size-[20px] text-[#383A3F]" />
					</button>
					<div className="flex-1 pr-[44px] text-center">
						<p className="text-[#979DA8] text-[14px]">{chapterLabel}</p>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="scrollbar-hide flex-1 overflow-y-auto px-[20px] pt-[8px] pb-[100px]">
				{/* Instruction */}
				<h1 className="font-bold text-[#383A3F] text-[20px] leading-tight">
					{question.question}
				</h1>

				{/* Audio play button */}
				<button
					type="button"
					onClick={handlePlay}
					disabled={isPlaying}
					className="mt-[16px] mb-[20px] flex cursor-pointer items-center gap-[8px] rounded-[20px] bg-[#F0F7FF] px-[14px] py-[8px]"
				>
					{isPlaying ? (
						<Loader2 className="size-[18px] animate-spin text-[#0180FF]" />
					) : (
						<Volume2 className="size-[18px] text-[#0180FF]" />
					)}
					<span className="font-medium text-[#0180FF] text-[13px]">듣기</span>
				</button>

				{/* Image grid (for image type) */}
				{isImageType && (
					<div className="mt-[20px] grid grid-cols-2 gap-[10px]">
						{selections.map((sel) => {
							const imgPath = getQuestionImagePath(bookId ?? 1, sel.image);
							const isAnswer = sel.originalIndex === question.answer_index;
							const isWrong = currentWrongSet.has(sel.originalIndex);
							const isSolvedCorrect = isSolved && isAnswer;

							return (
								<button
									key={sel.originalIndex}
									type="button"
									onClick={() => handleSelect(sel.originalIndex)}
									disabled={isSolved || isWrong}
									className={clsx(
										"relative cursor-pointer overflow-hidden rounded-[12px] border-2 transition-all",
										isSolvedCorrect
											? "border-[#359AFF] border-[3px]"
											: isWrong
												? "border-[#E5E8EC] opacity-70"
												: "border-transparent",
										(isSolved || isWrong) && "cursor-not-allowed",
									)}
								>
									<img
										src={imgPath}
										alt={sel.text || `보기 ${sel.originalIndex + 1}`}
										className="aspect-[4/3] w-full object-cover"
									/>
									{sel.text && (
										<div className="bg-[#F6F7F8] px-[8px] py-[6px]">
											<span className="font-medium text-[#383A3F] text-[13px]">
												{sel.text}
											</span>
										</div>
									)}
								</button>
							);
						})}
					</div>
				)}

				{/* O/X answer buttons (for ox type) */}
				{isOxType && (
					<div className="grid grid-cols-2 gap-[12px] pb-[20px]">
						{selections.map((sel) => {
							const isAnswer = sel.originalIndex === question.answer_index;
							const isWrong = currentWrongSet.has(sel.originalIndex);
							const isSolvedCorrect = isSolved && isAnswer;

							return (
								<button
									key={sel.originalIndex}
									type="button"
									onClick={() => handleSelect(sel.originalIndex)}
									disabled={isSolved || isWrong}
									className={clsx(
										"flex h-[120px] cursor-pointer items-center justify-center rounded-[16px] border-2 transition-all",
										isSolvedCorrect
											? "border-[#359AFF] border-[3px] bg-[#E9F2FC]"
											: isWrong
												? "border-[#E5E8EC] bg-gray-100 opacity-70"
												: "border-[#E5E8EC] bg-[#F9FAFC]",
										(isSolved || isWrong) && "cursor-not-allowed",
									)}
								>
									<span
										className={clsx(
											"font-bold text-[48px]",
											isSolvedCorrect
												? "text-[#359AFF]"
												: isWrong
													? "text-[#bbb]"
													: sel.text === "O"
														? "text-[#0180FF]"
														: "text-[#FF5A5A]",
										)}
									>
										{sel.text}
									</span>
								</button>
							);
						})}
					</div>
				)}

				{/* Text answer options (for choice type) */}
				{!isImageType && !isOxType && (
					<div className="flex flex-col gap-[10px] pb-[20px]">
						{selections.map((sel) => {
							const isAnswer = sel.originalIndex === question.answer_index;
							const isWrong = currentWrongSet.has(sel.originalIndex);
							const isSolvedCorrect = isSolved && isAnswer;

							return (
								<button
									key={sel.originalIndex}
									type="button"
									onClick={() => handleSelect(sel.originalIndex)}
									disabled={isSolved || isWrong}
									className={clsx(
										"w-full cursor-pointer whitespace-pre-line rounded-[12px] border-2 px-[16px] py-[14px] text-left transition-all",
										isSolvedCorrect
											? "border-[#359AFF] border-[3px] bg-[#E9F2FC]"
											: isWrong
												? "border-[#E5E8EC] bg-gray-100 opacity-70"
												: "border-[#E5E8EC] bg-[#F9FAFC]",
										(isSolved || isWrong) && "cursor-not-allowed",
									)}
								>
									<span
										className={clsx(
											"text-[15px]",
											isSolvedCorrect
												? "font-semibold text-[#359AFF]"
												: isWrong
													? "text-[#bbb]"
													: "text-[#383A3F]",
										)}
									>
										{sel.text}
									</span>
								</button>
							);
						})}
					</div>
				)}
			</div>

			{/* Footer navigation */}
			<div className="sticky bottom-0 border-[#F6F7F8] border-t bg-white px-[16px] py-[12px]">
				<div className="flex items-center justify-between">
					<button
						type="button"
						onClick={handlePrev}
						disabled={currentIndex === 0}
						className={clsx(
							"flex size-[44px] items-center justify-center rounded-full",
							currentIndex > 0
								? "cursor-pointer text-[#0180FF]"
								: "text-[#E5E8EC]",
						)}
					>
						<ChevronLeft className="size-[24px]" />
					</button>

					<div className="flex items-center gap-[6px]">
						{Array.from({ length: totalSteps }, (_, i) => (
							<div
								key={`dot-${questions[i]?.id ?? i}`}
								className={clsx(
									"rounded-full",
									i === currentIndex
										? "h-[6px] w-[20px] bg-[#0180FF]"
										: "size-[6px] bg-[#E5E8EC]",
								)}
							/>
						))}
					</div>

					{currentIndex >= totalSteps - 1 ? (
						<button
							type="button"
							onClick={() => router.history.back()}
							disabled={
								questions.length === 0 ||
								!questions.every((q) => savedAnswers[q.id] !== undefined)
							}
							className={clsx(
								"flex h-[44px] items-center justify-center gap-[4px] rounded-full px-[16px] font-semibold text-[14px]",
								questions.length > 0 &&
									questions.every((q) => savedAnswers[q.id] !== undefined)
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
							onClick={handleNext}
							className="flex size-[44px] cursor-pointer items-center justify-center rounded-full text-[#0180FF]"
						>
							<ChevronRight className="size-[24px]" />
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
