
export interface WordItem {
	/**
	 * 원장 열쇠. **화면에서 낱말을 가리킬 때는 이것을 쓴다.**
	 * 숫자 id 는 원장에서 167행이 비어 있어(2급 9과만 12개) 열쇠가 못 된다 —
	 * 서버도 같은 이유로 ko_word 의 주키를 item_id 로 두고 숫자는 ledger_id 로 뺐다.
	 */
	item_id: string;
	/** 원장의 숫자 id (= 서버의 ledger_id). 비어 있을 수 있다. 학습 기록이 이 값을 쓴다 */
	id: number | null;
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
