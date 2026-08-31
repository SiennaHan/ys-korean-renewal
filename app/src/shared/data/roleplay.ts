
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

/**
 * 대사를 시나리오로 묶는다 (scenario_id 기준).
 *
 * **대사는 서버에서 온다**(2026-08-31 · DEV-05). 전에는 이 파일이 번들의
 * `n2_ai_role_play.json` 을 통째로 들고 걸렀다. 지금은 **묶고 정렬하는 일만**
 * 한다 — 그 과의 대사만 오므로 거를 것이 없다.
 */
export function getScenarios(
	turns: RoleplayTurn[],
): { scenarioId: string; title: string; turns: RoleplayTurn[] }[] {
	const filtered = turns;

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
