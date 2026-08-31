/**
 * 플래시카드 세트 — 원장 n6_flashcard 에서 만든다.
 *
 * 전에는 이 파일이 구 앱에서 옮겨 온 1급 12세트를 손으로 들고 있었다.
 * 2~8급 105세트를 원장에 저작하면서 원장을 읽도록 바꿨다(2026-08-26).
 * 값을 여기에 적지 마라 — 고칠 것은 원장이고 `build-content.py` 로 다시 만든다.
 *
 * **숫자 id 는 서버가 쓴다**(`/flashcard/{flashcardId}/{cardType}`). 그래서
 * 구 앱이 쓰던 1~12 를 1급 4~15과에 그대로 남긴다 — 이미 쌓인 학습 기록이
 * 다른 세트를 가리키면 안 된다. 새 세트는 `급*100 + 과` 로 준다(201~815).
 * 둘은 겹치지 않는다.
 */

export interface FlashcardSet {
	id: number;
	book_id: number;
	chapter: number;
	title: string;
	card_count: number;
}

interface RawSet {
	item_id: string;
	book_id: number;
	chapter: number;
	set_title: string;
	card_count: number;
}

/** 구 앱이 쓰던 1급 세트 id — 서버 기록과 이어져 있으므로 바꾸지 않는다 */
const LEGACY_ID: Record<number, number> = {
	4: 1, 5: 2, 6: 3, 7: 4, 8: 5, 9: 6,
	10: 7, 11: 8, 12: 9, 13: 10, 14: 11, 15: 12,
};

export function setNumericId(bookId: number, chapter: number): number {
	if (bookId === 1 && LEGACY_ID[chapter]) return LEGACY_ID[chapter];
	return bookId * 100 + chapter;
}

/*
 * **번들의 배열을 걷었다**(2026-08-31 · DEV-05). 세트는 서버에서 온다 —
 * `useChapterContent(bookId, chapterSeq, "flashcard")` 가 `sets`·`cards` 를 같이 준다.
 * `setNumericId` 는 남는다 — **세트 번호는 급·과에서 계산하는 값**이고
 * 학습자 기록(`ko_user_flashcard*`)이 그 값을 쓴다.
 */
