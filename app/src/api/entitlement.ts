import { api } from "./api";

/**
 * 열린 범위 — `GET /entitlement` (access_and_pricing_v1 §04)
 *
 * **앱은 권한을 계산하지 않는다.** 이 응답 하나가 모든 잠금을 결정한다.
 * 출처가 무엇이든(무료 · 학교 계약 · 개인 결제) 받는 모양은 같으므로
 * 출처가 늘어도 이 파일은 고치지 않는다.
 */
export type EntitlementSource = "guest" | "school" | "purchase";

export interface Entitlement {
	source: EntitlementSource;
	/** 통째로 열린 급 */
	books: number[];
	/** 급 안에서 예외로 열린 과 — 키가 급, 값이 과 번호들 */
	chapters: Record<string, number[]>;
	/** 열린 자모 과 */
	jamo_chapters: number[];
	/** 열린 게임 키 — list-view 의 GAMES.key 와 같은 값이다 */
	games: string[];
	clips: boolean;
	/** 구독이면 만료 시각. 무료·학교면 null */
	expires_at: string | null;
}

/**
 * **서버가 답하지 않으면 `null` 을 낸다 — 잠금을 아예 그리지 않는다.**
 *
 * 처음엔 "무료 범위로 닫는다(fail closed)" 로 썼다가 되돌렸다. 무료 범위를
 * 앱에 또 적으면 경계가 두 곳에 있게 되고(이 저장소가 가장 자주 어긋난 자리),
 * 비운 값으로 닫으면 **서버가 잠깐 죽은 사이 교재 전체가 잠긴 것처럼 보인다.**
 * 게스트가 첫 화면에서 아무것도 못 하는 쪽이 더 나쁘다.
 *
 * 열어 두는 것이 위험하지 않은 이유 — **이 잠금은 아직 표시일 뿐이다.**
 * 콘텐츠를 내주는 라우트에 권한이 안 붙어 있어(access_and_pricing_v1 §08 의 3번)
 * 잠금이 있어도 주소로는 새 나간다. 막는 것은 서버의 일이고 결제와 같이 온다.
 * 그때는 이 자리도 다시 봐야 한다 — 산 사람에게 손해가 되지 않는 재시도·캐시가
 * 필요해진다.
 */
export async function getEntitlement(): Promise<Entitlement | null> {
	try {
		const res = await api.get<Entitlement>("/entitlement");
		if (!res.result || !res.data) return null;
		const d = res.data;
		// 서버가 모양을 어겨도 화면이 터지지 않게 자리를 채운다 — api.ts 의 asArray 와 같은 뜻
		return {
			source: d.source ?? "guest",
			books: Array.isArray(d.books) ? d.books : [],
			chapters: d.chapters && typeof d.chapters === "object" ? d.chapters : {},
			jamo_chapters: Array.isArray(d.jamo_chapters) ? d.jamo_chapters : [],
			games: Array.isArray(d.games) ? d.games : [],
			clips: d.clips !== false,
			expires_at: d.expires_at ?? null,
		};
	} catch {
		return null;
	}
}

/** 교재의 한 과가 열려 있나. 급 전체가 열렸으면 과를 안 본다 */
export function isChapterOpen(
	ent: Entitlement | null,
	bookId: number,
	seq: number,
): boolean {
	if (!ent) return false;
	if (ent.books.includes(bookId)) return true;
	return (ent.chapters[String(bookId)] ?? []).includes(seq);
}

/** 자모의 한 과가 열려 있나 */
export function isJamoChapterOpen(
	ent: Entitlement | null,
	seq: number,
): boolean {
	if (!ent) return false;
	return ent.jamo_chapters.includes(seq);
}

/** 게임 하나가 열려 있나 */
export function isGameOpen(ent: Entitlement | null, key: string): boolean {
	if (!ent) return false;
	return ent.games.includes(key);
}
