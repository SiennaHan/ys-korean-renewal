import type { ServerResponse } from "@/api/apiType";
import { env } from "@/config/env";

export const uploadWriting = async (
	base64Img: string,
): Promise<ServerResponse<string>> => {
	const API_ENDPOINT = `${env.WRITE_API_URL}/analyze/write`;

	try {
		const response = await fetch(API_ENDPOINT, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ base64writing: base64Img }),
		});

		if (!response.ok) {
			let errorMessage = `Server error: ${response.status}`;
			try {
				const errorData = await response.json();
				errorMessage += ` - ${errorData.detail || errorData.message || "Unknown error"}`;
			} catch {
				errorMessage += " - Failed to parse response body";
			}
			throw new Error(errorMessage);
		}

		return (await response.json()) as ServerResponse<string>;
	} catch (error) {
		console.error("uploadWriting failed:", error);
		return {
			result: false,
			code: 530,
			message: "API call error",
			data: null,
		};
	}
};

export const postSpeaking = async (
	recordingBlob: Blob | undefined,
): Promise<string | null> => {
	const API_ENDPOINT = `${env.KOREAN_API_URL}/stt/convert`;

	if (!recordingBlob) return null;

	try {
		const base64String = await blobToBase64(recordingBlob);
		const rawBase64 = `${base64String}`.split(",")[1].replace(/[\s\n\r]/g, "");

		const response = await fetch(API_ENDPOINT, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ base64sound: rawBase64 }),
		});

		if (!response.ok) {
			let errorMessage = `Server error: ${response.status}`;
			try {
				const errorData = await response.json();
				errorMessage += ` - ${errorData.detail || errorData.message || "Unknown error"}`;
			} catch {
				errorMessage += " - Failed to parse response body";
			}
			throw new Error(errorMessage);
		}

		const result: ServerResponse<unknown> = await response.json();
		return extractTranscript(result.data);
	} catch (error) {
		console.error("postSpeaking failed:", error);
		return null;
	}
};

/**
 * STT 서버와 로컬 목 API의 응답 모양이 달라도 화면에는 문자열만 넘긴다.
 * 빈 객체를 그대로 넘기면 결과 카드에서 문장 메서드를 호출하는 순간 앱이 죽는다.
 */
export function extractTranscript(value: unknown): string | null {
	if (typeof value === "string") {
		const text = value.trim();
		return text || null;
	}
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;

	const record = value as Record<string, unknown>;
	for (const key of ["text", "transcript", "utterance", "result", "data"]) {
		const text = extractTranscript(record[key]);
		if (text) return text;
	}
	return null;
}

const blobToBase64 = (blob: Blob): Promise<string | ArrayBuffer | null> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result);
		reader.onerror = (error) => reject(error);
		reader.readAsDataURL(blob);
	});
};
