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
	 * 원천은 `GET /review-queue` 다 — 2026-08-26 에 만들었고 `index.tsx` 가 넘긴다
	 * (BLOCKERS §9-a-1). 그 전에는 API 가 없어 표시 쪽만 갖춰 두고 있었다.
	 */
	reviewCount?: number;
	/**
	 * **오늘 풀 수 있는 것이 있나.** `reviewCount` 와 다르다.
	 *
	 * 큐는 보관 전체(`total`)와 오늘 낼 수 있는 것(`items`)을 따로 낸다 —
	 * 오답·건너뜀은 `available_at` 이 다음 날 0시(KST)라, 오늘 틀린 직후에는
	 * 개수는 있어도 낼 문항이 없다. 그때 카드를 누르면 아무 일도 없었다.
	 */
	reviewReady?: boolean;
	learningStatus: DashboardLearningStatus;
	weeklyChart: DashboardWeeklyChart;
	onContinue: () => void;
	onStartLearning: () => void;
	onReview?: () => void;
	/**
	 * **런칭 이벤트의 마지막 날.** `null` 이면 배너를 안 그린다.
	 *
	 * 날짜를 문구에 박지 않고 값으로 받는 이유 — 이벤트를 **연장할 때** i18n 다섯
	 * 파일을 고치지 않아도 되게(연장은 서버 `.env` 한 줄이다).
	 *
	 * **목업 대조는 이 배너를 보지 않는다** — 픽스처가 이 prop 을 안 넘긴다.
	 * 일부러 그랬다: 배너는 이벤트가 끝나면 사라지는 **한때의 화면**이고, 그것을
	 * 정본 캡처에 넣으면 11월 1일에 캡처 셋을 다시 승격해 지워야 한다.
	 */
	eventLastDay?: Date | null;
}

export default function HomeView({
	userName,
	attendance,
	continueLearning,
	reviewCount = 0,
	reviewReady = false,
	learningStatus,
	weeklyChart,
	onContinue,
	onStartLearning,
	onReview,
	eventLastDay = null,
}: HomeViewProps) {
	// `i18n.language` 는 날짜 꼴을 그 언어로 만들기 위해서다(이벤트 배너)
	const { t, i18n } = useTranslation();

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

			{/*
			 * 런칭 이벤트 배너 — 인사 바로 아래. 열자마자 보이는 자리다(기획 확정).
			 * 알리지 않으면 이벤트가 아니라 배신이 된다 — 사용자는 「원래 다 무료인
			 * 앱」으로 알고 이벤트가 끝나는 날 잠긴다.
			 */}
			{eventLastDay && (
				<div className="event-banner">
					<span className="event-banner-kicker">{t("home.eventKicker")}</span>
					<span className="event-banner-text">
						{t("home.eventBody", {
							date: eventLastDay.toLocaleDateString(i18n.language, {
								month: "long",
								day: "numeric",
							}),
						})}
					</span>
				</div>
			)}

			<WeeklyAttendance
				todayIndex={attendance.todayIndex}
				completedDays={completedDays}
				streak={attendance.streak}
			/>

			<div className="pad">
				{/*
				 * 맨 위 자리는 **최근 학습 바로가기**다 (기획 확정 2026-08-26).
				 *
				 * 전에는 이 한 자리를 세 갈래가 나눠 쓰면서 다시 풀기가 이겼다.
				 * 그러면 다시 풀 것이 하나라도 있는 동안 **이어하기 버튼이 사라진다** —
				 * 앱을 열자마자 하려는 일은 "하던 데서 계속" 이므로 그 자리를 내주면 안 된다.
				 * 다시 풀기는 아래로 내려 따로 둔다.
				 */}
				{continueLearning ? (
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

				{/*
				 * 다시 풀 것이 있을 때만 그 아래에 붙는다 — 자리를 다투지 않는다.
				 *
				 * **두 갈래다.** 오늘 낼 문항이 있으면 누를 수 있고, 없으면(오늘 틀리거나
				 * 건너뛴 것뿐이라 내일부터인 상태) 개수만 알리고 누를 수 없게 둔다 —
				 * 기획 확정 2026-08-27. 전에는 갈래가 하나여서 **개수가 뜨는데 눌러도
				 * 아무 일이 없는 카드**가 있었다.
				 */}
				{reviewCount > 0 && (
					<TaskCard
						kind="review"
						title={t("home.taskReview", { count: reviewCount })}
						body={
							reviewReady
								? t("home.taskReviewBody")
								: t("home.taskReviewWaitBody")
						}
						waiting={!reviewReady}
						onClick={onReview ?? (() => {})}
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
