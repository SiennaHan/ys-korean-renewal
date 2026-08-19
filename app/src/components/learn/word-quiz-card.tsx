import { useSoundEffects } from "@/components/effect/use-sound-effects";
import { useToast } from "@/components/toast/toast-context";
import { wordList } from "@/shared/data/word-list";
import type { WordQuizItem } from "@/shared/data/word-quiz";
import clsx from "clsx";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

/** 현재 i18n 언어에 맞는 뜻 반환 */
function getLocalizedMeaning(
	word: string,
	bookId: number,
	chapter: number,
	lang: string,
	fallback: string,
): string {
	const item = wordList.find(
		(w) => w.word === word && w.book_id === bookId && w.chapter === chapter,
	);
	if (!item) return fallback || word;
	if (lang === "ja") return item.jp || item.en || fallback;
	if (lang === "zh") return item.cn || item.en || fallback;
	return item.en || fallback;
}

interface WordQuizCardProps {
	quiz: WordQuizItem;
	/** null = 아직 정답 못 맞춤, number = 정답 맞힌 인덱스 */
	savedSelectedIndex?: number | null;
	onAnswered?: (
		questionId: number,
		selectedAnswer: string,
		isCorrect: boolean,
	) => void;
}

/** 현재 i18n 언어에 맞는 퀴즈 프롬프트 반환 */
function getLocalizedPrompt(quiz: WordQuizItem, lang: string): string {
	if (lang === "ja" && quiz.prompt_jp) return quiz.prompt_jp;
	if (lang === "zh" && quiz.prompt_cn) return quiz.prompt_cn;
	if (lang === "vi" && quiz.prompt_vi) return quiz.prompt_vi;
	if (lang === "en" && quiz.prompt_en) return quiz.prompt_en;
	return quiz.prompt_en || quiz.prompt;
}

/** 현재 i18n 언어에 맞는 퀴즈 의미 반환 */
function getQuizMeaning(quiz: WordQuizItem, lang: string): string {
	if (lang === "ja" && quiz.meaning_jp) return quiz.meaning_jp;
	if (lang === "zh" && quiz.meaning_cn) return quiz.meaning_cn;
	if (lang === "vi" && quiz.meaning_vi) return quiz.meaning_vi;
	return quiz.meaning_en;
}

export default function WordQuizCard({
	quiz,
	onAnswered,
	savedSelectedIndex,
}: WordQuizCardProps) {
	const sound = useSoundEffects();
	const { addToast } = useToast();
	const { i18n } = useTranslation();
	const solved =
		savedSelectedIndex !== null && savedSelectedIndex !== undefined;
	const [wrongIndices, setWrongIndices] = useState<Set<number>>(new Set());

	const selections = [
		quiz.selection1,
		quiz.selection2,
		quiz.selection3,
		quiz.selection4,
	];

	const imageSrc =
		quiz.type === "image-to-word" && quiz.image
			? `/textbook/${quiz.book_id}/${quiz.image}`
			: null;

	/** 다국어 프롬프트 */
	const localizedPrompt = useMemo(
		() => getLocalizedPrompt(quiz, i18n.language),
		[quiz, i18n.language],
	);

	/** 정답 단어의 다국어 뜻 (meaning-to-word 타입용) */
	const localizedMeaning = useMemo(() => {
		if (quiz.type !== "meaning-to-word") return "";
		// 퀴즈 자체의 다국어 meaning 필드 우선 사용
		const quizMeaning = getQuizMeaning(quiz, i18n.language);
		if (quizMeaning) return quizMeaning;
		// fallback: wordList에서 조회
		const answerWord = [
			quiz.selection1,
			quiz.selection2,
			quiz.selection3,
			quiz.selection4,
		][quiz.answer_index];
		return getLocalizedMeaning(
			answerWord,
			quiz.book_id,
			quiz.chapter,
			i18n.language,
			quiz.meaning_en,
		);
	}, [quiz, i18n.language]);

	const handleSelect = useCallback(
		(idx: number) => {
			if (solved) return;
			if (wrongIndices.has(idx)) return;

			sound.playClick();

			const isCorrect = idx === quiz.answer_index;
			onAnswered?.(quiz.id, String(idx), isCorrect);

			if (isCorrect) {
				sound.playCorrect();
				addToast("Correct", "success");
			} else {
				sound.playIncorrect();
				addToast("Incorrect", "error");
				setWrongIndices((prev) => new Set(prev).add(idx));
			}
		},
		[solved, wrongIndices, quiz, onAnswered, sound, addToast],
	);

	return (
		<div className="flex flex-1 flex-col px-[16px] pt-[16px]">
			{/* Title */}
			<h1 className="font-semibold text-[24px] text-black leading-[32px]">
				{localizedPrompt}
			</h1>

			{/* Prompt area */}
			<div className="mt-[16px] flex items-center justify-center">
				{quiz.type === "image-to-word" && imageSrc ? (
					<img
						src={imageSrc}
						alt={quiz.prompt}
						className="h-[160px] w-auto rounded-[12px] object-contain"
					/>
				) : (
					<div className="flex h-[160px] w-full items-center justify-center rounded-[12px] bg-[#F6F7F8]">
						<p className="text-center font-medium text-[#383A3F] text-[22px]">
							{localizedMeaning}
						</p>
					</div>
				)}
			</div>

			{/* 2x2 Selection grid */}
			<div className="mt-[16px] grid grid-cols-2 gap-[12px]">
				{selections.map((sel, idx) => {
					const isAnswer = idx === quiz.answer_index;
					const isWrong = wrongIndices.has(idx);
					const isSolvedCorrect = solved && isAnswer;

					return (
						<button
							key={idx}
							type="button"
							onClick={() => handleSelect(idx)}
							disabled={solved || isWrong}
							className={clsx(
								"flex h-[64px] cursor-pointer items-center justify-center rounded-[15px] border text-center font-medium text-[18px] transition-all",
								isSolvedCorrect
									? "border-[#359AFF] border-[3px] bg-[#359AFF] text-white"
									: isWrong
										? "border-[#E5E8EC] bg-gray-100 text-[#bbb] opacity-70"
										: "border-[#B9DAFF] bg-[#E9F2FC] text-black",
								(solved || isWrong) && "cursor-not-allowed",
							)}
						>
							{sel}
						</button>
					);
				})}
			</div>
		</div>
	);
}
