
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

/*
 * **번들의 배열을 걷었다**(2026-08-31 · DEV-05). 어휘는 서버에서 온다 —
 * `useChapterContent(bookId, chapterSeq, "word")` 가 `words`·`quiz` 를 같이 준다.
 * 여기 남은 것은 **모양(타입)뿐**이다.
 */
