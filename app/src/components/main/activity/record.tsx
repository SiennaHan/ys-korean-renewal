import { useTranslation } from "react-i18next";
import { IconCheck, IconMic, IconSpinner, IconStop, IconVolume } from "./icons";

/** 누른 뒤 말하기 시작 시점을 분명히 알리는 준비 구간 */
export const RECORD_PREPARE_MS = 2000;
/** 정지를 누른 뒤 문장 끝을 보존하는 꼬리 녹음 구간 */
export const RECORD_TAIL_MS = 1000;

/**
 * 녹음 버튼의 모습. 한 버튼을 눌러 idle → recording → done 으로 돈다.
 *
 * 목업에 없는 세 가지가 있다. 목업은 누르는 순간과 결과 사이를 그리지 않았는데,
 * 실제로는 그 사이마다 기다리는 시간이 있고 비워 두면 학생이 버튼을 또 누른다.
 *  · preparing — 마이크가 자리를 잡을 때까지. 이때 말하면 첫 음절이 잘린다
 *  · finishing — 다 눌렀지만 끝말을 담는 동안
 *  · sending   — 서버가 발음을 들어 보는 동안
 */
export type RecordMode =
	| "idle"
	| "preparing"
	| "recording"
	| "finishing"
	| "done"
	| "sending";

function Wave() {
	return (
		<span className="record-wave" aria-hidden="true">
			{Array.from({ length: 12 }, (_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: 칸은 위치가 곧 정체성이다
				<i key={i} />
			))}
		</span>
	);
}

/**
 * 도크 가운데에 앉는 녹음 조작.
 *
 * 버튼 하나가 상태를 다 진다 — 시작·정지 버튼을 따로 두지 않는다.
 * 옆 글자가 지금 무엇을 하면 되는지를 말해 주므로 아이콘만으로 짐작하지 않아도 된다.
 */
export function RecordControl({
	mode,
	action,
	onPress,
	doneHint,
	disabled = false,
}: {
	mode: RecordMode;
	/** 목업이 화면마다 다르게 붙여 둔 값 (srec · chatRecord · roleRecord) */
	action: string;
	onPress?: () => void;
	/**
	 * 녹음을 마친 뒤 그 버튼이 무엇을 하는지. 목업은 다시 녹음이지만
	 * 화면에 따라 확인을 보내는 자리이기도 하다 — 하는 일과 글이 어긋나면 안 된다.
	 */
	doneHint?: string;
	/** 화면 흐름상 아직 녹음을 받을 수 없는 상태. 내부 대기 상태와 구분한다. */
	disabled?: boolean;
}) {
	const { t } = useTranslation();
	const COPY: Record<RecordMode, [string, string]> = {
		idle: ["player.recordHint", "activity.recordIdleSub"],
		preparing: ["activity.preparingTitle", "activity.preparingSub"],
		recording: ["activity.recordingTitle", "activity.recordingSub"],
		finishing: ["activity.finishingTitle", "activity.finishingSub"],
		done: ["activity.recordDoneTitle", "activity.recordDoneSub"],
		sending: ["activity.sendingTitle", "activity.sendingSub"],
	};
	const [titleKey, subKey] = COPY[mode];
	const title = t(titleKey);
	const sub = mode === "done" ? (doneHint ?? t(subKey)) : t(subKey);
	return (
		<div className="record-core">
			<button
				type="button"
				className={`record-button ${mode}${disabled ? " is-disabled" : ""}`}
				data-action={action}
				aria-label={title}
				disabled={
					disabled ||
					mode === "preparing" ||
					mode === "finishing" ||
					mode === "sending"
				}
				onClick={onPress}
			>
				{mode === "preparing" || mode === "sending" ? (
					<IconSpinner />
				) : mode === "recording" || mode === "finishing" ? (
					<IconStop />
				) : mode === "done" ? (
					<IconCheck />
				) : (
					<IconMic />
				)}
			</button>
			<span className="record-copy">
				<b>{title}</b>
				<span>{sub}</span>
				{(mode === "recording" || mode === "finishing") && <Wave />}
			</span>
		</div>
	);
}

/**
 * 같은 자리에 앉지만 내 차례가 아닐 때 — 롤플레잉에서 AI 가 말할 차례다.
 * 녹음 버튼과 자리를 나눠 쓰므로 도크가 흔들리지 않는다.
 */
export function ListenControl({
	onPlay,
	mode = "ready",
}: {
	onPlay?: () => void;
	mode?: "ready" | "playing";
}) {
	const { t } = useTranslation();
	const playing = mode === "playing";
	const title = t(
		playing ? "activity.aiSpeakingTitle" : "activity.aiListenTitle",
	);
	const sub = t(playing ? "activity.aiSpeakingSub" : "activity.aiListenSub");
	return (
		<div className="record-core">
			<button
				type="button"
				className={`record-button listen ${mode}`}
				data-action="audio"
				aria-label={title}
				aria-busy={playing}
				disabled={playing}
				onClick={onPlay}
			>
				<IconVolume />
			</button>
			<span className="record-copy">
				<b>{title}</b>
				<span>{sub}</span>
				{playing && <Wave />}
			</span>
		</div>
	);
}
