/**
 * 교재 콘텐츠 — 서버에서 받는다 (DEV-05 · PD-03 확정 2026-08-31)
 *
 * 전에는 `n*.json` 13개가 **앱 번들에 통째로** 실려서, 앱을 열기만 하면 교재
 * 전체(8.9MB)가 기기로 내려갔다. 자물쇠는 화면에만 있었다.
 *
 * ## 길이 둘이다
 *
 *   `getContentManifest()`  과별 **개수만** + 콘텐츠 판본. 본문 없음 · 토큰 없이도 된다
 *   `getChapterContent()`   본문. 잠긴 과면 서버가 402 를 낸다
 *
 * 목록 화면은 잠긴 과에도 자물쇠와 「몇 문항」을 그려야 해서 개수가 필요하다.
 * 수만으로는 콘텐츠가 새지 않으므로 매니페스트는 권한을 안 본다.
 *
 * ## 응답은 JSON 시절 모양 그대로다
 *
 * 서버 표는 `chapter_seq`·`ledger_id` 로 두었지만 응답은 `chapter`·`id` 로 낸다.
 * 그래서 이 파일을 쓰는 쪽은 **어디서 오느냐만 바뀌고 무엇이냐는 안 바뀐다.**
 */
import { api, authFetch } from "./api";

/** `menuType` — 앱·서버 가드·활동 상태가 이미 함께 쓰는 여덟 */
export type MenuType =
	| "word"
	| "roleplay"
	| "listen-answer"
	| "fill-blank"
	| "read-answer"
	| "flashcard"
	| "mission-chat"
	| "jamo";

/** 활동 하나가 표 여럿을 쓴다 — 듣기는 지문·줄·문항 셋이다 */
export type ContentBundle = Record<string, Record<string, unknown>[]>;

export interface ChapterCounts {
	bookId: number;
	chapterSeq: number;
	counts: Partial<Record<MenuType, number>>;
}

/**
 * 매니페스트 응답.
 *
 * `version` 은 서버 표 열셋의 `max(updated_at)` 이다 — **원장이 개정되면 달라지는
 * 값**이고, 그것 말고는 앱이 아무 뜻도 부여하지 않는다(캐시를 버릴지만 정한다).
 * 못 받았으면 빈 문자열이고, 그때는 캐시를 **건드리지 않는다** — 판본을 모르는
 * 상태에서 버리면 서버가 잠깐 죽은 사이 오프라인 학습까지 날아간다.
 */
export interface ContentManifest {
	version: string;
	chapters: ChapterCounts[];
}

/**
 * 서버가 잠긴 과에 내는 답. 화면이 402 를 **다른 실패와 구별해야** 한다 —
 * 네트워크가 끊긴 것과 권한이 없는 것은 사용자에게 할 말이 다르다.
 */
export class ContentLockedError extends Error {
	constructor() {
		super("locked");
		this.name = "ContentLockedError";
	}
}

export async function getContentManifest(): Promise<ContentManifest> {
	const res = await api.get<ContentManifest>("/content/manifest");
	const data = res.result ? res.data : undefined;
	return {
		version: typeof data?.version === "string" ? data.version : "",
		chapters: Array.isArray(data?.chapters) ? data.chapters : [],
	};
}

/**
 * **`api.get` 이 아니라 `authFetch` 를 직접 쓴다.**
 *
 * `handleResponse` 는 `!response.ok` 면 그냥 던진다(`api.ts` 145행). 그래서
 * `api.get` 으로는 402 가 `{result:false, code:402}` 로 오지 않고 **일반 Error 로
 * 뭉개진다** — 잠긴 것과 서버가 죽은 것을 구별할 수 없다. 상태코드를 봐야 한다.
 */
export async function getChapterContent(
	bookId: number,
	chapterSeq: number,
	menuType: MenuType,
): Promise<ContentBundle> {
	const response = await authFetch(
		`/content/${bookId}/${chapterSeq}/${menuType}`,
		{ method: "GET" },
	);
	if (response.status === 402) throw new ContentLockedError();
	if (!response.ok) {
		throw new Error(`content fetch failed: ${response.status}`);
	}
	const body = (await response.json()) as {
		result: boolean;
		data: ContentBundle | null;
		message: string | null;
	};
	if (!body.result) throw new Error(body.message || "content fetch failed");
	return body.data ?? {};
}
