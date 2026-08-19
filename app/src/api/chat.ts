import i18n from "@/i18n";
import { api, authFetch } from "./api";
import type {
	ChatResponse,
	CheckMission,
	FeedbackItem,
	KoChat,
	KoChatMissionResponse,
	KoChatRequest,
	MsgResponse,
	ReportResponse,
	TranslateResponse,
} from "./apiType";

export async function getChatDialog(
	dialogId: string,
): Promise<KoChatMissionResponse | null> {
	try {
		const response = await api.get<KoChatMissionResponse>(
			`/chat/${dialogId}/user`,
		);
		if (!response.result || !response.data) return null;
		return response.data;
	} catch (error) {
		console.error("getChatDialog failed:", error);
		return null;
	}
}

export async function getMsgList(
	dialogId: string,
): Promise<MsgResponse | null> {
	try {
		const response = await api.get<MsgResponse>(`/chat/${dialogId}/msgs`);
		if (!response.result || !response.data) return null;
		return response.data;
	} catch (error) {
		console.error("getMsgList failed:", error);
		return null;
	}
}

export async function postChat(
	request: KoChatRequest,
): Promise<ChatResponse | null> {
	try {
		const response = await api.post<ChatResponse>("/chat/json", request);
		if (!response.result || !response.data) return null;
		return response.data;
	} catch (error) {
		console.error("postChat failed:", error);
		return null;
	}
}

/**
 * 실시간 TTS 스트리밍 (미션챗 AI 응답). Gemini streamGenerateContent 의 raw PCM 을
 * 스트리밍으로 받는다. Response 자체를 반환하며, 재생은 sharedAudio.playPcmStream 이 담당.
 */
export async function streamTts(
	text: string,
	voice = "female",
): Promise<Response | null> {
	try {
		const response = await authFetch("/tts/stream", {
			method: "POST",
			body: JSON.stringify({ text, voice }),
		});
		if (!response.ok || !response.body) return null;
		return response;
	} catch (error) {
		console.error("streamTts failed:", error);
		return null;
	}
}

/**
 * 임의 텍스트의 음성 URL을 가져온다 (AI 롤플레이 등 캐시 경로).
 * 서버가 공통 캐시(Gemini + S3)에 hash 기준으로 저장하므로 같은 (voice, text)는 재사용된다.
 */
export async function getTtsUrl(
	text: string,
	voice = "female",
): Promise<string | null> {
	try {
		const response = await api.post<{ url: string; cached: boolean }>(
			"/tts/generate",
			{ text, voice },
		);
		if (!response.result || !response.data) return null;
		return response.data.url;
	} catch (error) {
		console.error("getTtsUrl failed:", error);
		return null;
	}
}

/**
 * 단어(고립 어휘)의 음성 URL을 가져온다 (단어 학습·플래시카드).
 * 서버는 조회만 한다 — 음원은 사전생성 배치로 채워지므로, 아직 생성되지 않은 단어는
 * url이 비어 null이 반환된다. 호출부는 null이면 재생을 건너뛴다.
 */
export async function getWordTtsUrl(
	text: string,
	voice = "female",
): Promise<string | null> {
	try {
		const response = await api.post<{ url: string; cached: boolean }>(
			"/tts/word",
			{ text, voice },
		);
		if (!response.result || !response.data) return null;
		return response.data.url;
	} catch (error) {
		console.error("getWordTtsUrl failed:", error);
		return null;
	}
}

export interface ListenLinePayload {
	text: string;
	speaker: string;
	voice: string;
}

/**
 * 듣고 질문에 답하기 — 발화 라인들의 음성 URL 배열을 순서대로 가져온다.
 * 지시문은 음성 없이 화면에서 읽는다(생성/재생 안 함).
 * 첫 요청 시 서버가 생성·캐싱하고, 이후에는 캐시된 URL을 반환한다.
 */
export async function getListenAudio(
	lines: ListenLinePayload[],
): Promise<string[] | null> {
	try {
		const response = await api.post<{ urls: string[] }>("/tts/listen/audio", {
			lines,
		});
		if (!response.result || !response.data) return null;
		return response.data.urls;
	} catch (error) {
		console.error("getListenAudio failed:", error);
		return null;
	}
}

export function localeToLang(locale: string): string {
	if (locale.startsWith("en")) return "English";
	if (locale.startsWith("ja")) return "Japanese";
	if (locale.startsWith("zh")) return "Chinese";
	if (locale.startsWith("vi")) return "Vietnamese";
	if (locale.startsWith("ko")) return "Korean";
	if (locale.startsWith("fr")) return "French";
	if (locale.startsWith("de")) return "German";
	if (locale.startsWith("es")) return "Spanish";
	return "English";
}

export async function translate(
	msg: string,
	targetLang?: string,
): Promise<TranslateResponse | null> {
	try {
		const response = await api.post<TranslateResponse>("/chat/translate", {
			text: msg,
			targetLang: targetLang ?? localeToLang(i18n.language),
		});
		if (!response.result || !response.data) return null;
		return response.data;
	} catch (error) {
		console.error("translate failed:", error);
		return null;
	}
}

export async function postCheckMission(
	request: KoChatRequest,
): Promise<CheckMission | null> {
	try {
		// 피드백을 현재 UI 언어로 바로 생성받아 클라이언트 사후 번역(깜박임)을 제거
		const response = await api.post<CheckMission>("/chat/check/mission", {
			...request,
			lang: request.lang ?? localeToLang(i18n.language),
		});
		if (!response.result || !response.data) return null;
		return response.data;
	} catch (error) {
		console.error("postCheckMission failed:", error);
		return null;
	}
}

export async function postCompleteDialog(
	dialogId: string,
	chatId: number,
): Promise<KoChat | null> {
	try {
		const response = await api.post<KoChat>(
			`/dialog/${dialogId}/completed/${chatId}`,
		);
		if (!response.result || !response.data) return null;
		return response.data;
	} catch (error) {
		console.error("postCompleteDialog failed:", error);
		return null;
	}
}

export async function resetDialog(dialogId: string): Promise<KoChat | null> {
	try {
		const response = await api.post<KoChat>(`/dialog/${dialogId}/reset`);
		return response.data ?? null;
	} catch (error) {
		console.error("resetDialog failed:", error);
		return null;
	}
}

export async function getReport(
	dialogId: string,
): Promise<ReportResponse | null> {
	try {
		// 리포트 요약을 현재 UI 언어로 바로 생성받는다 (클라이언트 사후 번역 제거)
		const lang = encodeURIComponent(localeToLang(i18n.language));
		const response = await api.get<ReportResponse>(
			`/dialog/${dialogId}/report?lang=${lang}`,
		);
		return response.data ?? null;
	} catch (error) {
		console.error("getReport failed:", error);
		return null;
	}
}

export async function getChatListByBookId(bookId: number): Promise<KoChat[]> {
	try {
		const response = await api.get<KoChat[]>(`/dialog/mission/book/${bookId}`);
		return response.data ?? [];
	} catch (error) {
		console.error("getChatListByBookId failed:", error);
		return [];
	}
}
