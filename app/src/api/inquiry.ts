import { api } from "./api";

/**
 * 문의 — `POST /inquiry` (phase1/legal_draft_v1.html §02 의 「문의처」)
 *
 * **전화를 두지 않는다.** 이용자 상당수가 국외라 통화가 현실적이지 않다
 * (기획 확정 2026-08-27). 글로 받아 슬랙으로 꽂는다.
 *
 * 게스트도 보낼 수 있다. 그래서 답장 주소를 본문에서 받는다 —
 * 게스트는 계정 이메일이 없다.
 */
export const INQUIRY_TOPICS = [
	"payment",
	"account",
	"content",
	"bug",
	"etc",
] as const;

export type InquiryTopic = (typeof INQUIRY_TOPICS)[number];

/** 서버와 같은 값. 서버도 2000자에서 자른다 */
export const INQUIRY_MAX = 2000;

export async function sendInquiry(input: {
	replyEmail: string;
	topic: InquiryTopic;
	message: string;
	lang: string;
	fromPath: string;
}): Promise<{ success: boolean; id?: number; error?: string }> {
	try {
		const res = await api.post<{ id: number } | { error: string }>(
			"/inquiry",
			input,
		);
		if (!res.result || !res.data)
			return { success: false, error: "inquiryFailed" };
		if ("error" in res.data) return { success: false, error: res.data.error };
		return { success: true, id: res.data.id };
	} catch (error) {
		console.error(error);
		return { success: false, error: "inquiryFailed" };
	}
}
