import { type DashboardData, getDashboard } from "@/api/dashboard";
import { getHomeReviewQueue } from "@/api/review-queue";
import { useAuth } from "@/components/sign/sign-provider";
import { LEARN_ROUTE, type LessonActivityId } from "@/shared/lesson-flow";
import { useEntitlement } from "@/shared/store/entitlement-store";
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
	/* 홈이 권한을 읽는 첫 화면이다 — 학기 종료를 알려야 하기 때문이다 */
	const { entitlement, ready } = useEntitlement();
	const navigate = useNavigate();
	const [data, setData] = useState<DashboardData | null>(null);
	const [loading, setLoading] = useState(true);

	/**
	 * 다시 풀기 총계와 첫 항목.
	 *
	 * 총계는 카드에 쓰고, 첫 항목은 **어디로 보낼지** 에 쓴다. 큐가 여러 활동에
	 * 흩어져 있으면 한 번에 한 활동씩 끝낸다(기획 확정 2026-08-26) —
	 * 그 활동을 끝내고 홈에 오면 다음 활동이 뜬다.
	 */
	const [review, setReview] = useState<{
		total: number;
		first: { bookId: number; chapterSeq: number; menuType: string } | null;
	}>({ total: 0, first: null });

	useEffect(() => {
		getDashboard()
			.then(setData)
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		getHomeReviewQueue().then((q) => {
			const it = q.items[0];
			setReview({
				total: q.total,
				first: it
					? {
							bookId: it.bookId,
							chapterSeq: it.chapterSeq,
							menuType: it.menuType,
						}
					: null,
			});
		});
	}, []);

	/**
	 * 다시 풀기 카드를 누르면 큐 첫 항목의 활동으로 보낸다.
	 *
	 * `?review=1` 이 붙으면 그 화면이 큐에서 자기 몫을 받아 그 문항만 낸다 —
	 * 결과 화면의 [다시 풀기] 와 같은 길이라 새 화면이 없다.
	 *
	 * **중간에 멈춰도 깨지지 않는다.** 맞힌 것은 큐에서 빠지고, 또 틀린 것은
	 * 내일로 밀리고, 손대지 않은 것은 오늘 그대로 남는다 — 큐가 곧 진행 상태다.
	 */
	const handleReview = () => {
		const first = review.first;
		if (!first) return;
		const route = LEARN_ROUTE[first.menuType as LessonActivityId];
		// 자모처럼 이 표에 없는 활동은 아직 배선 밖이다 — 조용히 아무것도 하지 않는다
		if (!route) return;
		navigate({
			to: route,
			search: { level: first.bookId, lesson: first.chapterSeq, review: true },
		});
	};

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

	/*
	 * **학기가 끝났나.** 앱이 계산하지 않는다 — 서버가 낸 값을 읽을 뿐이다.
	 * 학기 종료는 `source:"school"` + 과거 `expires_at` 으로 온다
	 * (`api/business/entitlement.py` 의 학교 분기).
	 *
	 * `ready` 가 참이 될 때까지는 아무것도 말하지 않는다 — 답이 오기 전에
	 * 「끝났다」고 하면 잠깐 잘못된 말을 하게 된다.
	 */
	const accessEnded =
		ready &&
		entitlement?.source === "school" &&
		!!entitlement.expires_at &&
		new Date(entitlement.expires_at).getTime() < Date.now();

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
			 * 원천은 GET /review-queue 다 — 2026-08-26 에 만들었다(BLOCKERS §9-a-1).
			 * 라우트에 없는 활동(자모 등)만 큐에 남아 있으면 카드는 뜨는데 눌러도
			 * 아무 일이 없다 — 그 활동들을 배선하면 풀린다.
			 */
			reviewCount={review.total}
			/* 오늘 낼 문항이 있나 — 큐의 `items` 가 비면 내일부터다(view.tsx 주석) */
			reviewReady={review.first !== null}
			onReview={handleReview}
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
			accessEnded={accessEnded}
		/>
	);
}
