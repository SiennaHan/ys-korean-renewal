import type { VocabQuestion } from "./types";

export type VocabEntry = {
	id: number;
	lesson: PresetId;
	category: string;
	image?: string;
	english?: string;
	answer: string;
	wrong?: string[];
};

export type PresetId =
	| "level1_lesson1"
	| "level1_lesson2"
	| "level1_lesson3"
	| "level1_lesson4"
	| "level1_lesson5";

export const presetOptions: { id: PresetId; label: string }[] = [
	{ id: "level1_lesson1", label: "1권 1과 - 직업" },
	{ id: "level1_lesson2", label: "1권 2과 - 나라" },
	{ id: "level1_lesson3", label: "1권 3과 - 생활 용품" },
	{ id: "level1_lesson4", label: "1권 4과 - 장소" },
	{ id: "level1_lesson5", label: "1권 5과 - 가구, 가전" },
];

import rawVocabData from "./vocabData.json";

export const vocabPool: VocabEntry[] = rawVocabData as VocabEntry[];

function shuffleArray<T>(arr: T[]): T[] {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

function getWrongAnswers(
	entry: VocabEntry,
	pool: VocabEntry[],
	count = 7,
): string[] {
	if (entry.wrong && entry.wrong.length > 0) {
		return shuffleArray(entry.wrong).slice(0, count);
	}

	const firstChar = entry.answer.charAt(0);
	const seen = new Set<string>([entry.answer]);
	const result: string[] = [];

	const addCandidates = (candidates: VocabEntry[], max: number) => {
		let added = 0;
		for (const e of shuffleArray(candidates)) {
			if (added >= max || result.length >= count) break;
			if (seen.has(e.answer)) continue;
			seen.add(e.answer);
			result.push(e.answer);
			added++;
		}
	};

	addCandidates(
		pool.filter((e) => e.id !== entry.id && e.category === entry.category),
		4,
	);
	addCandidates(
		pool.filter(
			(e) =>
				e.id !== entry.id &&
				e.category !== entry.category &&
				e.answer.startsWith(firstChar),
		),
		2,
	);
	addCandidates(
		pool.filter((e) => e.id !== entry.id && !seen.has(e.answer)),
		count,
	);

	return result;
}

function buildPreset(lessonId: PresetId): VocabQuestion[] {
	return vocabPool
		.filter((e) => e.lesson === lessonId)
		.map((e) => ({
			id: e.id,
			image: e.image,
			english: e.english,
			answer: e.answer,
			wrong: getWrongAnswers(e, vocabPool, 7),
		}));
}

export const presetData: Record<PresetId, VocabQuestion[]> = {
	level1_lesson1: buildPreset("level1_lesson1"),
	level1_lesson2: buildPreset("level1_lesson2"),
	level1_lesson3: buildPreset("level1_lesson3"),
	level1_lesson4: buildPreset("level1_lesson4"),
	level1_lesson5: buildPreset("level1_lesson5"),
};
