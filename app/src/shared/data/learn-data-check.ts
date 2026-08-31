/**
 * 이 과에서 그 활동을 열 수 있나 · 몇 개인가 — **서버 매니페스트가 답한다** (DEV-05)
 *
 * 2026-08-31 까지는 이 파일이 **번들의 원장 JSON 다섯을 직접 읽어** 답했다
 * (`n2` · `n3` · `n4` · `n5` 둘 + 어휘 둘). 그 다섯이 콘텐츠 8.9MB 의 큰 몫이라,
 * 그것을 번들에서 걷어내려면 이 물음부터 서버로 옮겨야 했다.
 *
 * **셈법은 그대로 옮겼다.** 활동마다 화면이 세는 것이 다르다 —
 *
 *   word           어휘가 아니라 **퀴즈** 수
 *   roleplay       대사가 아니라 **시나리오** 수
 *   listen-answer  지문이 아니라 **문항** 수
 *   read-answer    지문이 아니라 **문항** 수
 *   flashcard      세트가 아니라 **카드** 수
 *
 * 서버(`repo_content.countAll`)가 그 셈법대로 낸다. 옮기고 나서 **120과 전부를
 * 옛 셈법과 대 봤고 어긋난 과가 0개**였다.
 *
 * ## 인자가 하나 늘었다
 *
 * 답이 서버에서 오므로 더는 순수 함수가 아니다. 그렇다고 여기서 통신하면 화면마다
 * 다른 답을 들 수 있어서, **받아 온 것을 인자로 받는다** — 부르는 쪽이
 * `useManifest()` 로 한 번 받아 넘긴다.
 */
import type { MenuType } from "@/api/content";
import {
	type CountMap,
	activityCount,
	hasActivity,
} from "@/shared/store/manifest-store";

export function hasWordData(m: CountMap, bookId: number, seq: number): boolean {
	return hasActivity(m, bookId, seq, "word");
}

export function hasRoleplayData(m: CountMap, bookId: number, seq: number): boolean {
	return hasActivity(m, bookId, seq, "roleplay");
}

export function hasListenData(m: CountMap, bookId: number, seq: number): boolean {
	return hasActivity(m, bookId, seq, "listen-answer");
}

export function hasBlankData(m: CountMap, bookId: number, seq: number): boolean {
	return hasActivity(m, bookId, seq, "fill-blank");
}

export function hasReadData(m: CountMap, bookId: number, seq: number): boolean {
	return hasActivity(m, bookId, seq, "read-answer");
}

export function hasFlashcardData(m: CountMap, bookId: number, seq: number): boolean {
	return hasActivity(m, bookId, seq, "flashcard");
}

export function hasMissionChatData(m: CountMap, bookId: number, seq: number): boolean {
	return hasActivity(m, bookId, seq, "mission-chat");
}

export function getWordQuizCount(m: CountMap, bookId: number, seq: number): number {
	return activityCount(m, bookId, seq, "word");
}

export function getRoleplayScenarioCount(m: CountMap, bookId: number, seq: number): number {
	return activityCount(m, bookId, seq, "roleplay");
}

export function getListenQuestionCount(m: CountMap, bookId: number, seq: number): number {
	return activityCount(m, bookId, seq, "listen-answer");
}

export function getBlankQuestionCount(m: CountMap, bookId: number, seq: number): number {
	return activityCount(m, bookId, seq, "fill-blank");
}

export function getReadQuestionCount(m: CountMap, bookId: number, seq: number): number {
	return activityCount(m, bookId, seq, "read-answer");
}

/** 플래시카드 **카드** 수 — 목록 화면이 「다 봤나」를 이 수로 판정한다 */
export function getFlashcardWordCount(m: CountMap, bookId: number, seq: number): number {
	return activityCount(m, bookId, seq, "flashcard");
}

export type { MenuType };
