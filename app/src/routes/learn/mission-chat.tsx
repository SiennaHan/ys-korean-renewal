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
import {
	findMissionChat,
	parseMissionDetail,
} from "@/shared/data/mission-chat";
import { useState } from "react";
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
