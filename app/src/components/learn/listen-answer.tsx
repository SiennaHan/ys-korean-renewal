import type { LearningRecord } from "@/api/apiType";
import { getListenAudio } from "@/api/chat";
import { getLearningRecords, saveLearningRecord } from "@/api/learning-record";
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
	FeedbackMessage,
	ListenCopy,
	PrimaryButton,
	ProblemCard,
	QuestionText,
} from "@/components/main/activity";
import { useInstruction } from "@/shared/data/instruction";
import {
	type ListenQuestion,
	getListenQuestions,
	getQuestionImagePath,
	getScriptLines,
} from "@/shared/data/listen-answer";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

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
	const { t } = useTranslation();
	const sharedAudio = useSharedAudio();
	const sound = useSoundEffects();

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
	const instruction = useInstruction(question, "activity.instrListen");

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

	if (!question) {
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

	const isImageType = question.type === "image";
	const isOxType = question.type === "ox";

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
					{/* O/X 가 판단할 문장. 들은 것이 아니라 제시된 것이다 —
					    들은 것은 오디오뿐이고 이 글자는 맞는지 가릴 대상이다.
					    카드 안에서 가장 큰 글자가 된다. 객관식은 질문이 따로 있으므로
					    선택지 위로 뺀다 */}
					{isOxType && (
						<ListenCopy
							label={t("activity.statementLabel")}
							statement={question.question}
						/>
					)}
					<div className="listen-stimulus">
						<AudioRow
							label={t("activity.playSentence")}
							sub={
								isPlaying ? t("state.audioPreparing") : t("activity.audioSub")
							}
							onPlay={handlePlay}
						/>
					</div>
				</ProblemCard>

				<div className="response-area">
					{!isOxType && <QuestionText>{question.question}</QuestionText>}
					<ChoiceList
						variant={isImageType ? "image" : isOxType ? "binary" : "list"}
						inResponseArea={false}
					>
						{selections.map((sel) => {
							const state =
								isSolved && sel.originalIndex === question.answer_index
									? "correct"
									: currentWrongSet.has(sel.originalIndex)
										? "wrong"
										: "";
							return (
								<Choice
									key={sel.originalIndex}
									index={sel.originalIndex}
									state={state}
									sub={
										isOxType
											? t(
													sel.text === "O"
														? "activity.oxSame"
														: "activity.oxDifferent",
												)
											: undefined
									}
									onClick={() => handleSelect(sel.originalIndex)}
								>
									{isImageType ? (
										<img
											src={getQuestionImagePath(bookId ?? 1, sel.image)}
											alt={sel.text || ""}
										/>
									) : (
										sel.text
									)}
								</Choice>
							);
						})}
					</ChoiceList>
				</div>
			</ActivityBody>

			<ActivityFooter>
				<Dock>
					<PrimaryButton
						label={
							currentIndex < totalSteps - 1
								? t("player.next")
								: t("player.showResult")
						}
						on={
							currentIndex < totalSteps - 1
								? isSolved
								: questions.length > 0 &&
									questions.every((q) => savedAnswers[q.id] !== undefined)
						}
						action="next"
						onClick={
							currentIndex < totalSteps - 1
								? handleNext
								: () => router.history.back()
						}
					/>
				</Dock>
			</ActivityFooter>
		</ActivityFrame>
	);
}
