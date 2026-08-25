import { MicIcon } from "@/assets/icons";
import {
	chatBaseButton,
	chatBaseRedButton,
	chatBaseWhiteButton,
} from "@/components/chat/chat-text";
import CircularProgress from "@/components/ui/circular-progress";
import type { RecordState } from "@/hooks/useRecording";
import clsx from "clsx";
import { Keyboard, Square, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { LiveAudioVisualizer } from "react-audio-visualize";

interface DialogInputProps {
	// Recording state
	recordState: RecordState;
	recordedMsg: string | null;
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
	// textareaValue 는 재실행 방아쇠다. 몸통은 ref 만 읽지만 지우면
	// **글을 쳐도 칸이 늘어나지 않는다** — 이 효과의 존재 이유가 사라진다.
	// biome-ignore lint/correctness/useExhaustiveDependencies: 값이 바뀔 때 높이를 다시 재려고 넣은 방아쇠다
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
		<div className="absolute bottom-0 z-10 w-full bg-[linear-gradient(180deg,rgba(255,255,255,0)0%,#FFF_50%)]">
			{/* Audio visualizer */}
			{mediaRecorder && (
				<div className="mx-auto mb-5 flex h-12 w-full max-w-[300px] items-center justify-center rounded-lg bg-[linear-gradient(98deg,_#E3F9F5_-6.59%,_#DBEDFF_80.75%)]">
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
				<div className="mb-5 px-[10px]">
					<textarea
						ref={recordedMsgRef}
						value={recordedMsg}
						rows={1}
						onChange={(e) => onRecordedMsgChange(e.target.value)}
						className="scrollbar-hide w-full rounded-[5px] bg-[#DBEDFF] px-[10px] py-[10px] text-[#383A3F] text-sm"
					/>
				</div>
			)}

			{/* Text input mode */}
			{isShowInputBox ? (
				<div className="flex flex-row items-end gap-1 py-[5px] pr-2 pl-[3px]">
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
						className="scrollbar-hide flex-1 rounded-[5px] border border-[#4396f4] bg-white px-[10px] py-[5px] text-[#4396f4] text-base"
					/>
					<button
						type="button"
						className={clsx(chatBaseButton, "!size-[34px] !rounded-[5px]")}
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
				<div className="mb-[10px] flex items-center justify-center gap-2">
					{recordState === "idle" ? (
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
							disabled={recordState === "sending"}
						>
							<Trash2 color="#F15F49" size={20} />
						</button>
					)}

					<div className="relative">
						<CircularProgress
							sqSize={66}
							isStart={
								recordState === "recording" || recordState === "finishing"
							}
							onEnd={stopRecording}
						/>
						<button
							type="button"
							className={clsx(
								chatBaseButton,
								"absolute top-[3px] left-[3px] z-10",
							)}
							onClick={onRecord}
							disabled={
								recordState === "preparing" ||
								recordState === "finishing" ||
								recordState === "sending"
							}
						>
							{recordState === "idle" && <MicIcon color="#fff" />}
							{(recordState === "recording" || recordState === "finishing") && (
								<Square fill="#fff" strokeWidth={0} />
							)}
							{recordState === "done" && <Upload />}
							{(recordState === "preparing" || recordState === "sending") && (
								<div className="h-6 w-6 animate-spin rounded-full border-white border-b-2" />
							)}
						</button>
					</div>
					<div className="size-[44px]" />
				</div>
			)}
		</div>
	);
}
