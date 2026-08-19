import { api } from "./api";

// ─── spring-picnic ──────────────────────────────────────

export interface SpringPicnicFriend {
	id: string;
	face: string;
	name: string;
	bg: string;
	cats: string[];
	mission: string;
	desc: string;
	desc2: string;
	sort_order?: number;
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
	sort_order?: number;
}

export async function listSpringPicnicFriends(): Promise<SpringPicnicFriend[]> {
	const res = await api.get<SpringPicnicFriend[]>(
		"/game-content/spring-picnic/friends",
	);
	return res.result && res.data ? res.data : [];
}

export async function listSpringPicnicQuestions(): Promise<
	SpringPicnicQuestion[]
> {
	const res = await api.get<SpringPicnicQuestion[]>(
		"/game-content/spring-picnic/questions",
	);
	return res.result && res.data ? res.data : [];
}

export async function createSpringPicnicFriend(
	payload: Partial<SpringPicnicFriend>,
) {
	return api.post("/game-content/spring-picnic/friends", payload);
}

export async function createSpringPicnicQuestion(
	payload: Partial<SpringPicnicQuestion>,
) {
	return api.post("/game-content/spring-picnic/questions", payload);
}

export async function updateSpringPicnicFriend(
	id: string,
	payload: Partial<SpringPicnicFriend>,
) {
	return api.patch(`/game-content/spring-picnic/friends/${encodeURIComponent(id)}`, payload);
}

export async function updateSpringPicnicQuestion(
	id: string,
	payload: Partial<SpringPicnicQuestion>,
) {
	return api.patch(
		`/game-content/spring-picnic/questions/${encodeURIComponent(id)}`,
		payload,
	);
}

export async function deleteSpringPicnicFriend(id: string) {
	return api.delete(`/game-content/spring-picnic/friends/${encodeURIComponent(id)}`);
}

export async function deleteSpringPicnicQuestion(id: string) {
	return api.delete(`/game-content/spring-picnic/questions/${encodeURIComponent(id)}`);
}

// ─── particle-sniper ──────────────────────────────────────

export interface ParticleSniperLevel {
	id: string;
	summary: string;
	color: string;
	accent: string;
	sort_order?: number;
}

export interface ParticleSniperLesson {
	id: number;
	level: string;
	lesson_name: string;
	new_particles: string[];
	cumulative_particles: string[];
	questions: unknown[];
	sort_order?: number;
}

export async function listParticleSniperLevels(): Promise<
	Record<string, { summary: string; color: string; accent: string }>
> {
	const res = await api.get<
		Record<string, { summary: string; color: string; accent: string }>
	>("/game-content/particle-sniper/levels");
	return res.result && res.data ? res.data : {};
}

export async function listParticleSniperLessons(): Promise<
	ParticleSniperLesson[]
> {
	const res = await api.get<ParticleSniperLesson[]>(
		"/game-content/particle-sniper/lessons",
	);
	return res.result && res.data ? res.data : [];
}

export async function createParticleSniperLevel(
	payload: Partial<ParticleSniperLevel>,
) {
	return api.post("/game-content/particle-sniper/levels", payload);
}

export async function createParticleSniperLesson(
	payload: Partial<ParticleSniperLesson>,
) {
	return api.post("/game-content/particle-sniper/lessons", payload);
}

export async function updateParticleSniperLevel(
	id: string,
	payload: Partial<ParticleSniperLevel>,
) {
	return api.patch(
		`/game-content/particle-sniper/levels/${encodeURIComponent(id)}`,
		payload,
	);
}

export async function updateParticleSniperLesson(
	id: number,
	payload: Partial<ParticleSniperLesson>,
) {
	return api.patch(`/game-content/particle-sniper/lessons/${id}`, payload);
}

export async function deleteParticleSniperLevel(id: string) {
	return api.delete(
		`/game-content/particle-sniper/levels/${encodeURIComponent(id)}`,
	);
}

export async function deleteParticleSniperLesson(id: number) {
	return api.delete(`/game-content/particle-sniper/lessons/${id}`);
}

// ─── card-sort ──────────────────────────────────────

export interface CardSortCategory {
	name: string;
	color: string;
	sort_order?: number;
}

export interface CardSortVocabRow {
	id: number;
	grade: string;
	lesson: string;
	new_categories: string[];
	words: Record<string, string[]>;
	sort_order?: number;
}

export interface CardSortRareRow {
	word: string;
	category: string;
	confusable_with: string | null;
	sort_order?: number;
}

export async function listCardSortCategories(): Promise<CardSortCategory[]> {
	const res = await api.get<CardSortCategory[]>(
		"/game-content/card-sort/categories/edit",
	);
	return res.result && res.data ? res.data : [];
}

export async function listCardSortVocab(): Promise<CardSortVocabRow[]> {
	const res = await api.get<CardSortVocabRow[]>(
		"/game-content/card-sort/vocab/edit",
	);
	return res.result && res.data ? res.data : [];
}

export async function listCardSortRare(): Promise<CardSortRareRow[]> {
	const res = await api.get<CardSortRareRow[]>(
		"/game-content/card-sort/rare/edit",
	);
	return res.result && res.data ? res.data : [];
}

export async function createCardSortCategory(
	payload: Partial<CardSortCategory>,
) {
	return api.post("/game-content/card-sort/categories", payload);
}

export async function createCardSortVocab(payload: Partial<CardSortVocabRow>) {
	return api.post("/game-content/card-sort/vocab", payload);
}

export async function createCardSortRare(payload: Partial<CardSortRareRow>) {
	return api.post("/game-content/card-sort/rare", payload);
}

export async function updateCardSortCategory(
	name: string,
	payload: Partial<CardSortCategory>,
) {
	return api.patch(
		`/game-content/card-sort/categories/${encodeURIComponent(name)}`,
		payload,
	);
}

export async function updateCardSortVocab(
	id: number,
	payload: Partial<CardSortVocabRow>,
) {
	return api.patch(`/game-content/card-sort/vocab/${id}`, payload);
}

export async function updateCardSortRare(
	word: string,
	payload: Partial<CardSortRareRow>,
) {
	return api.patch(
		`/game-content/card-sort/rare/${encodeURIComponent(word)}`,
		payload,
	);
}

export async function deleteCardSortCategory(name: string) {
	return api.delete(
		`/game-content/card-sort/categories/${encodeURIComponent(name)}`,
	);
}

export async function deleteCardSortVocab(id: number) {
	return api.delete(`/game-content/card-sort/vocab/${id}`);
}

export async function deleteCardSortRare(word: string) {
	return api.delete(`/game-content/card-sort/rare/${encodeURIComponent(word)}`);
}

// ─── seoul-puzzle ──────────────────────────────────────

export interface SeoulPuzzleLocation {
	id: string;
	name: string;
	num: number;
	x: number;
	y: number;
	unit: string;
	desc: string;
	grammar: string[];
	entryMessages: { type: string; text: string }[];
	sort_order?: number;
}

export interface SeoulPuzzleStep {
	id: number;
	location_id: string;
	step_index: number;
	data: Record<string, unknown>;
}

export async function listSeoulPuzzleLocations(): Promise<
	SeoulPuzzleLocation[]
> {
	const res = await api.get<SeoulPuzzleLocation[]>(
		"/game-content/seoul-puzzle/locations",
	);
	return res.result && res.data ? res.data : [];
}

export async function listSeoulPuzzleSteps(): Promise<SeoulPuzzleStep[]> {
	const res = await api.get<SeoulPuzzleStep[]>(
		"/game-content/seoul-puzzle/steps",
	);
	return res.result && res.data ? res.data : [];
}

export async function createSeoulPuzzleLocation(
	payload: Partial<SeoulPuzzleLocation>,
) {
	return api.post("/game-content/seoul-puzzle/locations", payload);
}

export async function createSeoulPuzzleStep(payload: Partial<SeoulPuzzleStep>) {
	return api.post("/game-content/seoul-puzzle/steps", payload);
}

export async function updateSeoulPuzzleLocation(
	id: string,
	payload: Partial<SeoulPuzzleLocation>,
) {
	return api.patch(
		`/game-content/seoul-puzzle/locations/${encodeURIComponent(id)}`,
		payload,
	);
}

export async function updateSeoulPuzzleStep(
	id: number,
	payload: Partial<SeoulPuzzleStep>,
) {
	return api.patch(`/game-content/seoul-puzzle/steps/${id}`, payload);
}

export async function deleteSeoulPuzzleLocation(id: string) {
	return api.delete(
		`/game-content/seoul-puzzle/locations/${encodeURIComponent(id)}`,
	);
}

export async function deleteSeoulPuzzleStep(id: number) {
	return api.delete(`/game-content/seoul-puzzle/steps/${id}`);
}

// ─── vocashot (낱말맞추기) ──────────────────────────────────────

export interface VocashotVocabItem {
	id: number;
	category?: string;
	image?: string | null;
	english?: string | null;
	answer: string;
	wrong?: string[];
}

export interface VocashotPreset {
	id: string;
	label: string;
	vocab: VocashotVocabItem[];
	sort_order?: number;
}

export async function listVocashotPresets(): Promise<VocashotPreset[]> {
	const res = await api.get<VocashotPreset[]>(
		"/game-content/vocashot/presets",
	);
	return res.result && res.data ? res.data : [];
}

export async function createVocashotPreset(payload: Partial<VocashotPreset>) {
	return api.post("/game-content/vocashot/presets", payload);
}

export async function updateVocashotPreset(
	id: string,
	payload: Partial<VocashotPreset>,
) {
	return api.patch(
		`/game-content/vocashot/presets/${encodeURIComponent(id)}`,
		payload,
	);
}

export async function deleteVocashotPreset(id: string) {
	return api.delete(
		`/game-content/vocashot/presets/${encodeURIComponent(id)}`,
	);
}
