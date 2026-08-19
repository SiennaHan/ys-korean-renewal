import wordQuizData from "./n1_word_quiz.json";

export interface WordQuizItem {
	id: number;
	book_id: number;
	chapter: number;
	type: "image-to-word" | "meaning-to-word";
	prompt: string;
	prompt_en: string;
	prompt_jp: string;
	prompt_cn: string;
	prompt_vi: string;
	meaning_en: string;
	meaning_jp: string;
	meaning_cn: string;
	meaning_vi: string;
	image: string;
	selection1: string;
	selection2: string;
	selection3: string;
	selection4: string;
	answer_index: number;
}

export const wordQuizList: WordQuizItem[] = wordQuizData as WordQuizItem[];
