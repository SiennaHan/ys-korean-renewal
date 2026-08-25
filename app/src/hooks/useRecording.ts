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

export type RecordState = RecordMode;
type StopAction = "transcribe" | "discard";

interface UseRecordingOptions {
	onTranscribed?: (text: string) => void;
}

export function useRecording(options: UseRecordingOptions = {}) {
	const { unlock } = useSharedAudio();
	const { requestPermission } = useMicPermission();
	const { addToast } = useToast();

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
				addToast("녹음 데이터가 비어있습니다. 다시 시도해 주세요.");
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
					addToast("음성 인식 결과가 비어있습니다. 다시 시도해 주세요.");
					return;
				}

				setRecordedMsg(text);
				setRecordState("done");
				options.onTranscribed?.(text);
			} catch {
				if (reqId !== transcribeReqIdRef.current) return;
				setRecordState("idle");
				addToast("음성 인식에 실패했습니다. 다시 시도해 주세요.");
			}
		},
		[addToast, options],
	);

	const startRecording = useCallback(async () => {
		clearPhaseTimer();
		setRecordState("preparing");
		if (typeof MediaRecorder === "undefined") {
			setRecordState("idle");
			addToast("현재 브라우저는 음성 녹음을 지원하지 않습니다.");
			return;
		}

		await unlock();
		const granted = await requestPermission();
		if (!granted) {
			setRecordState("idle");
			addToast("마이크 권한이 필요합니다.");
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
			addToast(
				"녹음을 시작할 수 없습니다. 브라우저/권한 설정을 확인해 주세요.",
			);
		}
	}, [
		addToast,
		clearPhaseTimer,
		clearRecorderResources,
		requestPermission,
		transcribeBlob,
		unlock,
	]);

	const stopRecording = useCallback(() => {
		clearPhaseTimer();
		const recorder = mediaRecorderRef.current;
		if (!recorder || recorder.state === "inactive") {
			setRecordState("idle");
			addToast("녹음이 시작되지 않았습니다. 다시 시도해 주세요.");
			return;
		}

		stopActionRef.current = "transcribe";
		setRecordState("finishing");
		phaseTimerRef.current = setTimeout(() => {
			recorder.stop();
			phaseTimerRef.current = null;
		}, RECORD_TAIL_MS);
	}, [addToast, clearPhaseTimer]);

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
