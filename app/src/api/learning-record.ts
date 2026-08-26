import { api, asArray } from "./api";
import type {
	LearningProgress,
	LearningRecord,
	LearningRecordRequest,
} from "./apiType";

export async function saveLearningRecord(
	request: LearningRecordRequest,
): Promise<LearningRecord | null> {
	try {
		const response = await api.post<LearningRecord>(
			"/learning-record",
			request,
		);
		if (!response.result || !response.data) return null;
		return response.data;
	} catch (error) {
		console.error("saveLearningRecord failed:", error);
		return null;
	}
}

export async function getLearningRecords(
	bookId: number,
	chapterSeq: number,
	menuType: string,
): Promise<LearningRecord[]> {
	try {
		const response = await api.get<LearningRecord[]>(
			`/learning-record/list?bookId=${bookId}&chapterSeq=${chapterSeq}&menuType=${menuType}`,
		);
		if (!response.result) return [];
		// 모양까지 본다 — api.ts 의 asArray 주석 참고
		return asArray<LearningRecord>(response.data);
	} catch (error) {
		console.error("getLearningRecords failed:", error);
		return [];
	}
}

export async function getLearningProgress(
	bookId: number,
	chapterSeq: number,
): Promise<LearningProgress> {
	try {
		const response = await api.get<LearningProgress>(
			`/learning-record/progress?bookId=${bookId}&chapterSeq=${chapterSeq}`,
		);
		if (!response.result || !response.data) return {};
		return response.data;
	} catch (error) {
		console.error("getLearningProgress failed:", error);
		return {};
	}
}
