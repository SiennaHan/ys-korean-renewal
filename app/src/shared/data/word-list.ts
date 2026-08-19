import wordListData from "./n1_word_list.json";

export interface WordItem {
	id: number;
	book_id: number;
	chapter: number;
	word: string;
	en: string;
	jp: string;
	cn: string;
	vi: string;
	sound: string;
	image: string;
	category: string;
	theme: string;
}

export const wordList: WordItem[] = wordListData as WordItem[];
