import { api, asArray } from "./api";
import type { ReportItem } from "./apiType";

/*
 * 전에는 두 함수가 `finally { return result }` 로 값을 돌려줬다.
 * finally 의 return 은 **try·catch 의 return 을 덮어쓰고 던져진 예외까지 삼킨다** —
 * 그래서 try 안의 `return []` · catch 안의 `return null` 이 전부 죽은 코드였다.
 * 마침 result 의 초기값이 그 return 들과 같은 값이어서 결과는 우연히 맞았지만,
 * 나중에 catch 에서 다시 던지도록 고치면 그 예외가 조용히 사라진다.
 * 값을 그 자리에서 바로 돌려주도록 바꿨다 (biome noUnsafeFinally, 2026-08-24).
 */

export async function listReport(category: string): Promise<ReportItem[]> {
	try {
		const response = await api.get<ReportItem[]>(`/report/list/${category}`);
		if (!response.result) return [];
		// 모양까지 본다 — api.ts 의 asArray 주석 참고
		return asArray<ReportItem>(response.data);
	} catch (error) {
		console.error(error);
		return [];
	}
}

export async function createReport(
	request: ReportItem,
): Promise<ReportItem | null> {
	try {
		const response = await api.post<ReportItem>("/report", request);
		if (!response.result || !response.data) return null;

		return response.data;
	} catch (error) {
		console.error(error);
		return null;
	}
}
