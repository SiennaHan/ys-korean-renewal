import { postChat, streamTts } from "@/api/chat";
import { useSharedAudio } from "@/components/audio/audio-provider";
import { getCachedTtsBlob, putCachedTtsPcm } from "@/shared/tts-cache";
import { useCallback, useEffect, useState } from "react";
import {
	AlertUserMsgBox,
	BotMsgBox,
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
	const [resMsg, setResMsg] = useState<string | null>(null);
	const [lastText, setLastText] = useState<string | null>(null);
	const [isAudioLoading, setIsAudioLoading] = useState(false);
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

	const fetchData = useCallback(
		async (userMsg: string) => {
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
				setResMsg(response.answer ?? "메시지 없음");
				setTimeout(() => scrollToBottom(), 100);
				await fetchAudio(response.answer);
			}

			setResponding(false);
		},
		[chatId, dialogId, fetchAudio, scrollToBottom, setChatId, setResponding],
	);

	const replayAudio = useCallback(async () => {
		// 캐시 히트 시 즉시 재생, 미스(직전 스트림이 중단된 경우 등)면 재스트리밍
		await fetchAudio(lastText ?? msg);
	}, [fetchAudio, lastText, msg]);

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
			{msgType === "request" && !resMsg && <BotMsgProgress />}
		</div>
	);
}
