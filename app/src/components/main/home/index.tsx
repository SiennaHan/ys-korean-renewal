import { type DashboardData, getDashboard } from "@/api/dashboard";
import { useAuth } from "@/components/sign/sign-provider";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import ContinueLearning from "./continue-learning";
import LearningStatus from "./learning-status";
import WeeklyAttendance from "./weekly-attendance";
import WeeklyChart from "./weekly-chart";

export default function HomeContent() {
	const { user } = useAuth();
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
				<p className="text-[#9BA5B0] text-[14px]">로딩 중...</p>
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
		<div className="flex flex-col gap-[24px] px-[20px] pt-[24px] pb-[20px]">
			{/* Handle bar */}
			<div className="flex justify-center">
				<div className="h-[4px] w-[40px] rounded-full bg-[#24425F]" />
			</div>

			{/* Greeting */}
			<div>
				<p className="text-[#6B7B8D] text-[14px]">안녕하세요,</p>
				<p className="font-bold text-[#24425F] text-[24px]">{userName} 님</p>
			</div>

			{/* Weekly attendance */}
			<WeeklyAttendance
				todayIndex={attendance.todayIndex}
				completedDays={completedDays}
				streak={attendance.streak}
			/>

			{/* Continue learning */}
			{continueLearning ? (
				<ContinueLearning
					bookLabel={continueLearning.bookLabel}
					chapterLabel={continueLearning.chapterLabel}
					moduleLabel={continueLearning.moduleLabel}
					onClick={handleContinue}
				/>
			) : (
				<button
					type="button"
					onClick={() => navigate({ to: "/main/textbook" })}
					className="flex w-full cursor-pointer items-center gap-[14px] rounded-[16px] bg-[#DBEDFF] p-[16px] transition-colors active:bg-[#C5DEFF]"
				>
					<div className="flex size-[48px] shrink-0 items-center justify-center rounded-[12px] bg-[#0180FF]">
						<span className="text-[20px] text-white">📖</span>
					</div>
					<div className="flex-1 text-left">
						<p className="font-bold text-[#24425F] text-[16px]">
							학습 시작하기
						</p>
						<p className="mt-[2px] text-[#0180FF] text-[13px]">
							교재학습 메뉴에서 시작해보세요
						</p>
					</div>
				</button>
			)}

			{/* Learning status */}
			<LearningStatus
				chapterCompleted={learningStatus.chapterCompleted}
				chapterTotal={learningStatus.chapterTotal}
				chapterLabel={learningStatus.chapterLabel}
				todayActivities={learningStatus.todayActivities}
				weeklyActivities={learningStatus.weeklyActivities}
			/>

			{/* Weekly chart */}
			<WeeklyChart
				data={weeklyChart.data}
				todayIndex={attendance.todayIndex}
			/>
		</div>
	);
}
