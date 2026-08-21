import type {
	DashboardAttendance,
	DashboardContinueLearning,
	DashboardLearningStatus,
	DashboardWeeklyChart,
} from "@/api/dashboard";
import { useTranslation } from "react-i18next";
import TaskCard from "./continue-learning";
import LearningStatus from "./learning-status";
import WeeklyAttendance from "./weekly-attendance";
import WeeklyChart from "./weekly-chart";

/**
 * 홈 화면의 표시만 담당한다. 받아 오는 일은 index.tsx 가 한다.
 *
 * 왜 갈랐나 — 목업 대조(scripts/activity-parity.tsx)가 이 화면을 검사할 수 있게
 * 하려고. 합쳐져 있으면 정적으로 그릴 때 loading 이 참이라 스피너만 나온다.
 * 활동 화면들은 처음부터 이 꼴이었고, 홈만 아니었다.
 */
export interface HomeViewProps {
	/** 빈 문자열이면 게스트 — 이름 틀을 쓰지 않는다 */
	userName: string;
	attendance: DashboardAttendance;
	continueLearning: DashboardContinueLearning | null;
	/**
	 * 다시 풀 문항 수. 0 보다 크면 "오늘 할 일" 자리를 복습이 차지한다.
	 *
	 * 아직 아무도 넘기지 않는다 — 원천이 `GET /review-queue` 인데 그 API 가 없다
	 * (BLOCKERS §6). 목업 nav__home__review 와 i18n(home.taskReview)은 이미
	 * 이 갈래를 정해 두었으므로 표시 쪽만 먼저 갖춰 둔다.
	 */
	reviewCount?: number;
	learningStatus: DashboardLearningStatus;
	weeklyChart: DashboardWeeklyChart;
	onContinue: () => void;
	onStartLearning: () => void;
	onReview?: () => void;
}

export default function HomeView({
	userName,
	attendance,
	continueLearning,
	reviewCount = 0,
	learningStatus,
	weeklyChart,
	onContinue,
	onStartLearning,
	onReview,
}: HomeViewProps) {
	const { t } = useTranslation();

	// weekDays (boolean[]) → completedDays (number[] of indices)
	const completedDays = attendance.weekDays
		.map((done, i) => (done ? i : -1))
		.filter((i) => i >= 0);

	return (
		<div className="scroll">
			<div className="greet">
				<div className="hi">{t("home.greeting")}</div>
				<div className="name">
					{userName
						? t("home.userName", { name: userName })
						: t("home.guestName")}
				</div>
			</div>

			<WeeklyAttendance
				todayIndex={attendance.todayIndex}
				completedDays={completedDays}
				streak={attendance.streak}
			/>

			<div className="pad">
				{/* 오늘 할 일은 한 자리다. 세 갈래가 그 자리를 나눠 쓴다 */}
				{reviewCount > 0 ? (
					<TaskCard
						kind="review"
						title={t("home.taskReview", { count: reviewCount })}
						body={t("home.taskReviewBody")}
						onClick={onReview ?? (() => {})}
					/>
				) : continueLearning ? (
					<TaskCard
						kind="resume"
						title={t("home.taskResume")}
						body={`${continueLearning.bookLabel} ${continueLearning.chapterLabel} · ${continueLearning.moduleLabel}`}
						onClick={onContinue}
					/>
				) : (
					<TaskCard
						kind="none"
						title={t("home.taskNone")}
						body={t("home.taskNoneBody")}
						onClick={onStartLearning}
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
