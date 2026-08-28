import type {
	DashboardAttendance,
	DashboardContinueLearning,
	DashboardLearningStatus,
	DashboardWeeklyChart,
} from "@/api/dashboard";
import { IconBook } from "@/components/main/nav/icons";
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
	 * **학교 이용 기간이 끝났나.** 판정은 서버가 한다 —
	 * `GET /entitlement` 가 `source:"school"` 이고 `expires_at` 이 과거면 끝난 것이다.
	 * `index.tsx` 가 구해서 넘긴다(이 파일은 표시만 한다).
	 *
	 * **닫기를 두지 않는다.** 왜 잠겼는지 잊은 학생이 다시 볼 수 있어야 하고,
	 * 만료가 풀리면 카드가 저절로 사라진다.
	 */
	accessEnded?: boolean;
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
	accessEnded = false,
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
				{/*
				 * 학기가 끝났으면 **맨 위에서 이유를 말한다.** 카드 위치가 이유가 있다 —
				 * 아래 자리는 "지금 무엇을 하면 되나" 이고, 그 답이 달라진 까닭을
				 * 먼저 알려야 한다.
				 *
				 * `.task.waiting` 을 그대로 쓴다 — **누를 수 없는 정보 카드**의 꼴이
				 * 이미 그것이다(회색 아이콘 · 화살표 없음 · 문구 줄바꿈 허용).
				 * `TaskCard` 를 고치지 않는 이유는 그 컴포넌트를 다른 자리도 쓰기
				 * 때문이다 — 갈래를 하나 더 넣으면 아이콘 맵과 타입이 같이 늘어난다.
				 */}
				{accessEnded && (
					<div className="task waiting">
						<span className="ic">
							<IconBook />
						</span>
						<span className="tx">
							<span className="t1">{t("home.semesterEndedTitle")}</span>
							<span className="t2">{t("home.semesterEndedBody")}</span>
						</span>
					</div>
				)}

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
