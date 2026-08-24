/**
 * /learn/jamo 검색 파라미터 — dev_spec §4 의 "6→1 통합"
 *
 * 전에는 `?code=YK0001` 로 콘텐츠 ID 를 URL 에 실었다. 그 ID 를 걷어내고
 * 주소로 짚는다.
 *
 *     /learn/jamo?level=1&lesson=1&group=1&sub=1
 *
 * 명세는 `?level&lesson&sub` 라고 적었는데 그것만으로는 묶음을 못 짚는다 —
 * 한 과에 묶음이 셋이고(모음1·자음1·자음2) 각자 자기 활동을 갖는다.
 * BLOCKERS.md §2 도 "(과, sub, 묶음)" 셋이 필요하다고 적어 두었다.
 * 그래서 group 을 하나 더 받는다. (과, 묶음, 활동) 이 모듈을 유일하게
 * 가리키는 것은 전수로 확인했다 — 38 주소 ↔ 38 모듈.
 *
 * 옛 링크(`?code=`)도 받는다. 북마크가 살아 있고, 받으면 주소로 바꿔
 * 같은 화면을 낸다 — shared/data/jamo.ts 의 addressOfModule.
 */
import { addressOfModule } from "@/shared/data/jamo";

export interface JamoSearch {
	level?: number;
	lesson?: number;
	group?: number;
	sub?: number;
	/** 옛 링크 호환. 있으면 위 넷을 여기서 푼다 */
	code?: string;
}

const num = (v: unknown): number | undefined => Number(v) || undefined;

export function parseJamoSearch(search: Record<string, unknown>): JamoSearch {
	const code = search.code ? String(search.code) : undefined;
	if (code) {
		const a = addressOfModule(code);
		if (a) return { ...a, code };
	}
	return {
		level: num(search.level) ?? 1,
		// 구 링크는 과를 chapterSeq · chapter 로 실어 보낸 것도 있다
		lesson: num(search.lesson) ?? num(search.chapterSeq) ?? num(search.chapter),
		group: num(search.group) ?? num(search.unit),
		sub: num(search.sub),
		code,
	};
}
