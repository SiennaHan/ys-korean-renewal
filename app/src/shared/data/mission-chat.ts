/**
 * 미션대화 콘텐츠 — 원장(n7_mission_chat)으로 가는 문
 *
 * 전에는 브리핑 화면이 구 앱 덤프(dialog.ts · dialog_keyword.ts · dialog_word.ts)를
 * module_code 로 걸러 썼다. 그 파일들의 상황·미션 설명은 v25 시점 스냅샷이라
 * 이후 검수(v29)에서 고친 내용이 반영돼 있지 않다. 이제 원장에서 생성한
 * n7_mission_chat.json 을 쓴다 — 117행 전량 검수 완료(BLOCKERS.md §8).
 *
 * ⚠️ 실제 AI 대화(백엔드 `/chat/{dialogId}/...`)는 아직 별도다. 그쪽은
 * `ko_chat_dialog` DB 테이블(자체 prompt·first_msg·mission·scenario 컬럼)을 쓰고,
 * 이 배선은 그 테이블을 건드리지 않는다 — 그래서 `dialogId` 는 이 파일이 아니라
 * 계속 구 체계(`legacy_id`, 예: "C4")를 쓴다. mission-dialog.tsx(실제 대화·미션
 * 완료 판정 화면)도 당분간 구 데이터를 그대로 쓴다 — 완료 판정이 백엔드가 돌려주는
 * 키워드 문자열과 정확히 맞아야 하는데, 백엔드는 아직 검수 전 라벨을 들고 있다.
 */
import raw from "@/shared/data/n7_mission_chat.json";

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

export const missionChats = raw as MissionChatItem[];

export function findMissionChat(
	bookId: number | undefined,
	chapter: number | undefined,
): MissionChatItem | undefined {
	return missionChats.find(
		(item) => item.book_id === bookId && item.chapter === chapter,
	);
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
