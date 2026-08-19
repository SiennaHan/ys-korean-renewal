import { api } from './api';
import { ReportItem } from './apiType';

export async function listReport(category: string): Promise<ReportItem[]> {
	let result: ReportItem[] = []
	try {
		const response = await api.get<ReportItem[]>(`/report/list/${category}`);    
		if (!response.result || !response.data) return [];
		
		result = response.data ?? []
	} catch (error) {
		console.error(error);
		return [];
	} finally {
		return result
	}
}

export async function createReport(request: ReportItem): Promise<ReportItem | null> {
	let result: ReportItem | null = null
	try {
		const response = await api.post<ReportItem>(`/report`, request);    
		if (!response.result || !response.data) return null;
		
		result = response.data;
	} catch (error) {
		console.error(error);
		return null;
	} finally {
		return result;
	}
}
