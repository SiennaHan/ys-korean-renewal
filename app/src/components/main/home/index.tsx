import { type DashboardData, getDashboard } from "@/api/dashboard";
import { useAuth } from "@/components/sign/sign-provider";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import HomeView from "./view";

/** 데이터가 없을 때 쓰는 값 — 화면이 비어 보이지 않게 한다 */
function fallbackAttendance() {
	const day = new Date().getDay();
	return {
		weekDays: [false, false, false, false, false, false, false],
		todayIndex: day === 0 ? 6 : day - 1,
		streak: 0,
	};
}

/**
 * 홈 — 받아 오고 배선한다. 그리는 일은 view.tsx 가 한다.
 * 왜 갈랐는지는 그 파일 머리에 있다.
 */
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

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center gap-[12px] px-[20px] pt-[80px]">
				<Loader2 className="size-[28px] animate-spin text-[#0180FF]" />
				<p className="text-[#9BA5B0] text-[14px]">{t("state.loading")}</p>
			</div>
		);
	}

	const continueLearning = data?.continueLearning ?? null;

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
		<HomeView
			/*
			 * 게스트도 이 화면에 온다. 이름 자리에 "Guest" 를 넣으면 "Guest 님" 이 되어
			 * 계정이 있는 것처럼 읽히고, 빈 문자열이면 " 님" 만 남는다. 그래서 게스트는
			 * 이름 틀을 쓰지 않고 인사말 하나로 대신한다 — view.tsx 가 처리한다.
			 */
			userName={user?.name ?? ""}
			attendance={data?.attendance ?? fallbackAttendance()}
			continueLearning={continueLearning}
			/*
			 * reviewCount 는 아직 넘기지 않는다 — 원천이 GET /review-queue 이고
			 * 그 API 가 없다(BLOCKERS §6). 생기면 여기 한 줄이 붙는다.
			 */
			learningStatus={
				data?.learningStatus ?? {
					chapterCompleted: 0,
					chapterTotal: 7,
					chapterLabel: t("home.statusFallback"),
					todayActivities: 0,
					weeklyActivities: 0,
				}
			}
			weeklyChart={data?.weeklyChart ?? { data: [0, 0, 0, 0, 0, 0, 0] }}
			onContinue={handleContinue}
			onStartLearning={() => navigate({ to: "/main/textbook" })}
		/>
	);
}
