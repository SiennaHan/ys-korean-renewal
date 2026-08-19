import { api } from "./api";
import type { GameProgressRecord, GameProgressRequest } from "./apiType";

export async function saveGameProgress(
	request: GameProgressRequest,
): Promise<GameProgressRecord | null> {
	try {
		const response = await api.post<GameProgressRecord>(
			"/game-progress",
			request,
		);
		if (!response.result || !response.data) return null;
		return response.data;
	} catch (error) {
		console.error("saveGameProgress failed:", error);
		return null;
	}
}

export async function getGameProgress(
	gameName: string,
): Promise<GameProgressRecord[]> {
	try {
		const response = await api.get<GameProgressRecord[]>(
			`/game-progress/${encodeURIComponent(gameName)}`,
		);
		if (!response.result || !response.data) return [];
		return response.data;
	} catch (error) {
		console.error("getGameProgress failed:", error);
		return [];
	}
}
