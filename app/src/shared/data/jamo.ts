/**
 * 자모 콘텐츠 — 원장(n8_jamo)으로 가는 문
 *
 * 전에는 화면 여섯이 각자 `problems`(problem.ts, 구 앱 덤프)를 module_code 로
 * 걸러 썼다. 이제 원장에서 생성한 n8_jamo.json 을 쓴다 — 같은 529항목이고
 * 내용이 바뀌지 않는다(BLOCKERS.md §2). 바뀐 것은 배관과 주소다.
 *
 * 주소는 (과, 묶음, 활동) 셋이다. 명세(dev_spec §4)는 `?level&lesson&sub` 라고
 * 적었지만 그것만으로는 묶음을 짚을 수 없다 — 한 과에 묶음이 셋이고 각자
 * 자기 활동 다섯을 갖는다. BLOCKERS.md §2 도 "(과, sub, 묶음)" 셋이 필요하다고
 * 적어 두었다. 그래서 group 을 하나 더 받는다.
 *
 * 이 셋이 모듈을 유일하게 가리키는지 전수로 확인했다 — 38 주소 ↔ 38 모듈,
 * 양방향 1:1 이다. 그래서 URL 에서 콘텐츠 ID(module_code)를 걷어낼 수 있다.
 * 다만 데이터는 module_code 를 계속 들고 있다 — wordgroup 처럼 그 키로
 * 조인하는 옛 표가 아직 있기 때문이다. URL 에서만 빠진다.
 */
import raw from "@/shared/data/n8_jamo.json";
import { units } from "@/shared/data/unit";

export interface JamoItem {
	item_id: string;
	book_id: number;
	chapter: number;
	jamo_group: string;
	activity_sub: string;
	target_jamo: string;
	target_word: string;
	word_refs: string;
	instruction: string;
	problem_type: string;
	choice_1: string;
	answer_1: string;
	choice_2: string;
	answer_2: string;
	choice_3: string;
	answer_3: string;
	pronunciation: string;
	content_img: string;
	content_vid: string;
	content_sound: string;
	legacy_id: string;
	module_code: string;
	scene_num: string;
	review_status: string;
	source_page: string;
	change_note: string;
	hold_reason: string;
}

export const jamoItems = raw as JamoItem[];

/**
 * 활동 번호 ↔ 원장의 activity_sub.
 *
 * 번호는 구 라우트 여섯과 같은 순서다 — dev_spec §4 의 sub=1~6.
 * 3과(받침·겹받침)는 2·3 이 없고 6 이 있다. 5개가 고르게 있다는 가정을
 * 코드에 두지 마라 — 실제로 [1,4,5,6] 인 묶음이 둘이다.
 */
export const JAMO_SUBS = [
	"listen-repeat", // 1 발음 듣고 따라하기
	"write", // 2 자음·모음 조합하기
	"listen-repeat2", // 3 단어 듣고 따라하기
	"read-write", // 4 단어 쓰기
	"listen", // 5 듣고 고르기
	"write3", // 6 조합하기 — 받침이 붙는 판(화면 이름은 sub 2 와 같다. BLOCKERS §2)
] as const;

export type JamoSub = (typeof JAMO_SUBS)[number];

export function subToNumber(sub: string): number | undefined {
	const i = JAMO_SUBS.indexOf(sub as JamoSub);
	return i < 0 ? undefined : i + 1;
}

export function numberToSub(n: number): JamoSub | undefined {
	return JAMO_SUBS[n - 1];
}

export interface JamoAddress {
	/** 급. 한글은 1급 안에 있다 */
	level: number;
	/** 한글 몇 과 (1~3) */
	lesson: number;
	/** 그 과의 몇 번째 묶음 (1~3) */
	group: number;
	/** 활동 (1~6) */
	sub: number;
}

/** 묶음 제목 → (과, 묶음 순서). unit.ts 가 묶음의 정본이다 */
const GROUP_SEQ = new Map<string, { chapter: number; seq: number }>(
	units
		.filter((u) => /^(모음|자음|받침|겹받침)/.test(u.title))
		.map((u) => [u.title, { chapter: u.chapter_id, seq: u.seq }]),
);

/** (과, 묶음, 활동) → module_code. 생성 시점에 한 번 짓는다 */
const BY_ADDRESS = new Map<string, string>();
/** module_code → 주소. 옛 링크를 새 주소로 옮길 때 쓴다 */
const BY_MODULE = new Map<string, JamoAddress>();

for (const it of jamoItems) {
	const g = GROUP_SEQ.get(it.jamo_group);
	const sub = subToNumber(it.activity_sub);
	if (!g || !sub) continue;
	const addr: JamoAddress = {
		level: 1,
		lesson: g.chapter,
		group: g.seq,
		sub,
	};
	BY_ADDRESS.set(addressKey(addr), it.module_code);
	BY_MODULE.set(it.module_code, addr);
}

function addressKey(a: Pick<JamoAddress, "lesson" | "group" | "sub">): string {
	return `${a.lesson}/${a.group}/${a.sub}`;
}

/** 그 주소의 모듈과 문항. 주소가 비었으면 items 가 빈 배열이다 */
export function resolveJamo(a: Partial<JamoAddress>): {
	moduleCode: string | undefined;
	items: JamoItem[];
} {
	if (a.lesson == null || a.group == null || a.sub == null) {
		return { moduleCode: undefined, items: [] };
	}
	const moduleCode = BY_ADDRESS.get(
		addressKey({ lesson: a.lesson, group: a.group, sub: a.sub }),
	);
	if (!moduleCode) return { moduleCode: undefined, items: [] };
	return {
		moduleCode,
		items: jamoItems.filter((it) => it.module_code === moduleCode),
	};
}

/** 옛 링크(?code=YK0001)를 새 주소로. 리다이렉트와 목록이 쓴다 */
export function addressOfModule(moduleCode: string): JamoAddress | undefined {
	return BY_MODULE.get(moduleCode);
}

/** 그 과·묶음에 실제로 있는 활동 번호들. 5개라고 가정하지 않는다 */
export function subsInGroup(lesson: number, group: number): number[] {
	const out: number[] = [];
	for (let sub = 1; sub <= JAMO_SUBS.length; sub++) {
		if (BY_ADDRESS.has(addressKey({ lesson, group, sub }))) out.push(sub);
	}
	return out;
}
