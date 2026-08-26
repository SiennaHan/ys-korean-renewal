import { api, asArray } from "./api";

export interface SpringPicnicFriend {
	id: string;
	face: string;
	name: string;
	bg: string;
	cats: string[];
	mission: string;
	desc: string;
	desc2: string;
}

export interface SpringPicnicQuestion {
	id: string;
	cat: string;
	level: number;
	il: string;
	hint: Record<string, string>;
	num: string;
	tmpl: string;
	tts: string;
	correct: string;
	wrong: string[];
}

export async function getSpringPicnicFriends(): Promise<SpringPicnicFriend[]> {
	try {
		const response = await api.get<SpringPicnicFriend[]>(
			"/game-content/spring-picnic/friends",
		);
		if (!response.result) return [];
		// 모양까지 본다 — api.ts 의 asArray 주석 참고
		return asArray<SpringPicnicFriend>(response.data);
	} catch (error) {
		console.error("getSpringPicnicFriends failed:", error);
		return [];
	}
}

export async function getSpringPicnicQuestions(): Promise<
	SpringPicnicQuestion[]
> {
	try {
		const response = await api.get<SpringPicnicQuestion[]>(
			"/game-content/spring-picnic/questions",
		);
		if (!response.result) return [];
		// 모양까지 본다 — api.ts 의 asArray 주석 참고
		return asArray<SpringPicnicQuestion>(response.data);
	} catch (error) {
		console.error("getSpringPicnicQuestions failed:", error);
		return [];
	}
}

// ─── particle-sniper ──────────────────────────────────────

export interface ParticleSniperLevelMeta {
	summary: string;
	color: string;
	accent: string;
}

export interface ParticleSniperQuestion {
	sentence: string;
	blank: string;
	answer: string;
	choices: string[];
	sourceLesson: string;
}

export interface ParticleSniperLessonEntry {
	new_particles: string[];
	cumulative_particles: string[];
	questions: ParticleSniperQuestion[];
}

export type ParticleSniperLevels = Record<string, ParticleSniperLevelMeta>;
export type ParticleSniperSentences = Record<
	string,
	Record<string, ParticleSniperLessonEntry>
>;

export async function getParticleSniperLevels(): Promise<ParticleSniperLevels> {
	try {
		const response = await api.get<ParticleSniperLevels>(
			"/game-content/particle-sniper/levels",
		);
		if (!response.result || !response.data) return {};
		return response.data;
	} catch (error) {
		console.error("getParticleSniperLevels failed:", error);
		return {};
	}
}

export async function getParticleSniperSentences(): Promise<ParticleSniperSentences> {
	try {
		const response = await api.get<ParticleSniperSentences>(
			"/game-content/particle-sniper/sentences",
		);
		if (!response.result || !response.data) return {};
		return response.data;
	} catch (error) {
		console.error("getParticleSniperSentences failed:", error);
		return {};
	}
}

// ─── card-sort ──────────────────────────────────────

export type CardSortCategories = Record<string, string>;

export interface CardSortLessonEntry {
	new_categories: string[];
	[categoryName: string]: string[];
}
export type CardSortVocab = Record<string, Record<string, CardSortLessonEntry>>;

export interface CardSortRareExample {
	word: string;
	category: string;
	confusable_with: string | null;
}
export interface CardSortRare {
	examples: CardSortRareExample[];
}

export async function getCardSortCategories(): Promise<CardSortCategories> {
	try {
		const response = await api.get<CardSortCategories>(
			"/game-content/card-sort/categories",
		);
		if (!response.result || !response.data) return {};
		return response.data;
	} catch (error) {
		console.error("getCardSortCategories failed:", error);
		return {};
	}
}

export async function getCardSortVocab(): Promise<CardSortVocab> {
	try {
		const response = await api.get<CardSortVocab>(
			"/game-content/card-sort/vocab",
		);
		if (!response.result || !response.data) return {};
		return response.data;
	} catch (error) {
		console.error("getCardSortVocab failed:", error);
		return {};
	}
}

export async function getCardSortRare(): Promise<CardSortRare> {
	try {
		const response = await api.get<CardSortRare>(
			"/game-content/card-sort/rare",
		);
		if (!response.result || !response.data) return { examples: [] };
		return response.data;
	} catch (error) {
		console.error("getCardSortRare failed:", error);
		return { examples: [] };
	}
}

// ─── seoul-puzzle ──────────────────────────────────────

export interface SeoulPuzzleEntryMessage {
	type: string;
	text: string;
}

export interface SeoulPuzzleLocation {
	id: string;
	name: string;
	num: number;
	x: number;
	y: number;
	unit: string;
	desc: string;
	grammar: string[];
	entryMessages: SeoulPuzzleEntryMessage[];
}

export interface SeoulPuzzleContent {
	locations: SeoulPuzzleLocation[];
	puzzles: Record<string, unknown[]>;
}

export async function getSeoulPuzzleContent(): Promise<SeoulPuzzleContent> {
	try {
		const response = await api.get<SeoulPuzzleContent>(
			"/game-content/seoul-puzzle",
		);
		if (!response.result || !response.data) {
			return { locations: [], puzzles: {} };
		}
		return response.data;
	} catch (error) {
		console.error("getSeoulPuzzleContent failed:", error);
		return { locations: [], puzzles: {} };
	}
}
