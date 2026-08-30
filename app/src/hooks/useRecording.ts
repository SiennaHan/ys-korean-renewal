import { postSpeaking } from "@/api/analyzeApi";
import { useSharedAudio } from "@/components/audio/audio-provider";
import { useMicPermission } from "@/components/audio/mic-permission-provider";
import {
	RECORD_PREPARE_MS,
	RECORD_TAIL_MS,
	type RecordMode,
} from "@/components/main/activity";
import { useToast } from "@/components/toast/toast-context";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export type RecordState = RecordMode;
type StopAction = "transcribe" | "discard";

interface UseRecordingOptions {
	onTranscribed?: (text: string) => void;
}

export function useRecording(options: UseRecordingOptions = {}) {
	const { unlock } = useSharedAudio();
	const { requestPermission } = useMicPermission();
	const { addToast } = useToast();
	/*
	 * **토스트 문구를 여기서 지어내지 않는다.** 이 앱을 쓰는 사람은 전부 한국어를
	 * 배우는 중이고 화면은 5개 언어다 — 전에는 이 파일의 일곱 줄만 한국어로 박혀
	 * 있어서, 같은 미션 대화 화면에서 어떤 토스트는 번역되고 어떤 것은 한국어로
	 * 떴다(2026-08-28 에 고쳤다). i18n 검수(`docs/i18n_검수_20260828.md`)가
	 * 컴포넌트만 봐서 `hooks/` 가 빠져 있었다.
	 */
	const { t } = useTranslation();

	const [recordState, setRecordState] = useState<RecordState>("idle");
	const [recordedMsg, setRecordedMsg] = useState<string | null>(null);
	const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
		null,
	);

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const recordChunksRef = useRef<Blob[]>([]);
	const stopActionRef = useRef<StopAction>("transcribe");
	const transcribeReqIdRef = useRef(0);
	const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearPhaseTimer = useCallback(() => {
		if (phaseTimerRef.current) {
			clearTimeout(phaseTimerRef.current);
			phaseTimerRef.current = null;
		}
	}, []);

	const clearRecorderResources = useCallback(() => {
		if (mediaStreamRef.current) {
			for (const track of mediaStreamRef.current.getTracks()) {
				track.stop();
			}
			mediaStreamRef.current = null;
		}
		mediaRecorderRef.current = null;
		setMediaRecorder(null);
	}, []);

	const transcribeBlob = useCallback(
		async (blob: Blob) => {
			if (blob.size === 0) {
				setRecordState("idle");
				addToast(t("activity.rec_empty"), "error");
				return;
			}

			const reqId = ++transcribeReqIdRef.current;
			setRecordState("sending");

			try {
				const sttMsg = await postSpeaking(blob);
				if (reqId !== transcribeReqIdRef.current) return;

				const text = String(sttMsg ?? "").trim();
				if (!text) {
					setRecordState("idle");
					addToast(t("activity.rec_noText"), "error");
					return;
				}

				setRecordedMsg(text);
				setRecordState("done");
				options.onTranscribed?.(text);
			} catch {
				if (reqId !== transcribeReqIdRef.current) return;
				setRecordState("idle");
				addToast(t("activity.rec_sttFailed"), "error");
			}
		},
		[addToast, options, t],
	);

	const startRecording = useCallback(async () => {
		clearPhaseTimer();
		setRecordState("preparing");
		if (typeof MediaRecorder === "undefined") {
			setRecordState("idle");
			addToast(t("activity.rec_unsupported"), "error");
			return;
		}

		await unlock();
		const granted = await requestPermission();
		if (!granted) {
			setRecordState("idle");
			addToast(t("activity.rec_needMic"), "error");
			return;
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});
			mediaStreamRef.current = stream;

			const mimeTypeCandidates = [
				"audio/webm;codecs=opus",
				"audio/webm",
				"audio/mp4",
			];
			const mimeType = mimeTypeCandidates.find((type) => {
				try {
					return MediaRecorder.isTypeSupported(type);
				} catch {
					return false;
				}
			});

			const recorder = mimeType
				? new MediaRecorder(stream, { mimeType })
				: new MediaRecorder(stream);

			recordChunksRef.current = [];
			stopActionRef.current = "transcribe";

			recorder.ondataavailable = (event) => {
				if (event.data?.size > 0) {
					recordChunksRef.current.push(event.data);
				}
			};

			recorder.onstop = () => {
				const action = stopActionRef.current;
				const chunks = [...recordChunksRef.current];
				recordChunksRef.current = [];
				clearRecorderResources();

				if (action === "discard") return;

				const blobType = mimeType || chunks[0]?.type || "audio/webm";
				const blob = new Blob(chunks, { type: blobType });
				void transcribeBlob(blob);
			};

			mediaRecorderRef.current = recorder;
			setMediaRecorder(recorder);
			setRecordedMsg(null);
			recorder.start();
			phaseTimerRef.current = setTimeout(() => {
				setRecordState("recording");
				phaseTimerRef.current = null;
			}, RECORD_PREPARE_MS);
		} catch {
			clearRecorderResources();
			setRecordState("idle");
			addToast(t("activity.rec_startFailed"), "error");
		}
	}, [
		addToast,
		clearPhaseTimer,
		clearRecorderResources,
		requestPermission,
		t,
		transcribeBlob,
		unlock,
	]);

	const stopRecording = useCallback(() => {
		clearPhaseTimer();
		const recorder = mediaRecorderRef.current;
		if (!recorder || recorder.state === "inactive") {
			setRecordState("idle");
			addToast(t("activity.rec_notStarted"), "error");
			return;
		}

		stopActionRef.current = "transcribe";
		setRecordState("finishing");
		phaseTimerRef.current = setTimeout(() => {
			recorder.stop();
			phaseTimerRef.current = null;
		}, RECORD_TAIL_MS);
	}, [addToast, clearPhaseTimer, t]);

	const terminate = useCallback(() => {
		clearPhaseTimer();
		stopActionRef.current = "discard";
		if (
			mediaRecorderRef.current &&
			mediaRecorderRef.current.state !== "inactive"
		) {
			mediaRecorderRef.current.stop();
		} else {
			clearRecorderResources();
		}

		setRecordState("idle");
		setRecordedMsg(null);
	}, [clearPhaseTimer, clearRecorderResources]);

	const cleanup = useCallback(() => {
		clearPhaseTimer();
		stopActionRef.current = "discard";
		if (
			mediaRecorderRef.current &&
			mediaRecorderRef.current.state !== "inactive"
		) {
			mediaRecorderRef.current.stop();
		}
		clearRecorderResources();
	}, [clearPhaseTimer, clearRecorderResources]);

	return {
		recordState,
		setRecordState,
		recordedMsg,
		setRecordedMsg,
		mediaRecorder,
		startRecording,
		stopRecording,
		terminate,
		cleanup,
	};
}
