import { postSpeaking } from "@/api/analyzeApi";
import { useSharedAudio } from "@/components/audio/audio-provider";
import { useMicPermission } from "@/components/audio/mic-permission-provider";
import { useToast } from "@/components/toast/toast-context";
import { useCallback, useRef, useState } from "react";

export type RecordState =
	| "ready"
	| "recording"
	| "converting"
	| "recorded"
	| "uploading";
type StopAction = "transcribe" | "discard";

interface UseRecordingOptions {
	onTranscribed?: (text: string) => void;
}

export function useRecording(options: UseRecordingOptions = {}) {
	const { unlock } = useSharedAudio();
	const { requestPermission } = useMicPermission();
	const { addToast } = useToast();

	const [recordState, setRecordState] = useState<RecordState>("ready");
	const [recordedMsg, setRecordedMsg] = useState<string | null>(null);
	const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
		null,
	);
	const [isRecording, setIsRecording] = useState(false);

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const recordChunksRef = useRef<Blob[]>([]);
	const stopActionRef = useRef<StopAction>("transcribe");
	const transcribeReqIdRef = useRef(0);

	const clearRecorderResources = useCallback(() => {
		if (mediaStreamRef.current) {
			for (const track of mediaStreamRef.current.getTracks()) {
				track.stop();
			}
			mediaStreamRef.current = null;
		}
		mediaRecorderRef.current = null;
		setMediaRecorder(null);
		setIsRecording(false);
	}, []);

	const transcribeBlob = useCallback(
		async (blob: Blob) => {
			if (blob.size === 0) {
				setRecordState("ready");
				addToast("녹음 데이터가 비어있습니다. 다시 시도해 주세요.");
				return;
			}

			const reqId = ++transcribeReqIdRef.current;
			setRecordState("converting");

			try {
				const sttMsg = await postSpeaking(blob);
				if (reqId !== transcribeReqIdRef.current) return;

				const text = String(sttMsg ?? "").trim();
				if (!text) {
					setRecordState("ready");
					addToast("음성 인식 결과가 비어있습니다. 다시 시도해 주세요.");
					return;
				}

				setRecordedMsg(text);
				setRecordState("recorded");
				options.onTranscribed?.(text);
			} catch {
				if (reqId !== transcribeReqIdRef.current) return;
				setRecordState("ready");
				addToast("음성 인식에 실패했습니다. 다시 시도해 주세요.");
			}
		},
		[addToast, options],
	);

	const startRecording = useCallback(async () => {
		if (typeof MediaRecorder === "undefined") {
			addToast("현재 브라우저는 음성 녹음을 지원하지 않습니다.");
			return;
		}

		await unlock();
		const granted = await requestPermission();
		if (!granted) {
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
			setIsRecording(true);
			setRecordedMsg(null);
			setRecordState("recording");
			recorder.start();
		} catch {
			clearRecorderResources();
			setRecordState("ready");
			addToast(
				"녹음을 시작할 수 없습니다. 브라우저/권한 설정을 확인해 주세요.",
			);
		}
	}, [
		addToast,
		clearRecorderResources,
		requestPermission,
		transcribeBlob,
		unlock,
	]);

	const stopRecording = useCallback(() => {
		const recorder = mediaRecorderRef.current;
		if (!recorder || recorder.state === "inactive") {
			setRecordState("ready");
			addToast("녹음이 시작되지 않았습니다. 다시 시도해 주세요.");
			return;
		}

		stopActionRef.current = "transcribe";
		setRecordState("converting");
		recorder.stop();
	}, [addToast]);

	const terminate = useCallback(() => {
		stopActionRef.current = "discard";
		if (
			mediaRecorderRef.current &&
			mediaRecorderRef.current.state !== "inactive"
		) {
			mediaRecorderRef.current.stop();
		} else {
			clearRecorderResources();
		}

		setRecordState("ready");
		setRecordedMsg(null);
	}, [clearRecorderResources]);

	const cleanup = useCallback(() => {
		stopActionRef.current = "discard";
		if (
			mediaRecorderRef.current &&
			mediaRecorderRef.current.state !== "inactive"
		) {
			mediaRecorderRef.current.stop();
		}
		clearRecorderResources();
	}, [clearRecorderResources]);

	return {
		recordState,
		setRecordState,
		recordedMsg,
		setRecordedMsg,
		mediaRecorder,
		isRecording,
		startRecording,
		stopRecording,
		terminate,
		cleanup,
	};
}
