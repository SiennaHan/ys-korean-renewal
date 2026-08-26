import { DialogScenario } from "@/components/dialog/dialog-scenario";
import type { ReactNode, RefObject } from "react";
import { ActivityAppBar, ActivityFrame } from "./shell";

/** 미션 하나 — 채워야 하는 키워드와 그 설명 */
export interface ChatMission {
	id: number | string;
	keyword: string;
	content?: string;
}

/**
 * 미션 대화.
 *
 * 문항을 푸는 화면이 아니라 대화가 쌓이는 화면이라 골격을 쓰지 않는다 —
 * 진행 막대 대신 미션 줄이 진행을 말하고, 스크롤 영역 대신 실이 자란다.
 *
 * **제품이 그대로 그리는 화면이다**(2026-08-26). 전에는 이 컴포넌트가 목업에서
 * 뜬 두 번째 판이었고 제품(`learn/mission-dialog`)은 자기 마크업을 따로 갖고
 * 있었다. 그 사이에 제품 쪽이 앞서 나갔는데(미션 접기 패널·상황 그림·키보드
 * 입력) 정본은 그대로여서, 대조는 **아무도 안 보는 화면**을 통과시키고 있었다.
 *
 * 실 안의 말(`children`)과 하단 입력(`compose`)만 밖에서 받는다. 말은 서버가
 * 주는 것이고 입력은 마이크·키보드를 쥐고 있어서, 둘 다 상태가 있는 쪽의 몫이다.
 * 그 밖의 껍데기는 — 상단 바 · 시나리오 · 미션 줄 · 실 · 바닥 닻 — 여기 있다.
 */
export function ChatScreen({
	lesson,
	scenario,
	scenarioTranslated,
	scenarioImgUrl,
	missions,
	/** 지금까지 채운 미션 키워드 */
	completed,
	children,
	compose,
	/** 새 말이 붙을 때 여기로 스크롤한다 */
	threadEndRef,
	onExit,
	onSkip,
}: {
	lesson: string;
	scenario: string;
	scenarioTranslated: string;
	scenarioImgUrl: string;
	missions: ChatMission[];
	completed: string[];
	children?: ReactNode;
	compose?: ReactNode;
	threadEndRef?: RefObject<HTMLDivElement>;
	onExit?: () => void;
	onSkip?: () => void;
}) {
	return (
		<ActivityFrame id="main-chat-container">
			<ActivityAppBar lesson={lesson} onExit={onExit} onSkip={onSkip} />
			{/*
			 * 시나리오와 미션 줄이 한 덩어리로 붙어 있어야 한다. 목업에서는 둘이
			 * 프레임의 직계 flex 자식이었는데, 실이 그 사이를 파고들면서 미션 줄의
			 * 높이가 알약 크기로 쭈그러들었다 — 그래서 껍데기를 하나 씌웠다.
			 */}
			<div className="mission-chat-header">
				<DialogScenario
					scenario={scenario}
					scenarioEng={scenarioTranslated}
					scenarioImgUrl={scenarioImgUrl}
					missionList={missions}
					completedList={completed}
				/>
			</div>

			<div className="thread scrollbar-hide">
				{children}
				<div className="chat-end-anchor" ref={threadEndRef} />
			</div>

			{compose}
		</ActivityFrame>
	);
}
