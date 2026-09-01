/**
 * 미션대화 콘텐츠 — 원장(n7_mission_chat)으로 가는 문
 *
 * 전에는 브리핑 화면이 구 앱 덤프(dialog.ts · dialog_keyword.ts · dialog_word.ts)를
 * module_code 로 걸러 썼다. 그 파일들의 상황·미션 설명은 v25 시점 스냅샷이라
 * 이후 검수(v29)에서 고친 내용이 반영돼 있지 않다. 이제 원장에서 생성한
 * n7_mission_chat.json 을 쓴다 — 117행 전량 검수 완료(BLOCKERS.md §8).
 *
 * **실제 AI 대화도 2026-09-01 부터 이 원장을 본다.** 서버가 읽던 `ko_chat_dialog`
 * 는 0행이었고 열쇠도 안 맞았다(`id` 가 int 라 MySQL 이 `"C4"` 를 `id=0` 으로
 * 견줬다). 그래서 `repo_chat.getDialog` 가 `ko_mission_chat` 을 `legacy_id` 로
 * 읽도록 옮겼다 — BLOCKERS.md §8.
 *
 * `dialogId` 는 그대로 구 체계(`legacy_id`, 예: "C4")다. 사용자 대화 기록
 * `ko_chat.dialog_id` 가 이미 그 값을 담고 있어 바꾸면 기록이 끊긴다.
 */

export interface MissionChatItem {
	item_id: string;
	book_id: number;
	chapter: number;
	scenario_title: string;
	situation_ko: string;
	situation_en: string;
	situation_jp: string;
	situation_cn: string;
	situation_vi: string;
	mission_detail: string;
	mission_prime_ko: string;
	ai_persona_prompt: string;
	ai_first_line: string;
	target_grammar: string;
	level: string;
	content_img: string;
	video_refs: string;
	legacy_id: string;
	module_code: string;
	review_status: string;
	source_page: string;
	change_note: string;
	hold_reason: string;
	ai_gender: string;
	ai_role: string;
	user_role: string;
}

/*
 * **번들의 배열을 걷었다**(2026-08-31 · DEV-05). 시나리오는 서버에서 온다 —
 * `useChapterContent(bookId, chapterSeq, "mission-chat")` 이 `scenarios` 를 준다.
 * 과당 하나라 첫 항목이 곧 그 과의 시나리오다.
 */
export function firstMissionChat(
	scenarios: MissionChatItem[],
): MissionChatItem | undefined {
	return scenarios[0];
}

/** "인사: Say hello. / 이름: Say what your name is." → [{label, instruction}] */
export interface MissionKeyword {
	label: string;
	instruction: string;
}

export function parseMissionDetail(missionDetail: string): MissionKeyword[] {
	if (!missionDetail) return [];
	return missionDetail
		.split(" / ")
		.map((chunk) => {
			const i = chunk.indexOf(":");
			if (i < 0) return { label: chunk.trim(), instruction: "" };
			return {
				label: chunk.slice(0, i).trim(),
				instruction: chunk.slice(i + 1).trim(),
			};
		})
		.filter((item) => item.label);
}

/**
 * 미션 슬롯마다 모범 문장 하나 — 원장 `n7_mission_hint`(354행).
 *
 * **브리핑에서만 쓴다.** 대화 화면에는 힌트를 여는 길이 없다(93e869f) — 그래야
 * 대화 중에 베낄 문장이 화면에 없고 미션 발화가 전부 기억에서 나온다.
 *
 * `chat_item_id` 가 부모 미션(`MC-1-04-001`)이고 `item_id` 는 이 행(`MH-…-1`)이다.
 * 서버 열 이름이 원장과 뒤집혀 있다 — `api/persistence/model.py` 의 그 절.
 */
export interface MissionHintItem {
	item_id: string;
	chat_item_id: string;
	book_id: number;
	chapter: number;
	slot_seq: number;
	mission_label: string;
	hint_ko: string;
	hint_en: string;
	hint_jp: string;
	hint_cn: string;
	hint_vi: string;
	hint_grammar: string;
}

/** 학습자 언어의 번역. 없으면 영어로, 그것도 없으면 빈 문자열 */
function hintTranslated(hint: MissionHintItem, lang: string): string {
	if (lang === "ja" && hint.hint_jp) return hint.hint_jp;
	if (lang === "zh" && hint.hint_cn) return hint.hint_cn;
	if (lang === "vi" && hint.hint_vi) return hint.hint_vi;
	return hint.hint_en ?? "";
}

/**
 * 브리핑이 그릴 [한국어, 번역] 짝 — **`slot_seq` 순서 그대로**.
 *
 * 브리핑은 `keywords` 와 `hints` 를 **자리로** 짝지어 그린다. 그래서 순서가
 * 곧 뜻이고, 어긋나면 「이름」 밑에 인사 문장이 붙는데 **화면은 멀쩡해 보인다** —
 * 구 앱 덤프가 정확히 그 꼴이었다(117과 중 109과). 원장 쪽에서 그것을 막는 것은
 * `build-content.py` 의 `hint_slot_mismatch` 다.
 *
 * 그래서 여기서는 **개수가 안 맞으면 아예 안 그린다.** 모자란 채로 그리면 남은
 * 라벨에 엉뚱한 문장이 붙는데, 힌트가 없는 것보다 나쁘다.
 */
export function hintsFor(
	hints: MissionHintItem[],
	chatItemId: string,
	missionCount: number,
	lang: string,
): [string, string][] {
	const mine = hints
		.filter((h) => h.chat_item_id === chatItemId)
		.sort((a, b) => a.slot_seq - b.slot_seq);
	if (mine.length !== missionCount) return [];
	return mine.map((h) => [h.hint_ko, hintTranslated(h, lang)]);
}
