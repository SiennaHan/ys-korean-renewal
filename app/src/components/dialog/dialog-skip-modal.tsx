import { useTranslation } from "react-i18next";

interface DialogSkipModalProps {
	onClose: () => void;
	onConfirm: () => void;
	variant?: "finish" | "exit";
}

export function DialogSkipModal({
	onClose,
	onConfirm,
	variant = "finish",
}: DialogSkipModalProps) {
	const { t } = useTranslation();
	const isExit = variant === "exit";
	return (
		<div className="activity-confirm-backdrop" role="presentation">
			{/* biome-ignore lint/a11y/useSemanticElements: ActivityFrame 안에 붙는 조건부 시트라 native dialog.showModal 수명주기를 따로 만들지 않는다 */}
			<div className="activity-confirm" role="dialog" aria-modal="true">
				<h2>
					{isExit ? t("missionChat.exitTitle") : t("missionChat.finishTitle")}
				</h2>
				<p>
					{isExit ? t("missionChat.exitBody") : t("missionChat.finishBody")}
				</p>
				<div className="activity-confirm-actions">
					<button type="button" onClick={onClose} className="secondary">
						{t("missionChat.continue")}
					</button>
					<button type="button" onClick={onConfirm} className="confirm">
						{isExit ? t("missionChat.exit") : t("missionChat.viewReport")}
					</button>
				</div>
			</div>
		</div>
	);
}
