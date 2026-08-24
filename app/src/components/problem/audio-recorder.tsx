import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useAudioRecorder } from "react-audio-voice-recorder";

import { postSpeaking } from "@/api/analyzeApi";
import { MicIcon } from "@/assets/icons";
import {
	MicBlockedDialog,
	RecordControl,
	type RecordMode,
} from "@/components/main/activity";
import { env } from "@/config/env";
import { Mic, Trash2, Upload, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "../toast/toast-context";
import CircularProgress from "../ui/circular-progress";

interface Props {
	setResult: (isCorrect: boolean, resultWord: string, audioUrl: string) => void;
	disabled?: boolean;
	/**
	 * 활동 화면의 도크에 앉는 모습. 목업의 record-core 를 쓴다 —
	 * 버튼 옆에 지금 무엇을 하면 되는지가 글로 붙는다.
	 * 켜지 않으면 예전 모습 그대로다(아직 안 옮긴 화면들이 쓴다).
	 */
	dock?: boolean;
	/**
	 * 마이크가 막혀 학생이 이 활동을 건너뛰기로 했을 때.
	 * 막혔다는 사실 자체는 이 컴포넌트가 알림으로 알린다 — 쓰는 화면마다
	 * 같은 처리를 되풀이하지 않도록.
	 */
	onSkipActivity?: () => void;
}
type RecorderStatus =
	| "idle"
	| "preparing"
	| "recording"
	| "finishing"
	| "recorded"
	| "uploading";

/**
 * 누르자마자 말하면 첫 음절이 잘린다 — 마이크보다 사람이 빠르다.
 * "준비 중"을 2초 보여 주어 그동안 말하지 않게 한다.
 * 녹음 자체는 누르는 즉시 시작한다. 그래야 그 사이에 말해도 잃는 것이 없다.
 */
const PREPARE_MS = 2000;
/** 끝났다고 누른 뒤에도 1초 더 담는다 — 마지막 말이 잘리지 않게 */
const TAIL_MS = 1000;

const baseButtonClasses =
	"flex justify-center items-center rounded-full text-[#fff] transition-all duration-200 ease-in-out cursor-pointer \
                          bg-[#0180FF] hover:bg-[#0180FFbb] active:bg-[#0180FFdd] \
                          disabled:text-gray-300 disabled:shadow-none disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400";

const AudioRecorder = (props: Props) => {
	// const API_ENDPOINT = `${env.SPEAK_API_URL}/analyze/sound`;
	// const API_ENDPOINT = `${env.KOREAN_API_URL}/stt/convert`

	const { addToast } = useToast();
	const { t } = useTranslation();
	const [recorderStatus, setRecorderStatus] = useState<RecorderStatus>("idle");
	/** 마이크가 막혀 알림을 띄운 상태 */
	const [micBlocked, setMicBlocked] = useState(false);
	const [audioUrl, setAudioUrl] = useState<string | null>(null);
	const [isPlaying, setIsPlaying] = useState<boolean>(false);

	const audioRef = useRef<HTMLAudioElement | null>(null);
	const recorderControls = useAudioRecorder();
	const {
		startRecording,
		stopRecording,
		recordingBlob,
		isRecording,
		mediaRecorder,
	} = recorderControls;

	useEffect(() => {
		if (recordingBlob) {
			const url = URL.createObjectURL(recordingBlob);
			setAudioUrl(url);
			if (audioRef.current) {
				audioRef.current.src = url;
			}
			setRecorderStatus("recorded");
		}
	}, [recordingBlob]);

	/** 준비·마무리 타이머. 화면을 떠나면 걷어 낸다 */
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => {
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, []);

	/**
	 * 마이크가 열리는지 먼저 확인한다.
	 *
	 * 라이브러리의 startRecording 은 실패해도 조용하다 — 그래서 권한을 안 준
	 * 학생에게도 "녹음 중"이라고 말하고 있었다. 말하고, 완료를 누르고, 아무것도
	 * 담기지 않은 것을 나중에 알게 된다.
	 */
	const micReady = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			// 확인만 하고 놓아 준다. 실제 녹음은 라이브러리가 다시 연다
			for (const track of stream.getTracks()) track.stop();
			return true;
		} catch {
			return false;
		}
	};

	const handlePrimaryAction = async () => {
		if (recorderStatus === "idle") {
			// 마이크를 묻는 동안에도 준비 중을 보여 준다. 권한 창이 떠 있으면
			// 그 사이가 길어질 수 있는데, 비워 두면 누른 것이 먹었는지 알 수 없다
			setRecorderStatus("preparing");
			if (!(await micReady())) {
				setRecorderStatus("idle");
				setMicBlocked(true);
				return;
			}
			startRecording();
			timerRef.current = setTimeout(
				() => setRecorderStatus("recording"),
				PREPARE_MS,
			);
		} else if (recorderStatus === "recording") {
			setRecorderStatus("finishing");
			timerRef.current = setTimeout(() => stopRecording(), TAIL_MS);
		} else if (recorderStatus === "recorded") {
			handleUpload();
		}
	};

	const handleCancelOrDelete = () => {
		if (timerRef.current) clearTimeout(timerRef.current);
		if (isRecording) stopRecording();

		setIsPlaying(false);
		setRecorderStatus("idle");
		if (audioRef.current) audioRef.current.src = "";
	};

	const togglePlaying = () => {
		if (audioRef.current) {
			isPlaying ? audioRef.current.pause() : audioRef.current.play();
		}
	};

	const handleUpload = async () => {
		if (recordingBlob) {
			setRecorderStatus("uploading");
			try {
				const resultMsg = await postSpeaking(recordingBlob);

				console.log("resultMsg=>", resultMsg);
				props.setResult(true, resultMsg ?? "", audioUrl ?? "");
			} catch (error) {
				console.error("API 호출 중 오류 발생:", error);
				addToast("분석에 실패했습니다. 다시시도해 주세요");
			} finally {
				handleCancelOrDelete();
			}
		}
	};

	// 재생 시간과 전체 길이를 추적하기 위한 상태 추가
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);

	// 오디오 시간 업데이트 핸들러
	const handleTimeUpdate = () => {
		if (audioRef.current) {
			setCurrentTime(audioRef.current.currentTime);
		}
	};

	// 오디오 메타데이터 로드 핸들러 (전체 길이 파악)
	const handleLoadedMetadata = () => {
		if (audioRef.current) {
			setDuration(audioRef.current.duration);
		}
	};

	if (props.dock) {
		// recorded 는 목업의 done 과 자리는 같지만 하는 일이 다르다 —
		// 다시 녹음이 아니라 발음을 확인하러 보낸다. 그래서 글을 갈아 끼운다.
		// recorded 는 목업의 done 과 자리는 같지만 하는 일이 다르다 —
		// 다시 녹음이 아니라 발음을 확인하러 보낸다. 그래서 글을 갈아 끼운다.
		const mode: RecordMode =
			recorderStatus === "uploading"
				? "sending"
				: recorderStatus === "recorded"
					? "done"
					: recorderStatus;
		return (
			<>
				{micBlocked && (
					<MicBlockedDialog
						onRetry={() => {
							setMicBlocked(false);
							// 설정에서 켜고 돌아온 길 — 있던 자리 그대로 다시 시작한다
							void handlePrimaryAction();
						}}
						onSkip={() => {
							setMicBlocked(false);
							props.onSkipActivity?.();
						}}
					/>
				)}
				<RecordControl
					mode={mode}
					action="srec"
					doneHint={t("activity.recordCheckSub")}
					onPress={props.disabled ? undefined : handlePrimaryAction}
				/>
				{/* biome-ignore lint/a11y/useMediaCaption: 재생 전용 숨은 오디오 */}
				<audio ref={audioRef} className="hidden" />
			</>
		);
	}

	return (
		<div className="flex flex-col items-center pt-[10px]">
			<div className="flex items-center justify-between pr-[8px] pl-[12px] ">
				<div className="flex size-[50px] items-center">
					{recorderStatus === "recorded" && (
						<button
							type="button"
							onClick={handleCancelOrDelete}
							className={clsx(baseButtonClasses, "!bg-[#FFE8E8] size-[44px]")}
						>
							<Trash2 size={20} color={"#F15F49"} />
						</button>
					)}
				</div>

				<div className="relative size-[70px]">
					<div className="">
						<CircularProgress
							sqSize={66}
							isStart={
								recorderStatus === "recording" || recorderStatus === "finishing"
							}
						/>
					</div>
					<button
						type="button"
						onClick={handlePrimaryAction}
						disabled={
							props.disabled ||
							recorderStatus === "preparing" ||
							recorderStatus === "finishing" ||
							recorderStatus === "uploading"
						}
						className={clsx(
							baseButtonClasses,
							"absolute top-[3px] left-[3px] z-10 h-[60px] w-[60px]", // 48px 크기 적용
						)}
						aria-label="Primary action"
					>
						{recorderStatus === "idle" && <MicIcon color={"#fff"} />}
						{(recorderStatus === "recording" ||
							recorderStatus === "finishing") && (
							<div className="size-[16px] rounded-[3px] bg-[#fff]" />
						)}
						{recorderStatus === "preparing" && (
							<div className="h-6 w-6 animate-spin rounded-full border-[#fff] border-b-2" />
						)}
						{recorderStatus === "recorded" && <Upload size={24} />}
						{recorderStatus === "uploading" && (
							<div className="h-6 w-6 animate-spin rounded-full border-[#fff] border-b-2" />
						)}
					</button>
				</div>

				<div className="flex w-[50px] items-center gap-[10px]">
					{/** dummy */}
				</div>
			</div>

			{/* 숨겨진 audio 요소 */}
			{/* biome-ignore lint/a11y/useMediaCaption: 재생 전용 숨은 오디오 */}
			<audio
				ref={audioRef}
				onPlay={() => setIsPlaying(true)}
				onPause={() => setIsPlaying(false)}
				onEnded={() => setIsPlaying(false)}
				onTimeUpdate={handleTimeUpdate} // 시간 업데이트 감지
				onLoadedMetadata={handleLoadedMetadata} // 전체 길이 감지
				className="hidden"
			/>
		</div>
	);
};

export default AudioRecorder;
