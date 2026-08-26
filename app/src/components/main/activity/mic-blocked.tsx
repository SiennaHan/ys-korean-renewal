import { useTranslation } from "react-i18next";

/**
 * 마이크가 막혔을 때 지금 화면 위에 띄우는 알림.
 *
 * 화면을 통째로 갈아치우지 않는다 — 학생이 있던 자리를 잃지 않아야
 * 설정에서 마이크를 켜고 돌아와 그대로 이어 갈 수 있다.
 * 그래서 "다시 시도"가 이 알림의 핵심이다. 목업의 마이크 거부 화면은
 * 활동에 들어서기 전에 이미 막혀 있던 경우를 위해 그대로 남는다.
 */
export function MicBlockedDialog({
	onRetry,
	onSkip,
}: {
	onRetry: () => void;
	onSkip: () => void;
}) {
	const { t } = useTranslation();
	// 전체 화면 쪽과 같은 문구를 쓴다 — 제목이 무슨 일인지, 설명이 어떻게 하는지.
	// 목업 v2.8 승격으로 둘이 키까지 갈렸다(전에는 한 키를 \n 으로 쪼갰다).
	const rest = t("state.micDeniedBody").split("\n");

	return (
		<div className="modal" role="alertdialog" aria-labelledby="mic-blocked">
			<div className="modal-box notice">
				<div className="notice-icon" aria-hidden="true">
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth={2}
						strokeLinecap="round"
					>
						<rect x="9" y="3" width="6" height="11" rx="3" />
						<path d="M5 11a7 7 0 0014 0M12 18v3" />
						<path d="M4 3l16 18" />
					</svg>
				</div>
				<strong id="mic-blocked">{t("state.micDenied")}</strong>
				{rest.length > 0 && <p>{rest.join(" ")}</p>}
				<div className="modal-tools">
					<button type="button" onClick={onSkip}>
						{t("state.micDeniedSkip")}
					</button>
					<button type="button" className="go" onClick={onRetry}>
						{t("state.retry")}
					</button>
				</div>
			</div>
		</div>
	);
}
