import { api } from "./api";
import type {
	UserFlashcard,
	UserFlashcardRequest,
	UserFlashcardStatusRequest,
	UserFlashcardWord,
	UserFlashcardWordRequest,
} from "./apiType";

// Flashcard
export async function listUserFlashcard(
	bookId: number,
): Promise<UserFlashcard[]> {
	try {
		const response = await api.get<UserFlashcard[]>(
			`/flashcard/book/${bookId}`,
		);
		if (!response.result || !response.data) return [];
		return response.data;
	} catch (error) {
		console.error("listUserFlashcard failed:", error);
		return [];
	}
}

export async function getUserFlashcard(
	flashcardId: number,
	cardType: string,
): Promise<UserFlashcard | undefined> {
	try {
		const response = await api.get<UserFlashcard>(
			`/flashcard/${flashcardId}/${cardType}`,
		);
		if (!response.result || !response.data) return undefined;
		return response.data;
	} catch (error) {
		console.error("getUserFlashcard failed:", error);
		return undefined;
	}
}

export async function createUserFlashcard(
	request: UserFlashcardRequest,
): Promise<UserFlashcard | null> {
	try {
		const response = await api.post<UserFlashcard>("/flashcard", request);
		if (!response.result || !response.data) return null;
		return response.data;
	} catch (error) {
		console.error("createUserFlashcard failed:", error);
		return null;
	}
}

// Flashcard Word
export async function listUserFlashcardWord(
	flashcardId: number,
): Promise<UserFlashcardWord[]> {
	try {
		const response = await api.get<UserFlashcardWord[]>(
			`/flashcard/word/${flashcardId}`,
		);
		if (!response.result || !response.data) return [];
		return response.data;
	} catch (error) {
		console.error("listUserFlashcardWord failed:", error);
		return [];
	}
}

export async function createUserFlashcardWord(
	request: UserFlashcardWordRequest,
): Promise<string | null> {
	try {
		const response = await api.post<string>("/flashcard/word", request);
		if (!response.result || !response.data) return null;
		return response.data;
	} catch (error) {
		console.error("createUserFlashcardWord failed:", error);
		return null;
	}
}

export async function upsertUserFlashcardWord(
	request: UserFlashcardWordRequest,
): Promise<UserFlashcardWord | null> {
	try {
		const response = await api.put<UserFlashcardWord>(
			"/flashcard/word",
			request,
		);
		if (!response.result || !response.data) return null;
		return response.data;
	} catch (error) {
		console.error("upsertUserFlashcardWord failed:", error);
		return null;
	}
}

export async function updateUserFlashcardStatus(
	request: UserFlashcardStatusRequest,
): Promise<UserFlashcard | null> {
	try {
		const response = await api.patch<UserFlashcard>(
			"/flashcard/status",
			request,
		);
		if (!response.result || !response.data) return null;
		return response.data;
	} catch (error) {
		console.error("updateUserFlashcardStatus failed:", error);
		return null;
	}
}

export async function deleteUserFlashcard(
	flashcardId: number,
	cardType: string,
): Promise<string | null> {
	try {
		const response = await api.delete<string>(
			`/flashcard/${flashcardId}/${cardType}`,
		);
		if (!response.result) return null;
		return "ok";
	} catch (error) {
		console.error("deleteUserFlashcard failed:", error);
		return null;
	}
}

export async function listUserFlashcardWordByType(
	flashcardId: number,
	cardType: string,
): Promise<UserFlashcardWord[]> {
	try {
		const response = await api.get<UserFlashcardWord[]>(
			`/flashcard/word/${flashcardId}/${cardType}`,
		);
		if (!response.result || !response.data) return [];
		return response.data;
	} catch (error) {
		console.error("listUserFlashcardWordByType failed:", error);
		return [];
	}
}
