/**
 * 플래시카드 낱말 — 원장 n6_flashcard_card 에서 만든다.
 *
 * 값을 여기에 적지 마라. 고칠 것은 원장이다 — 위 flashcard.ts 의 설명을 봐라.
 *
 * **뜻이 네 언어다.** 앱은 en·ko·ja·zh·vi 를 지원하는데 이 시트는 오래
 * `meaning_en` 하나뿐이었다. 카드에 그림을 다 붙일 수 없으니 뜻 글자가
 * 유일한 단서인데 일본어·중국어·베트남어 사용자에게 영어가 나왔다.
 * 원장에 meaning_jp·cn·vi 를 넣고(2026-08-26) 여기서 함께 내보낸다.
 * 아직 다 채우지는 못했다 — 비어 있으면 `meaningFor()` 가 영어로 되돌린다.
 *
 * 카드 id 는 문자열이고 서버가 쓴다. 구 앱 카드는 legacy_id(F1~F328)를
 * 그대로 쓰고, 새 카드는 원장 item_id(FCW-3-1-001)를 쓴다.
 */
import { setNumericId } from "./flashcard";
import raw from "./n6_flashcard_card.json";

export interface FlashcardWord {
	flashcard_id: number;
	module_code: string;
	id: string;
	word: string;
	/** 영어 뜻. 화면은 `meaningFor()` 로 언어에 맞는 뜻을 고른다 */
	meaning: string;
	jp: string;
	cn: string;
	vi: string;
	image: string;
	sound_kor: string;
	sound_eng: string;
}

interface RawCard {
	item_id: string;
	book_id: number;
	chapter: number;
	word: string;
	meaning_en: string;
	meaning_jp: string;
	meaning_cn: string;
	meaning_vi: string;
	image: string;
	legacy_id: string;
}

export const flashcard_words: FlashcardWord[] = (raw as RawCard[]).map((c) => ({
	flashcard_id: setNumericId(c.book_id, c.chapter),
	module_code: "",
	id: c.legacy_id || c.item_id,
	word: c.word,
	meaning: c.meaning_en,
	jp: c.meaning_jp ?? "",
	cn: c.meaning_cn ?? "",
	vi: c.meaning_vi ?? "",
	image: c.image ?? "",
	sound_kor: "",
	sound_eng: "",
}));

/**
 * i18n 언어 코드로 뜻을 고른다.
 *
 * 코드가 둘로 갈린다 — i18n 은 `ja`·`zh`, 데이터는 `jp`·`cn` 이다
 * (n1_word_list 가 먼저 그렇게 쓰고 있어 맞췄다). 여기서 이어 준다.
 * 아직 안 채워진 칸은 영어로 되돌린다.
 */
export function meaningFor(card: FlashcardWord, lang: string): string {
	if (lang === "ja") return card.jp || card.meaning;
	if (lang === "zh") return card.cn || card.meaning;
	if (lang === "vi") return card.vi || card.meaning;
	return card.meaning;
}
