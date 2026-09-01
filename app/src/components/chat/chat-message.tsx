import { postChat, streamTts } from "@/api/chat";
import { useSharedAudio } from "@/components/audio/audio-provider";
import { getCachedTtsBlob, putCachedTtsPcm } from "@/shared/tts-cache";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	AlertUserMsgBox,
	BotMsgBox,
	BotMsgError,
	BotMsgProgress,
	CompletedMsgBox,
	TipUserMsgBox,
	UserMsgBox,
} from "./chat-text";

export type MessageType =
	| "alert"
	| "request"
	| "bot"
	| "user"
	| "completed"
	| "tip";

export interface ChatMsgProps {
	idx: string;
	msgType: MessageType;
	dialogId: string;
	chatId: number;
	setChatId: (id: number) => void;
	setResponding: (flag: boolean) => void;
	scrollToBottom: () => void;
	closeDialog: () => void;
	goReport: () => void;
	msg: string;
	voice: string;
	feedback: string | null | undefined;
}

export default function ChatMessage({
	idx,
	msgType,
	dialogId,
	chatId,
	setChatId,
	setResponding,
	scrollToBottom,
	goReport,
	msg,
	voice,
	feedback,
}: ChatMsgProps) {
	const { t } = useTranslation();
	const [resMsg, setResMsg] = useState<string | null>(null);
	const [lastText, setLastText] = useState<string | null>(null);
	const [isAudioLoading, setIsAudioLoading] = useState(false);
	/**
	 * `postChat` 이 실패(타임아웃 포함)했나 — **`BotMsgProgress` 가 무한히
	 * 도는 것을 막는다**(DEV-12). `msg`(사용자가 한 말)는 이 컴포넌트가
	 * 만들어질 때부터 prop 으로 들고 있으므로 재시도해도 잃을 것이 없다 —
	 * 다시 보낼 값이 이미 손에 있다.
	 */
	const [hasError, setHasError] = useState(false);
	const { playBlob, playPcmStream, unlock } = useSharedAudio();

	const fetchAudio = useCallback(
		async (text: string) => {
			try {
				setIsAudioLoading(true);
				setLastText(text);

				// 한번 끝까지 재생한 음성은 메모리에 캐시됨 → 재요청(Gemini 재생성) 없이 즉시 재생
				const cached = getCachedTtsBlob(text, voice);
				if (cached) {
					setIsAudioLoading(false);
					await unlock();
					await playBlob(cached);
					return;
				}

				// unlock(프로브 재생)을 기다리는 동안 TTS 요청을 먼저 던져 병렬화
				// (streamTts 는 내부에서 에러를 잡아 null 을 반환하므로 unhandled rejection 없음)
				const respPromise = streamTts(text, voice);
				await unlock();
				const resp = await respPromise;
				if (!resp) throw new Error("TTS 요청 실패");

				// 첫 오디오 청크가 재생되면 스피너 해제 (생성 지연을 스트리밍으로 숨김)
				await playPcmStream(resp, {
					onFirstAudio: () => setIsAudioLoading(false),
					// 정상 완료 시에만 호출됨 → 잘린 음원이 캐시될 일 없음
					onComplete: (pcm) => putCachedTtsPcm(text, voice, pcm),
				});
			} catch (err) {
				const message = (err as Error)?.message ?? "";
				const name = (err as DOMException)?.name ?? "";
				const isAbort = name === "AbortError" || /aborted|abort/i.test(message);
				if (!isAbort) {
					console.error("TTS failed:", message);
				}
			} finally {
				setIsAudioLoading(false);
			}
		},
		[playBlob, playPcmStream, unlock, voice],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: t 를 넣으면 안 된다 — 이 콜백은 아래 useEffect 의 의존성이고, 그 몸통이 postChat 을 부른다. 언어를 바꾸면 t 의 정체가 바뀌어 fetchData 가 새로 만들어지고, 효과가 다시 돌아 **같은 말이 서버로 한 번 더 날아간다.** t 는 여기서 응답이 비었을 때의 대체 문구에만 쓰이므로 클로저가 한 박자 낡아도 화면이 틀리지 않는다
	const fetchData = useCallback(
		async (userMsg: string) => {
			setHasError(false);
			setResponding(true);
			const response = await postChat({
				dialogId,
				chatId,
				msg: userMsg,
			});

			if (response) {
				setChatId(response.chat_id ?? 0);
				// 텍스트는 도착 즉시 표시하고 스크롤한 뒤, 음성은 이어서 재생한다.
				// (fetchAudio 를 void 로 fire-and-forget 하면 자동재생이 불안정해져
				//  스트림이 재생되지 않는 경우가 있어, await 로 재생 흐름을 유지한다.)
				setResMsg(response.answer ?? t("missionChat.noMessage"));
				setTimeout(() => scrollToBottom(), 100);
				await fetchAudio(response.answer);
			} else {
				setHasError(true);
			}

			setResponding(false);
		},
		[chatId, dialogId, fetchAudio, scrollToBottom, setChatId, setResponding],
	);

	const retry = useCallback(() => {
		void fetchData(msg);
	}, [fetchData, msg]);

	const replayAudio = useCallback(async () => {
		// 캐시 히트 시 즉시 재생, 미스(직전 스트림이 중단된 경우 등)면 재스트리밍
		await fetchAudio(lastText ?? msg);
	}, [fetchAudio, lastText, msg]);

	// idx 는 재실행 방아쇠다 — 새 말이 붙었을 때 바닥으로 내리려고 넣었다.
	// 몸통이 idx 를 읽지는 않지만, 지우면 같은 글이 다시 와도 스크롤이 안 된다.
	// biome-ignore lint/correctness/useExhaustiveDependencies: idx 는 새 말이 왔음을 알리는 방아쇠다
	useEffect(() => {
		scrollToBottom();
		if (msgType === "request") {
			void fetchData(msg);
		}
	}, [idx, msgType, msg, fetchData, scrollToBottom]);

	return (
		<div>
			{msgType === "completed" && <CompletedMsgBox closeDialog={goReport} />}
			{msgType === "alert" && <AlertUserMsgBox msg={msg} alertMsg={feedback} />}
			{msgType === "tip" && <TipUserMsgBox msg={msg} alertMsg={feedback} />}
			{msgType === "bot" && (
				<BotMsgBox
					msg={msg}
					replayAudio={replayAudio}
					isAudioLoading={isAudioLoading}
				/>
			)}
			{msgType === "user" && <UserMsgBox msg={msg} />}
			{msgType === "request" && resMsg && (
				<BotMsgBox
					msg={resMsg}
					replayAudio={replayAudio}
					isAudioLoading={isAudioLoading}
				/>
			)}
			{msgType === "request" && !resMsg && hasError && (
				<BotMsgError onRetry={retry} />
			)}
			{msgType === "request" && !resMsg && !hasError && <BotMsgProgress />}
		</div>
	);
}
