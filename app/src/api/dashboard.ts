import { api } from "./api";

export interface DashboardAttendance {
	weekDays: boolean[];
	todayIndex: number;
	streak: number;
}

export interface DashboardContinueLearning {
	bookId: number;
	bookLabel: string;
	chapterSeq: number;
	chapterLabel: string;
	menuType: string;
	moduleLabel: string;
	route: string;
	routeParams: Record<string, unknown>;
}

export interface DashboardLearningStatus {
	chapterCompleted: number;
	chapterTotal: number;
	chapterLabel: string;
	todayActivities: number;
	weeklyActivities: number;
}

export interface DashboardWeeklyChart {
	data: number[];
}

export interface DashboardData {
	attendance: DashboardAttendance;
	continueLearning: DashboardContinueLearning | null;
	learningStatus: DashboardLearningStatus;
	weeklyChart: DashboardWeeklyChart;
}

export async function getDashboard(): Promise<DashboardData | null> {
	try {
		const response = await api.get<DashboardData>("/dashboard");
		if (!response.result || !response.data) return null;
		return response.data;
	} catch (error) {
		console.error("getDashboard failed:", error);
		return null;
	}
}
