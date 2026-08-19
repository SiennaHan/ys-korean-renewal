import roleplayData from "./n2_ai_role_play.json";

export interface RoleplayTurn {
	id: number;
	book_id: number;
	chapter: number;
	scenario_id: string;
	title: string;
	mode: string;
	turn_seq: number;
	speaker: string;
	gender: string;
	ko: string;
	en: string;
	jp: string;
	cn: string;
	vi: string;
}

export const roleplayList: RoleplayTurn[] = roleplayData as RoleplayTurn[];

/** 특정 book/chapter에 해당하는 시나리오 목록 (scenario_id 기준 그룹핑) */
export function getScenarios(
	bookId: number,
	chapter: number,
): { scenarioId: string; title: string; turns: RoleplayTurn[] }[] {
	const filtered = roleplayList.filter(
		(r) => r.book_id === bookId && r.chapter === chapter,
	);

	const map = new Map<string, { title: string; turns: RoleplayTurn[] }>();
	for (const turn of filtered) {
		let entry = map.get(turn.scenario_id);
		if (!entry) {
			entry = { title: turn.title, turns: [] };
			map.set(turn.scenario_id, entry);
		}
		entry.turns.push(turn);
	}

	// turn_seq 순 정렬
	for (const entry of map.values()) {
		entry.turns.sort((a, b) => a.turn_seq - b.turn_seq);
	}

	return Array.from(map.entries()).map(([scenarioId, entry]) => ({
		scenarioId,
		title: entry.title,
		turns: entry.turns,
	}));
}
