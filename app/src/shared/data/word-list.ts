
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

/*
 * **번들의 배열을 걷었다**(2026-08-31 · DEV-05). 어휘는 서버에서 온다 —
 * `useChapterContent(bookId, chapterSeq, "word")` 가 `words`·`quiz` 를 같이 준다.
 * 여기 남은 것은 **모양(타입)뿐**이다.
 */
