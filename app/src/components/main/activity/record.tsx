import { useTranslation } from "react-i18next";
import { IconCheck, IconMic, IconStop, IconVolume } from "./icons";

/**
 * 녹음 버튼의 모습. 한 버튼을 눌러 idle → recording → done 으로 돈다.
 *
 * sending 은 목업에 없다. 목업은 녹음이 끝나면 바로 판정이 나오는 것으로 그렸는데
 * 실제로는 서버가 발음을 들어 보는 사이가 있고, 그동안 버튼을 눌러도 아무 일이
 * 없으면 학생이 다시 누르게 된다.
 */
export type RecordMode = "idle" | "recording" | "done" | "sending";

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
	const title =
		mode === "recording"
			? t("activity.recordingTitle")
			: mode === "sending"
				? t("activity.sendingTitle")
				: mode === "done"
					? t("activity.recordDoneTitle")
					: t("player.recordHint");
	const sub =
		mode === "recording"
			? t("activity.recordingSub")
			: mode === "sending"
				? t("activity.sendingSub")
				: mode === "done"
					? (doneHint ?? t("activity.recordDoneSub"))
					: t("activity.recordIdleSub");
	return (
		<div className="record-core">
			<button
				type="button"
				className={`record-button ${mode}`}
				data-action={action}
				aria-label={title}
				disabled={mode === "sending"}
				onClick={onPress}
			>
				{mode === "recording" ? (
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
				{mode === "recording" && <Wave />}
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
