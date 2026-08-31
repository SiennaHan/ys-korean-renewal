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
import { DialogSkipModal } from "@/components/dialog/dialog-skip-modal";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import { ChatScreen } from "@/components/main/activity";
import { useToast } from "@/components/toast/toast-context";
import { env } from "@/config/env";
import { useRecording } from "@/hooks/useRecording";
import { dialog_keywords } from "@/shared/data/dialog_keyword";
import type { MissionChatItem } from "@/shared/data/mission-chat";
import { getTTSAudio } from "@/shared/tts-cache";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * AI 미션 대화 — 대화 단계 (명세 §4)
 *
 * 구 경로 /book/chapter/unit/dialog/$id 에 라우트로 있던 것을 컴포넌트로 떼어냈다.
 * "내부 단계는 컴포넌트 상태로" 라는 명세대로, 이제 /learn/mission-chat 이
 * 자기 상태로 브리핑 → 대화 → 리포트를 오간다.
 */
export default function MissionDialog({
	dialogId,
	dialog,
	lesson,
	onClose,
	onReport,
	onMissionState,
}: {
	dialogId: string;
	/**
	 * 그 과의 시나리오 — **서버에서 온 원장 행이다**(2026-08-31 · DEV-05).
	 *
	 * 전에는 이 컴포넌트가 `dialogs`(구 앱 덤프 `dialog.ts`)에서 `dialogId` 로
	 * 찾아 썼다. 그 파일이 **1.96MB 였고 그중 95%가 이 화면이 읽지도 않는
	 * 프롬프트**였다 — 프롬프트는 서버(`ko_chat_dialog`)가 쥔다. 부모가 이미
	 * 같은 과의 행을 서버에서 받아 두므로 그것을 그대로 내려받는다.
	 */
	dialog: MissionChatItem;
	lesson: string;
	/** 대화를 그만두고 나간다 */
	onClose: () => void;
	/** 리포트 단계로 */
	onReport: () => void;
	/**
	 * 미션 몇 개 중 몇 개를 달성했는지 위로 알린다 — 활동 완료 기록에 쓴다
	 * (shell_spec §1: 미션 대화는 `gradedCount`=미션 수 · `correctCount`=달성 수).
	 *
	 * `onReport` 에 실어 보내지 않은 이유는 그 콜백이 채팅 메시지 컴포넌트까지
	 * `goReport` 로 내려가 있어서다 — 서명을 바꾸면 그 길 전체가 같이 바뀐다.
	 */
	onMissionState?: (state: {
		missionCount: number;
		achievedCount: number;
	}) => void;
}) {
	const { t } = useTranslation();
	const sound = useSoundEffects();
	const { playUrl, unlock } = useSharedAudio();
	const { addToast } = useToast();

	// --- Data lookups ---
	// **찾는 일이 없어졌다.** 부모(`routes/learn/mission-chat.tsx`)가 서버에서
	// 받은 그 과의 행을 넘겨 주고, `dialog` 가 없으면 애초에 이 화면을 안 그린다.
	// 예전 실패 화면은 부모의 `contentState` 가 대신 본다(loading · locked · failed).
	const gender = dialog.ai_gender;
	/*
	 * **`useMemo` 가 없으면 화면이 무한히 다시 그린다.**
	 *
	 * `filter` 는 렌더마다 새 배열을 낸다. 그 배열이 아래 「달성 수를 위로
	 * 올린다」 효과의 의존성에 들어 있어서, 효과가 **매 렌더** 돌며 부모의
	 * `setMissionState` 를 부른다 → 부모가 다시 그린다 → 새 배열 → 다시…
	 *
	 * 그 고리가 부모의 인라인 콜백까지 새로 만들어 `createMsg` 를 갈아치우고,
	 * 그러면 초기 로드 효과가 다시 돌아 `getChatDialog` 를 또 부른다.
	 * **2026-08-31 실측: 8초에 3,520건** — 브라우저가 소켓이 모자라 죽었다
	 * (`ERR_INSUFFICIENT_RESOURCES`). 서버가 500 을 내고 있어서 눈에 띄었지,
	 * 200 이었으면 조용히 돌기만 했을 자리다.
	 */
	const missionList = useMemo(
		() => dialog_keywords.filter((item) => item.dialog_id === dialogId),
		[dialogId],
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
				addToast(t("missionChat.errTooShort"), "error");
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
		[addSttMsg, addToast, checkMission, recording, sound, t],
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
				addToast(t("missionChat.errNoRecording"), "error");
				recording.terminate();
				return;
			}
			await uploadMsg(recording.recordedMsg);
		}
	}, [addToast, recording, t, uploadMsg]);

	const handleSendText = useCallback(async () => {
		await unlock();
		const msg = textareaValue.trim();
		if (msg.length < 2) return;

		setIsShowInputBox(false);
		setTextareaValue("");
		await uploadMsg(msg);
	}, [textareaValue, unlock, uploadMsg]);

	/*
	 * 달성 수를 위로 올린다.
	 *
	 * **`completedList` 를 그대로 세면 안 된다** — 서버 응답을 이어 붙이므로
	 * (`[...prev, ...res.completed_missions]`) 같은 미션이 두 번 들어올 수 있다.
	 * 이 과의 미션 키워드와 교집합을 중복 없이 센다.
	 */
	useEffect(() => {
		if (!onMissionState) return;
		const done = new Set(completedList);
		onMissionState({
			missionCount: missionList.length,
			achievedCount: missionList.filter((m) => done.has(m.keyword)).length,
		});
	}, [completedList, missionList, onMissionState]);

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
			 * 타입상 `msgs`·`feedbacks` 는 배열이지만 응답이 늘 그 계약을 지키지는
			 * 않는다 — 빠져 있으면 아래 `.map` 에서 죽는다(2026-08-25 확인).
			 *
			 * **계약은 이제 래퍼가 지킨다** — `api/chat.ts` 의 `getMsgList` 가
			 * `withArrays` 로 두 필드를 배열로 맞춰 준다(2026-08-26). 아래 기본값은
			 * 그래도 두는 겹옷이다. 새로 부르는 곳은 래퍼만 믿으면 된다.
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
		<ChatScreen
			lesson={lesson}
			scenario={dialog.situation_ko}
			scenarioTranslated={dialog.situation_en}
			scenarioImgUrl={scenarioImgUrl}
			missions={missionList}
			completed={completedList}
			threadEndRef={scrollEndRef}
			onExit={requestExit}
			onSkip={() => (isCompleted ? goReport() : setConfirmKind("finish"))}
			compose={
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
			}
		>
			{msgList.map((item) => (
				<ChatMessage key={item.idx} {...item} />
			))}
			{/* 그만둘지 묻는 창은 실 안이 아니라 화면 위에 뜬다 */}
			{confirmKind && (
				<DialogSkipModal
					variant={confirmKind}
					onClose={() => setConfirmKind(null)}
					onConfirm={confirmKind === "exit" ? onClose : goReport}
				/>
			)}
		</ChatScreen>
	);
}
