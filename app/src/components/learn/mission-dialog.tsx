import type { CheckMission, FeedbackItem } from "@/api/apiType";
import {
	getChatDialog,
	getMsgList,
	postCheckMission,
	postCompleteDialog,
} from "@/api/chat";
import { useSharedAudio } from "@/components/audio/audio-provider";
import ChatMessage, {
	type ChatMsgProps,
	type MessageType,
} from "@/components/chat/chat-message";
import { DialogInput } from "@/components/dialog/dialog-input";
import { DialogScenario } from "@/components/dialog/dialog-scenario";
import { DialogSkipModal } from "@/components/dialog/dialog-skip-modal";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import {
	ActivityAppBar,
	ActivityFrame,
	FailedScreen,
} from "@/components/main/activity";
import { useToast } from "@/components/toast/toast-context";
import { env } from "@/config/env";
import { useRecording } from "@/hooks/useRecording";
import { dialogs } from "@/shared/data/dialog";
import { dialog_keywords } from "@/shared/data/dialog_keyword";
import { getTTSAudio } from "@/shared/tts-cache";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * AI 미션 대화 — 대화 단계 (명세 §4)
 *
 * 구 경로 /book/chapter/unit/dialog/$id 에 라우트로 있던 것을 컴포넌트로 떼어냈다.
 * "내부 단계는 컴포넌트 상태로" 라는 명세대로, 이제 /learn/mission-chat 이
 * 자기 상태로 브리핑 → 대화 → 리포트를 오간다.
 */
export default function MissionDialog({
	dialogId,
	lesson,
	onClose,
	onReport,
}: {
	dialogId: string;
	lesson: string;
	/** 대화를 그만두고 나간다 */
	onClose: () => void;
	/** 리포트 단계로 */
	onReport: () => void;
}) {
	const sound = useSoundEffects();
	const { playUrl, unlock } = useSharedAudio();
	const { addToast } = useToast();

	// --- Data lookups ---
	const dialog = dialogs.find((item) => item.id === dialogId);
	// dialogs 는 정적 데이터라 여기 없는 id 는 기다린다고 생기지 않는다 —
	// "Loading dialog" 라는 영문 리터럴이 박혀 있었는데 뜻도 틀렸다.
	// 공용 실패 화면(state.loadFailed)으로 보낸다. 목업 정본(activity__failed)이
	// 다시 시도 버튼을 켜 둔 채로 그리므로 __root.tsx 의 에러 경계와 같은
	// 새로고침을 물린다 — 안 물리면 눌리는데 아무 일도 안 하는 버튼이 된다.
	if (!dialog)
		return (
			<FailedScreen
				lesson={lesson}
				onExit={onClose}
				onRetry={() => window.location.reload()}
			/>
		);

	const gender = dialog.ai_gender;
	const missionList = dialog_keywords.filter(
		(item) => item.dialog_id === dialogId,
	);
	const scenarioImgUrl = `${env.RES_URL_ROOT}/${dialog.content_img}`;

	// --- State ---
	const [chatId, setChatId] = useState(0);
	const [isCompleted, setIsCompleted] = useState(false);
	const [isResponding, setResponding] = useState(false);
	const [completedList, setCompletedList] = useState<string[]>([]);
	const [msgList, setMsgList] = useState<ChatMsgProps[]>([]);
	const [confirmKind, setConfirmKind] = useState<"finish" | "exit" | null>(
		null,
	);
	const [isShowInputBox, setIsShowInputBox] = useState(false);
	const [textareaValue, setTextareaValue] = useState("");

	const scrollEndRef = useRef<HTMLDivElement>(null);
	const firstMsgPlayedRef = useRef(false);

	// --- Recording hook ---
	const recording = useRecording();

	// --- Helpers ---
	const scrollToBottom = useCallback(() => {
		setTimeout(() => {
			scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}, 100);
	}, []);

	const createMsg = useCallback(
		(
			idx: string,
			msgType: MessageType,
			_dialogId: string,
			_chatId: number,
			msg: string,
			voice: string,
			feedback: string | null,
		): ChatMsgProps => ({
			idx,
			msgType,
			dialogId: _dialogId,
			chatId: _chatId,
			setChatId,
			setResponding,
			scrollToBottom,
			closeDialog: onClose,
			goReport: onReport,
			msg,
			voice,
			feedback,
		}),
		[onClose, onReport, scrollToBottom],
	);

	const addSttMsg = useCallback(
		(msg: string, msgType: MessageType, feedback: string | null) => {
			const newId = `${Date.now()}_${msgType}`;
			const newMsg = createMsg(
				newId,
				msgType,
				dialogId,
				chatId,
				msg,
				gender,
				feedback,
			);
			setMsgList((prev) => [...prev, newMsg]);
		},
		[chatId, createMsg, dialogId, gender],
	);

	const checkMission = useCallback(
		async (msg: string): Promise<CheckMission | null> => {
			const res = await postCheckMission({ dialogId, chatId, msg });
			if (!res) return null;
			if (res.completed_missions.length > 0) {
				setCompletedList((prev) => [...prev, ...res.completed_missions]);
			}
			return res;
		},
		[chatId, dialogId],
	);

	const uploadMsg = useCallback(
		async (rawMsg: string) => {
			const msg = rawMsg.trim();
			if (msg.length < 2) {
				addToast("메시지를 2자 이상 입력해 주세요.");
				return;
			}

			recording.setRecordState("sending");
			const mission = await checkMission(msg);

			if (mission && ["perfect", "tip"].includes(mission.status)) {
				sound.playMissionChecked();
				if (mission.status === "perfect") {
					addSttMsg(msg, "user", null);
				} else {
					addSttMsg(msg, "tip", mission.feedback ?? "");
				}
			} else {
				addSttMsg(msg, "alert", mission?.feedback ?? "");
			}

			setTimeout(() => {
				addSttMsg(msg, "request", null);
			}, 400);

			recording.terminate();
		},
		[addSttMsg, addToast, checkMission, recording, sound],
	);

	// --- Event handlers ---
	const handleRecord = useCallback(async () => {
		if (recording.recordState === "idle") {
			await recording.startRecording();
			return;
		}
		if (recording.recordState === "recording") {
			recording.stopRecording();
			return;
		}
		if (recording.recordState === "done") {
			if (!recording.recordedMsg) {
				addToast("녹음된 내용이 없습니다.");
				recording.terminate();
				return;
			}
			await uploadMsg(recording.recordedMsg);
		}
	}, [addToast, recording, uploadMsg]);

	const handleSendText = useCallback(async () => {
		await unlock();
		const msg = textareaValue.trim();
		if (msg.length < 2) return;

		setIsShowInputBox(false);
		setTextareaValue("");
		await uploadMsg(msg);
	}, [textareaValue, unlock, uploadMsg]);

	const goReport = onReport;
	const hasUserProgress =
		completedList.length > 0 ||
		msgList.some((item) =>
			["user", "tip", "alert", "request", "completed"].includes(item.msgType),
		) ||
		recording.recordState !== "idle" ||
		Boolean(recording.recordedMsg) ||
		textareaValue.trim().length > 0;

	const requestExit = () => {
		if (hasUserProgress) setConfirmKind("exit");
		else onClose();
	};

	// --- Effects ---

	// Load initial data
	useEffect(() => {
		let isMounted = true;

		const fetchInitialData = async () => {
			const res = await getChatDialog(dialogId);
			if (!res || !isMounted) return;

			const currentChatId = res.chat?.id ?? 0;
			if (res.chat) setChatId(res.chat.id);

			const msgResponse = await getMsgList(dialogId);
			if (!msgResponse || !isMounted) return;

			/*
			 * 타입상 `msgs`·`feedbacks` 는 배열이지만 **응답이 늘 그 계약을 지키지는
			 * 않는다.** 빠져 있으면 바로 아래 `.map` 에서 죽고 대화 화면이 빈 채로
			 * 남는다 — `!msgResponse` 검사는 그 경우를 못 막는다(2026-08-25 확인).
			 * 계약이 깨진 것 자체는 서버·목 쪽에서 고치고, 화면은 죽지 않게 막는다.
			 */
			const { msgs: serverChats = [], feedbacks = [] } = msgResponse;

			const convertedFeedback: FeedbackItem[] = feedbacks.map((item) => ({
				...item,
				question:
					typeof item.question === "string"
						? JSON.parse(item.question)
						: item.question,
				answer:
					typeof item.answer === "string"
						? JSON.parse(item.answer)
						: item.answer,
			}));

			const tempMsgList: ChatMsgProps[] = [
				createMsg(
					"0_bot",
					"bot",
					dialogId,
					currentChatId,
					res.first_msg,
					gender,
					null,
				),
			];

			for (const item of serverChats) {
				if (!item.is_bot) {
					const feedback = convertedFeedback.find(
						(f) => f.question.content[0].text === item.msg,
					);
					if (feedback) {
						const status: "user" | "tip" | "alert" =
							feedback.answer.status === "tip"
								? "tip"
								: feedback.answer.status === "error"
									? "alert"
									: "user";
						tempMsgList.push(
							createMsg(
								`${item.id}_${item.is_bot}`,
								status,
								dialogId,
								currentChatId,
								item.msg,
								gender,
								feedback.answer.feedback,
							),
						);
					}
				} else {
					tempMsgList.push(
						createMsg(
							`${item.id}_${item.is_bot}`,
							"bot",
							dialogId,
							currentChatId,
							item.msg,
							gender,
							null,
						),
					);
				}
			}

			setCompletedList(res.chat?.completed_missions ?? []);
			setMsgList(tempMsgList);

			// Play first message audio if no history.
			// first_msg 는 다이얼로그별 고정 문장 → 서버 공통 캐시(/tts/generate, hash→S3)를
			// 재사용해 재생성 비용 없이 재생. 엔진/목소리는 스트리밍과 동일(Gemini·resolveVoice).
			if (serverChats.length === 0 && !firstMsgPlayedRef.current) {
				firstMsgPlayedRef.current = true;
				void unlock();
				const audioUrl = await getTTSAudio(res.first_msg, gender);
				if (audioUrl && isMounted) {
					void playUrl(audioUrl);
				}
			}
		};

		void fetchInitialData();
		return () => {
			isMounted = false;
		};
	}, [createMsg, dialogId, gender, playUrl, unlock]);

	// Check mission completion
	useEffect(() => {
		if (isCompleted) return;
		const missions = missionList.map((item) => item.keyword);
		const allCompleted = missions.every((word) => completedList.includes(word));

		if (allCompleted) {
			addSttMsg("", "completed", null);
			void postCompleteDialog(dialogId, chatId);
			setIsCompleted(true);
		}
	}, [addSttMsg, chatId, completedList, dialogId, isCompleted, missionList]);

	// Cleanup recording on unmount
	useEffect(() => {
		return () => recording.cleanup();
	}, [recording.cleanup]);

	// Handle virtual keyboard resize
	useEffect(() => {
		const visualViewport = window.visualViewport;

		const handleResize = () => {
			const root = document.getElementById("main-chat-container");
			if (root && visualViewport) {
				root.style.height = `${visualViewport.height}px`;
				root.style.transform = `translateY(${visualViewport.offsetTop}px)`;
			}
		};

		visualViewport?.addEventListener("resize", handleResize);
		visualViewport?.addEventListener("scroll", handleResize);

		return () => {
			visualViewport?.removeEventListener("resize", handleResize);
			visualViewport?.removeEventListener("scroll", handleResize);
		};
	}, []);

	return (
		<ActivityFrame id="main-chat-container">
			<ActivityAppBar
				lesson={lesson}
				onExit={requestExit}
				onSkip={() => (isCompleted ? goReport() : setConfirmKind("finish"))}
			/>
			<div className="mission-chat-header">
				<DialogScenario
					scenario={dialog.scenario}
					scenarioEng={dialog.scenario_eng}
					scenarioImgUrl={scenarioImgUrl}
					missionList={missionList}
					completedList={completedList}
				/>
			</div>

			{/* Chat Messages */}
			<div className="thread scrollbar-hide">
				{msgList.map((item) => (
					<ChatMessage key={item.idx} {...item} />
				))}
				<div className="chat-end-anchor" ref={scrollEndRef} />
			</div>

			{/* Input Area */}
			<DialogInput
				recordState={recording.recordState}
				recordedMsg={recording.recordedMsg}
				mediaRecorder={recording.mediaRecorder}
				textareaValue={textareaValue}
				setTextareaValue={setTextareaValue}
				isShowInputBox={isShowInputBox}
				setIsShowInputBox={setIsShowInputBox}
				onRecord={() => void handleRecord()}
				onTerminate={recording.terminate}
				onSendText={() => void handleSendText()}
				onRecordedMsgChange={(v) => recording.setRecordedMsg(v)}
				stopRecording={recording.stopRecording}
				unlock={unlock}
			/>

			{/* Skip Confirmation Modal */}
			{confirmKind && (
				<DialogSkipModal
					variant={confirmKind}
					onClose={() => setConfirmKind(null)}
					onConfirm={confirmKind === "exit" ? onClose : goReport}
				/>
			)}
		</ActivityFrame>
	);
}
