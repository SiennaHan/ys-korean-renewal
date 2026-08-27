import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";

import { useSharedAudio } from "@/components/audio/audio-provider";
import MissionDialog from "@/components/learn/mission-dialog";
import MissionReport from "@/components/learn/mission-report";
import { BriefingScreen } from "@/components/main/activity";
import { env } from "@/config/env";
import { useActivityState } from "@/hooks/use-activity-state";
import {
	findMissionChat,
	parseMissionDetail,
} from "@/shared/data/mission-chat";
import { useCallback, useEffect, useRef, useState } from "react";
import { type LearnSearch, parseLearnSearch } from "./-search";

export const Route = createFileRoute("/learn/mission-chat")({
	validateSearch: (search: Record<string, unknown>): LearnSearch =>
		parseLearnSearch(search),
	component: RouteComponent,
});

function RouteComponent() {
	/*
	 * 구 경로 /book/chapter/unit/mission_chat/$code 에서 옮겨 왔다 (명세 §4).
	 * URL 에서 콘텐츠 코드를 걷어내고 급·과만 받는다. 한 과에 미션대화는
	 * 하나뿐이라(실측 117개 · 과마다 하나) 원장을 (급, 과)로 바로 찾는다 —
	 * 구 앱처럼 모듈→유닛→챕터를 거쳐 코드를 되짚을 필요가 없다.
	 */
	const { level, lesson } = Route.useSearch();
	const navigate = useNavigate();
	const router = useRouter();
	/*
	 * 브리핑 → 대화 → 리포트. 명세 §4 의 "내부 단계는 컴포넌트 상태로" 다.
	 * 전에는 세 라우트였고 URL 에 dialog id 가 실렸다.
	 */
	const [phase, setPhase] = useState<"briefing" | "chat" | "report">(
		"briefing",
	);
	const { unlock } = useSharedAudio();

	const dialog = findMissionChat(level, lesson);
	const keywordList = parseMissionDetail(dialog?.mission_detail ?? "");
	const scenarioImgUrl = `${env.RES_URL_ROOT}/${dialog?.content_img}`;

	/*
	 * ⚠️ dialogId 는 구 체계(legacy_id, 예: "C4")를 그대로 쓴다. 실제 AI 대화를
	 * 돌리는 백엔드(`/chat/{dialogId}/...`)는 아직 이 원장이 아니라 자기 DB
	 * (ko_chat_dialog)를 보고, 그 DB 의 id 가 이 값으로 찾아진다. 원장 쪽
	 * item_id(MC-1-04-001)로 바꾸면 브리핑은 맞아도 실제 대화가 안 열린다.
	 */
	const dialogId = dialog?.legacy_id ?? "";

	/*
	 * 활동 상태 — 미션 대화는 **부분 적용**이다 (shell_spec §1).
	 *
	 * 진행바는 미션 키워드 개수만큼 그리지만 **진행률은 대화 1개 단위**다 —
	 * 끝냈으면 1/1 이다. 그래서 `totalItems` 가 1 이고, 이어할 위치가 없다
	 * (문항 단위 재개가 없다 — 대화는 처음부터 다시 하는 것뿐이다). 그래서
	 * `saveProgress` 를 부르지 않는다.
	 *
	 * 미달성 미션은 **정답률**로 센다 — `gradedCount`=미션 수 · `correctCount`=달성 수.
	 */
	const [missionState, setMissionState] = useState({
		missionCount: keywordList.length,
		achievedCount: 0,
	});
	const { complete } = useActivityState({
		bookId: level,
		chapterSeq: lesson,
		menuType: "mission-chat",
		totalItems: 1,
	});

	/** 대화 쪽에 넘기는 콜백. 신원이 매 렌더 바뀌면 저쪽 훅이 계속 다시 돈다 */
	const handleMissionState = useCallback(
		(state: { missionCount: number; achievedCount: number }) =>
			setMissionState(state),
		[],
	);

	/*
	 * 리포트로 넘어갈 때 한 번 완료를 알린다. 대화를 끝냈으면 응답 1개다 —
	 * 미션을 몇 개 달성했는지는 진행률이 아니라 정답률로 간다(위 주석).
	 */
	const reported = useRef(false);
	useEffect(() => {
		if (phase !== "report" || reported.current) return;
		reported.current = true;
		void complete({
			answeredCount: 1,
			gradedCount: missionState.missionCount,
			correctCount: missionState.achievedCount,
		});
	}, [phase, missionState, complete]);

	const goChat = async () => {
		await unlock();
		setPhase("chat");
	};

	const goBack = () => {
		router.history.back();
	};

	// 대화·리포트 단계 — 라우트가 아니라 이 화면이 띄운다 (명세 §4)
	if (phase === "chat" && dialog) {
		return (
			<MissionDialog
				dialogId={dialogId}
				lesson={`${level}급 ${lesson}과`}
				onClose={() => navigate({ to: "/main/textbook" })}
				onReport={() => setPhase("report")}
				onMissionState={handleMissionState}
			/>
		);
	}

	if (phase === "report" && dialog) {
		return (
			<MissionReport
				dialogId={dialogId}
				lesson={`${level}급 ${lesson}과`}
				onRetry={() => setPhase("chat")}
				onExit={() => navigate({ to: "/main/textbook" })}
			/>
		);
	}

	return (
		<BriefingScreen
			lesson={`${level}급 ${lesson}과`}
			content={{
				title: "상황에 맞는 대화를 연습하세요.",
				titleTranslated: "Practice with AI using the scenario.",
				scene: dialog?.situation_ko ?? "",
				sceneTranslated: dialog?.situation_en ?? "",
				sceneImageUrl: dialog ? scenarioImgUrl : undefined,
				keywords: keywordList.map((item) => [item.label, item.instruction]),
				words: [],
			}}
			onExit={goBack}
			onStart={() => void goChat()}
		/>
	);
}
