import { useSoundEffects } from "@/components/effect/use-sound-effects";
import {
	Choice,
	ChoiceList,
	MeaningFocus,
	ProblemCard,
} from "@/components/main/activity";
import type { WordItem } from "@/shared/data/word-list";
import type { WordQuizItem } from "@/shared/data/word-quiz";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

/** 현재 i18n 언어에 맞는 뜻 반환 */
/**
 * 퀴즈에 다국어 뜻이 없을 때 **같은 과의 어휘에서 찾아 채운다.**
 *
 * 전에는 번들의 어휘 전체에서 급·과로 좁혀 찾았다. 지금은 **그 과의 어휘만**
 * 넘어오므로(서버가 `word` 묶음에 `words` 를 같이 준다) 낱말만 맞추면 된다.
 */
function getLocalizedMeaning(
	words: WordItem[],
	word: string,
	lang: string,
	fallback: string,
): string {
	const item = words.find((w) => w.word === word);
	if (!item) return fallback || word;
	if (lang === "ja") return item.jp || item.en || fallback;
	if (lang === "zh") return item.cn || item.en || fallback;
	// 같은 파일의 getLocalizedPrompt·getQuizMeaning 은 vi 를 보는데 여기만 빠져 있었다
	if (lang === "vi") return item.vi || item.en || fallback;
	return item.en || fallback;
}

interface WordQuizCardProps {
	quiz: WordQuizItem;
	/**
	 * 같은 과의 어휘. 퀴즈에 다국어 뜻이 없을 때 여기서 찾아 채운다.
	 * **번들이 아니라 서버에서 온 것을 부모가 넘긴다**(2026-08-31 · DEV-05).
	 */
	words: WordItem[];
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
	words,
	onAnswered,
	savedSelectedIndex,
}: WordQuizCardProps) {
	const sound = useSoundEffects();
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
			words,
			answerWord,
			i18n.language,
			quiz.meaning_en,
		);
	}, [quiz, words, i18n.language]);

	const handleSelect = useCallback(
		(idx: number) => {
			if (solved) return;
			if (wrongIndices.has(idx)) return;

			sound.playClick();

			const isCorrect = idx === quiz.answer_index;
			onAnswered?.(quiz.id, String(idx), isCorrect);

			if (isCorrect) {
				sound.playCorrect();
			} else {
				sound.playIncorrect();
				setWrongIndices((prev) => new Set(prev).add(idx));
			}
		},
		[solved, wrongIndices, quiz, onAnswered, sound],
	);

	return (
		<>
			<ProblemCard instruction={localizedPrompt}>
				{/* 그림을 주고 낱말을 고르거나, 뜻을 주고 낱말을 고른다 */}
				{imageSrc ? (
					<div className="word-pic">
						<img src={imageSrc} alt={quiz.prompt} />
					</div>
				) : (
					<MeaningFocus>{localizedMeaning}</MeaningFocus>
				)}
			</ProblemCard>

			<ChoiceList>
				{selections.map((sel, idx) => (
					<Choice
						key={sel}
						index={idx}
						// 맞을 때까지 다시 고를 수 있어 틀린 것이 여럿 남는다
						state={
							solved && idx === quiz.answer_index
								? "correct"
								: wrongIndices.has(idx)
									? "wrong"
									: ""
						}
						onClick={() => handleSelect(idx)}
					>
						{sel}
					</Choice>
				))}
			</ChoiceList>
		</>
	);
}
