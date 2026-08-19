import {
	chatBaseButton,
	chatBaseRedButton,
	chatBaseWhiteButton,
} from "@/components/chat/chat-text";
import CircularProgress from "@/components/ui/circular-progress";
import type { RecordState } from "@/hooks/useRecording";
import { MicIcon } from "@/assets/icons";
import {
	Keyboard,
	Square,
	Trash2,
	Upload,
	X,
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import { LiveAudioVisualizer } from "react-audio-visualize";

interface DialogInputProps {
	// Recording state
	recordState: RecordState;
	recordedMsg: string | null;
	isRecording: boolean;
	mediaRecorder: MediaRecorder | null;

	// Text input
	textareaValue: string;
	setTextareaValue: (value: string) => void;
	isShowInputBox: boolean;
	setIsShowInputBox: (show: boolean) => void;

	// Recording actions
	onRecord: () => void;
	onTerminate: () => void;
	onSendText: () => void;
	onRecordedMsgChange: (value: string) => void;
	stopRecording: () => void;

	// Audio
	unlock: () => void;
}

export function DialogInput({
	recordState,
	recordedMsg,
	isRecording,
	mediaRecorder,
	textareaValue,
	setTextareaValue,
	isShowInputBox,
	setIsShowInputBox,
	onRecord,
	onTerminate,
	onSendText,
	onRecordedMsgChange,
	stopRecording,
	unlock,
}: DialogInputProps) {
	const recordedMsgRef = useRef<HTMLTextAreaElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Auto-resize recorded message textarea
	useEffect(() => {
		if (recordedMsgRef.current && recordedMsg) {
			const textarea = recordedMsgRef.current;
			textarea.style.height = "auto";
			textarea.style.height = `${textarea.scrollHeight}px`;
		}
	}, [recordedMsg]);

	// Auto-resize text input textarea
	useEffect(() => {
		if (textareaRef.current) {
			const textarea = textareaRef.current;
			textarea.style.height = "auto";
			textarea.style.height = `${textarea.scrollHeight}px`;
		}
	}, [textareaValue]);

	// Focus/blur text input
	useEffect(() => {
		if (!textareaRef.current) return;
		if (isShowInputBox) textareaRef.current.focus();
		else textareaRef.current.blur();
	}, [isShowInputBox]);

	return (
		<div className="absolute bottom-0 w-full z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0)0%,#FFF_50%)]">
			{/* Audio visualizer */}
			{mediaRecorder && (
				<div className="h-12 flex justify-center items-center w-full max-w-[300px] mx-auto mb-5 rounded-lg bg-[linear-gradient(98deg,_#E3F9F5_-6.59%,_#DBEDFF_80.75%)]">
					<LiveAudioVisualizer
						mediaRecorder={mediaRecorder}
						width={120}
						height={30}
						barColor="#4396f4"
						barWidth={3}
						gap={2}
					/>
				</div>
			)}

			{/* Recorded message preview */}
			{recordedMsg && (
				<div className="px-[10px] mb-5">
					<textarea
						ref={recordedMsgRef}
						value={recordedMsg}
						rows={1}
						onChange={(e) => onRecordedMsgChange(e.target.value)}
						className="w-full bg-[#DBEDFF] rounded-[5px] px-[10px] py-[10px] text-sm text-[#383A3F] scrollbar-hide"
					/>
				</div>
			)}

			{/* Text input mode */}
			{isShowInputBox ? (
				<div className="flex flex-row gap-1 pl-[3px] pr-2 py-[5px] items-end">
					<button
						type="button"
						onClick={() => setIsShowInputBox(false)}
						className="mb-[5px] cursor-pointer"
					>
						<X strokeWidth={1} color="#4396F4" />
					</button>
					<textarea
						ref={textareaRef}
						value={textareaValue}
						onChange={(e) => setTextareaValue(e.target.value)}
						rows={2}
						placeholder="내용을 입력해주세요"
						className="flex-1 border border-[#4396f4] bg-white rounded-[5px] px-[10px] py-[5px] text-base text-[#4396f4] scrollbar-hide"
					/>
					<button
						type="button"
						className={clsx(
							chatBaseButton,
							"!size-[34px] !rounded-[5px]",
						)}
						onPointerDown={() => unlock()}
						onTouchStart={() => unlock()}
						onClick={onSendText}
						disabled={textareaValue.trim().length < 2}
					>
						<Upload />
					</button>
				</div>
			) : (
				/* Voice recording mode */
				<div className="flex justify-center items-center gap-2 mb-[10px]">
					{recordState === "ready" ? (
						<button
							type="button"
							className={chatBaseWhiteButton}
							onClick={() => {
								unlock();
								setIsShowInputBox(true);
							}}
						>
							<Keyboard color="#4396F4" />
						</button>
					) : (
						<button
							type="button"
							className={chatBaseRedButton}
							onClick={onTerminate}
							disabled={recordState === "uploading"}
						>
							<Trash2 color="#F15F49" size={20} />
						</button>
					)}

					<div className="relative">
						<CircularProgress
							sqSize={66}
							isStart={isRecording}
							onEnd={stopRecording}
						/>
						<button
							type="button"
							className={clsx(
								chatBaseButton,
								"z-10 absolute top-[3px] left-[3px]",
							)}
							onClick={onRecord}
							disabled={
								recordState === "converting" ||
								recordState === "uploading"
							}
						>
							{recordState === "ready" && (
								<MicIcon color="#fff" />
							)}
							{recordState === "recording" && (
								<Square fill="#fff" strokeWidth={0} />
							)}
							{recordState === "recorded" && <Upload />}
							{(recordState === "converting" ||
								recordState === "uploading") && (
								<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
							)}
						</button>
					</div>
					<div className="size-[44px]" />
				</div>
			)}
		</div>
	);
}
