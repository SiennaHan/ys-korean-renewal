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

		const result: ServerResponse<string> = await response.json();
		return result.data;
	} catch (error) {
		console.error("postSpeaking failed:", error);
		return null;
	}
};

const blobToBase64 = (blob: Blob): Promise<string | ArrayBuffer | null> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result);
		reader.onerror = (error) => reject(error);
		reader.readAsDataURL(blob);
	});
};
