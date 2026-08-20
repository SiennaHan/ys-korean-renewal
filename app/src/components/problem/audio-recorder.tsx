import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useAudioRecorder } from "react-audio-voice-recorder";

import { postSpeaking } from "@/api/analyzeApi";
import { MicIcon } from "@/assets/icons";
import { RecordControl, type RecordMode } from "@/components/main/activity";
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
}
type RecorderStatus = "idle" | "recording" | "recorded" | "uploading";

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

	const handlePrimaryAction = () => {
		if (recorderStatus === "idle") {
			startRecording();
			setRecorderStatus("recording");
		} else if (recorderStatus === "recording") {
			stopRecording();
		} else if (recorderStatus === "recorded") {
			handleUpload();
		}
	};

	const handleCancelOrDelete = () => {
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
				addToast(`분석에 실패했습니다. 다시시도해 주세요`);
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
		const mode: RecordMode =
			recorderStatus === "recording"
				? "recording"
				: recorderStatus === "uploading"
					? "sending"
					: recorderStatus === "recorded"
						? "done"
						: "idle";
		return (
			<>
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
							isStart={recorderStatus === "recording"}
						/>
					</div>
					<button
						onClick={handlePrimaryAction}
						disabled={props.disabled || recorderStatus === "uploading"}
						className={clsx(
							baseButtonClasses,
							"absolute top-[3px] left-[3px] z-10 h-[60px] w-[60px]", // 48px 크기 적용
						)}
						aria-label="Primary action"
					>
						{recorderStatus === "idle" && <MicIcon color={"#fff"} />}
						{recorderStatus === "recording" && (
							<div className="size-[16px] rounded-[3px] bg-[#fff]" />
						)}
						{recorderStatus === "recorded" && <Upload size={24} />}
						{recorderStatus === "uploading" && (
							<div className="h-6 w-6 animate-spin rounded-full border-[#fff] border-b-2"></div>
						)}
					</button>
				</div>

				<div className="flex w-[50px] items-center gap-[10px]">
					{/** dummy */}
				</div>
			</div>

			{/* 숨겨진 audio 요소 */}
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
