import { useTranslation } from "react-i18next";
import { IconCheck, IconMic, IconStop, IconVolume } from "./icons";

/** 녹음 버튼의 세 모습. 한 버튼을 눌러 idle → recording → done 으로 돈다 */
export type RecordMode = "idle" | "recording" | "done";

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
}: {
	mode: RecordMode;
	/** 목업이 화면마다 다르게 붙여 둔 값 (srec · chatRecord · roleRecord) */
	action: string;
	onPress?: () => void;
}) {
	const { t } = useTranslation();
	const title =
		mode === "recording"
			? t("activity.recordingTitle")
			: mode === "done"
				? t("activity.recordDoneTitle")
				: t("player.recordHint");
	const sub =
		mode === "recording"
			? t("activity.recordingSub")
			: mode === "done"
				? t("activity.recordDoneSub")
				: t("activity.recordIdleSub");
	return (
		<div className="record-core">
			<button
				type="button"
				className={`record-button ${mode}`}
				data-action={action}
				aria-label={title}
				onClick={onPress}
			>
				{mode === "recording" ? (
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
