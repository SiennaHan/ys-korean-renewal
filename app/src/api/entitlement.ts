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
const SOURCES: EntitlementSource[] = ["guest", "school", "purchase"];

/**
 * 받은 것이 **정말 답인지** 본다.
 *
 * 빈 객체를 자리 채워 받아들이면 안 된다. 다른 응답에서는 `{}` 가 "아무것도
 * 없는 사용자" 로 읽혀도 괜찮지만, 여기서는 그 뜻이 **전부 잠김** 이다.
 * 서버가 `{result:true, data:{}}` 를 내면(경로가 사라졌거나, 목 서버가 모르는
 * 경로에 그렇게 답한다) 앱은 `ready` 를 참으로 켜고 무료 과까지 잠근다 —
 * 2026-08-26 에 실제로 그렇게 보였다. 무료인 1급 4과에 자물쇠가 붙고, 바로 그
 * 안내문이 "1급 4과는 지금 볼 수 있습니다" 라고 적혀 있었다.
 *
 * 그래서 자리를 **채우지 않고 거절한다.** `source` 와 네 묶음이 다 있어야
 * 답으로 친다. 거절하면 `null` 이 되고, 화면은 잠금을 아예 그리지 않는다.
 */
function asEntitlement(data: unknown): Entitlement | null {
	if (!data || typeof data !== "object") return null;
	const d = data as Partial<Entitlement>;
	if (!d.source || !SOURCES.includes(d.source)) return null;
	if (!Array.isArray(d.books)) return null;
	if (!Array.isArray(d.jamo_chapters)) return null;
	if (!Array.isArray(d.games)) return null;
	if (!d.chapters || typeof d.chapters !== "object") return null;
	return {
		source: d.source,
		books: d.books,
		chapters: d.chapters,
		jamo_chapters: d.jamo_chapters,
		games: d.games,
		clips: d.clips !== false,
		expires_at: d.expires_at ?? null,
	};
}

export async function getEntitlement(): Promise<Entitlement | null> {
	try {
		const res = await api.get<Entitlement>("/entitlement");
		if (!res.result) return null;
		return asEntitlement(res.data);
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
