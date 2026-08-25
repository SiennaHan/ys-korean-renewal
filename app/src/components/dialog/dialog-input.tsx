import {
	IconClose,
	IconKeyboard,
	RecordControl,
} from "@/components/main/activity";
import CircularProgress from "@/components/ui/circular-progress";
import type { RecordState } from "@/hooks/useRecording";
import { Send, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { LiveAudioVisualizer } from "react-audio-visualize";
import { useTranslation } from "react-i18next";

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
	const { t } = useTranslation();
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
		<div className="chat-compose">
			{/* Audio visualizer */}
			{mediaRecorder && (
				<div className="chat-visualizer" aria-label="녹음 중인 소리">
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
				<div className="chat-transcript">
					<textarea
						ref={recordedMsgRef}
						value={recordedMsg}
						rows={1}
						onChange={(e) => onRecordedMsgChange(e.target.value)}
						className="scrollbar-hide"
						aria-label={t("missionChat.transcript")}
					/>
				</div>
			)}

			{/* Text input mode */}
			{isShowInputBox ? (
				<div className="chat-text-entry">
					<button
						type="button"
						onClick={() => setIsShowInputBox(false)}
						className="keyboard"
						aria-label={t("missionChat.closeInput")}
					>
						<IconClose />
					</button>
					<textarea
						ref={textareaRef}
						value={textareaValue}
						onChange={(e) => setTextareaValue(e.target.value)}
						rows={2}
						placeholder={t("missionChat.inputPlaceholder")}
						className="scrollbar-hide chat-textarea"
					/>
					<button
						type="button"
						className="chat-send"
						onPointerDown={() => unlock()}
						onTouchStart={() => unlock()}
						onClick={onSendText}
						disabled={textareaValue.trim().length < 2}
					>
						<Send />
					</button>
				</div>
			) : (
				/* Voice recording mode */
				<div className="chat-footer">
					<div className="dock">
						{recordState === "idle" ? (
							<button
								type="button"
								className="keyboard"
								aria-label={t("missionChat.keyboard")}
								onClick={() => {
									unlock();
									setIsShowInputBox(true);
								}}
							>
								<IconKeyboard />
							</button>
						) : (
							<button
								type="button"
								className="keyboard discard"
								aria-label={t("missionChat.discard")}
								onClick={onTerminate}
								disabled={recordState === "sending"}
							>
								<Trash2 size={20} />
							</button>
						)}

						<div className="main">
							<RecordControl
								mode={recordState}
								action="chatRecord"
								doneHint={t("missionChat.sendRecorded")}
								onPress={onRecord}
							/>
							{/* 30초 자동 종료 규칙은 시각 컴포넌트를 바꿔도 유지한다. */}
							<div className="record-limit" aria-hidden="true">
								<CircularProgress
									sqSize={1}
									isStart={
										recordState === "recording" || recordState === "finishing"
									}
									onEnd={stopRecording}
								/>
							</div>
						</div>
						<span className="slot" aria-hidden="true" />
					</div>
				</div>
			)}
		</div>
	);
}
