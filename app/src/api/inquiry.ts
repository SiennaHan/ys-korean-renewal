import { api } from "./api";

/**
 * 문의 — `POST /inquiry` (docs/legal_draft_v1.html §02 의 「문의처」)
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

/**
 * 화면 캡처 첨부 — 서버(`business/inquiry.py`)와 같은 한도다.
 *
 * **두 곳에 있는 것이 맞다.** 화면은 고르는 즉시 알려 주려고, 서버는 앱을 안
 * 거치고 부를 수 있어서. 서버는 mime 을 **매직 바이트로 다시 본다** —
 * `image/png` 이라고 써 놓고 아무것이나 넣을 수 있기 때문이다.
 */
export const INQUIRY_FILE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const INQUIRY_MAX_FILES = 3;
export const INQUIRY_MAX_FILE_BYTES = 5 * 1024 * 1024;

/** 파일을 `data:image/png;base64,...` 로. 서버가 그 꼴을 받는다 */
export function toDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

/**
 * `topic` 이 재현 정보(세 칸)를 받는 유형인가.
 *
 * **서버는 이 목록을 모른다** — `actual`·`expected` 를 유형과 무관하게
 * 선택으로 받는다(`business/inquiry.py`). 「어느 유형이 세 칸이냐」는 화면의
 * 판단이라 여기 한 곳에만 둔다 — 서버에도 같은 목록이 생기면 둘이 갈라진다.
 */
export const INQUIRY_REPRO_TOPICS: InquiryTopic[] = ["bug", "content"];

export async function sendInquiry(input: {
	replyEmail: string;
	topic: InquiryTopic;
	message: string;
	/** 실제로 어떻게 됐는지 — 재현 유형(bug·content)에서만 보낸다 */
	actual?: string;
	/** 어떻게 되길 기대했는지 — 재현 유형에서도 선택이다 */
	expected?: string;
	lang: string;
	fromPath: string;
	/** `data:image/…;base64,…` 최대 3장 */
	files?: string[];
}): Promise<{
	success: boolean;
	id?: number;
	/** 우리 저장소에 남은 캡처 수 */
	files?: number;
	/** **담당자 채널에 닿은 수.** 저장이 실패해도 여기로는 갈 수 있다 */
	filesDelivered?: number;
	/** 보내려 한 캡처 수. 저장된 것보다 많으면 화면이 그것을 말해야 한다 */
	filesAttempted?: number;
	error?: string;
}> {
	try {
		const res = await api.post<
			| {
					id: number;
					files: number;
					filesDelivered: number;
					filesAttempted: number;
			  }
			| { error: string }
		>("/inquiry", input);
		if (!res.result || !res.data)
			return { success: false, error: "inquiryFailed" };
		if ("error" in res.data) return { success: false, error: res.data.error };
		return {
			success: true,
			id: res.data.id,
			files: res.data.files,
			filesDelivered: res.data.filesDelivered,
			filesAttempted: res.data.filesAttempted,
		};
	} catch (error) {
		console.error(error);
		return { success: false, error: "inquiryFailed" };
	}
}
