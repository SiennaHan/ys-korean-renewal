import { api } from "./api";

export async function pingStudySession(
	context?: string,
): Promise<void> {
	try {
		await api.post("/study-session/ping", { context });
	} catch (error) {
		// 핑 실패는 무시 — 학습 흐름을 방해하지 않음
	}
}
