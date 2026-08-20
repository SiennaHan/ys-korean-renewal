import { type DashboardData, getDashboard } from "@/api/dashboard";
import { useAuth } from "@/components/sign/sign-provider";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import TaskCard from "./continue-learning";
import LearningStatus from "./learning-status";
import WeeklyAttendance from "./weekly-attendance";
import WeeklyChart from "./weekly-chart";

export default function HomeContent() {
	const { user } = useAuth();
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [data, setData] = useState<DashboardData | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		getDashboard()
			.then(setData)
			.finally(() => setLoading(false));
	}, []);

	const userName = user?.name ?? "Guest";

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center gap-[12px] px-[20px] pt-[80px]">
				<Loader2 className="size-[28px] animate-spin text-[#0180FF]" />
				<p className="text-[#9BA5B0] text-[14px]">{t("state.loading")}</p>
			</div>
		);
	}

	// 데이터가 없으면 초기값 사용
	const attendance = data?.attendance ?? {
		weekDays: [false, false, false, false, false, false, false],
		todayIndex: new Date().getDay() === 0 ? 6 : new Date().getDay() - 1,
		streak: 0,
	};
	const continueLearning = data?.continueLearning ?? null;
	const learningStatus = data?.learningStatus ?? {
		chapterCompleted: 0,
		chapterTotal: 7,
		chapterLabel: "학습 중",
		todayActivities: 0,
		weeklyActivities: 0,
	};
	const weeklyChart = data?.weeklyChart ?? { data: [0, 0, 0, 0, 0, 0, 0] };

	// weekDays (boolean[]) → completedDays (number[] of indices)
	const completedDays = attendance.weekDays
		.map((done, i) => (done ? i : -1))
		.filter((i) => i >= 0);

	// 서버는 아직 구 경로를 준다. 구 경로도 리다이렉트로 살아 있지만,
	// 우리 쪽 이동은 신규 경로로 곧장 보낸다 (§4).
	const RENAMED: Record<string, string> = {
		"/learn/fill-blank": "/learn/grammar",
		"/learn/listen-answer": "/learn/listen",
		"/learn/read-answer": "/learn/read",
	};

	const handleContinue = () => {
		if (!continueLearning) return;
		// 급·과가 응답에 그대로 있으므로 chapter id 를 되찾을 필요가 없다.
		navigate({
			to: RENAMED[continueLearning.route] ?? continueLearning.route,
			search: {
				level: continueLearning.bookId,
				lesson: continueLearning.chapterSeq,
			},
		});
	};

	return (
		<div className="scroll">
			<div className="greet">
				<div className="hi">{t("home.greeting")}</div>
				<div className="name">{t("home.userName", { name: userName })}</div>
			</div>

			<WeeklyAttendance
				todayIndex={attendance.todayIndex}
				completedDays={completedDays}
				streak={attendance.streak}
			/>

			<div className="pad">
				{/* 오늘 할 일은 한 자리다. 세 갈래가 그 자리를 나눠 쓴다 */}
				{continueLearning ? (
					<TaskCard
						kind="resume"
						title={t("home.taskResume")}
						body={`${continueLearning.bookLabel} ${continueLearning.chapterLabel} · ${continueLearning.moduleLabel}`}
						onClick={handleContinue}
					/>
				) : (
					<TaskCard
						kind="none"
						title={t("home.taskNone")}
						body={t("home.taskNoneBody")}
						onClick={() => navigate({ to: "/main/textbook" })}
					/>
				)}

				<div className="sec-title">{t("home.statusTitle")}</div>
				<LearningStatus
					chapterCompleted={learningStatus.chapterCompleted}
					chapterTotal={learningStatus.chapterTotal}
					chapterLabel={learningStatus.chapterLabel}
					todayActivities={learningStatus.todayActivities}
					weeklyActivities={learningStatus.weeklyActivities}
				/>

				<div className="sec-title">{t("home.chartTitle")}</div>
				<WeeklyChart
					data={weeklyChart.data}
					todayIndex={attendance.todayIndex}
				/>

				{/* 탭 바에 바짝 붙지 않게 하는 바닥 여백 */}
				<div style={{ height: 20 }} />
			</div>
		</div>
	);
}
