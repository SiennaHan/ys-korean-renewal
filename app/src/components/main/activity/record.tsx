import { useTranslation } from "react-i18next";
import { IconCheck, IconMic, IconStop, IconVolume } from "./icons";

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
				className={`record-button ${mode}`}
				data-action={action}
				aria-label={title}
				disabled={
					mode === "preparing" || mode === "finishing" || mode === "sending"
				}
				onClick={onPress}
			>
				{mode === "recording" || mode === "finishing" ? (
					<IconStop />
				) : mode === "done" || mode === "sending" ? (
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
export function ListenControl({ onPlay }: { onPlay?: () => void }) {
	const { t } = useTranslation();
	return (
		<div className="record-core">
			<button
				type="button"
				className="record-button listen"
				data-action="audio"
				aria-label={t("activity.aiListenTitle")}
				onClick={onPlay}
			>
				<IconVolume />
			</button>
			<span className="record-copy">
				<b>{t("activity.aiListenTitle")}</b>
				<span>{t("activity.aiListenSub")}</span>
			</span>
		</div>
	);
}
