import { useTranslation } from "react-i18next";
import { MicSteps } from "./state-screens";

/**
 * 마이크가 막혔을 때 지금 화면 위에 띄우는 알림 — 시각 정본
 * `app/src/screens_ref/activity__micdenied_modal.html` (2026-09-10).
 *
 * 화면을 통째로 갈아치우지 않는다 — 학생이 있던 자리를 잃지 않아야
 * 설정에서 마이크를 켜고 돌아와 그대로 이어 갈 수 있다.
 * 그래서 「켰어요」가 이 알림의 핵심이다. 들어설 때 이미 막혀 있던 경우는
 * 전체 화면 판(`MicDeniedScreen`)이 맡는다.
 *
 * **여기에만 셋째 버튼이 있다 — 「대신 키보드로 쓰기」.** 이 모달이 뜨는 자리는
 * 미션대화이고, 그 활동은 키보드 입력을 이미 갖고 있다(도크의 키보드 토글).
 * 말하기가 활동 자체인 역할극에는 대신할 것이 없어 전체 화면 판에는 두지 않았다
 * (기획 2026-09-10).
 */
export function MicBlockedDialog({
	onRetry,
	onSkip,
	onTypeInstead,
}: {
	onRetry: () => void;
	onSkip: () => void;
	/**
	 * 키보드 입력으로 갈아탄다. **넘기지 않으면 그 버튼을 그리지 않는다** —
	 * 키보드가 없는 활동에서 눌러도 아무 일이 없는 버튼을 두지 않는다.
	 */
	onTypeInstead?: () => void;
}) {
	const { t } = useTranslation();

	return (
		<div className="modal" role="alertdialog" aria-labelledby="mic-blocked">
			<div className="modal-box notice">
				<div className="notice-icon" aria-hidden="true">
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth={1.9}
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<rect x="9" y="3" width="6" height="11" rx="3" />
						<path d="M5 11a7 7 0 0011.8 5.1M12 18v3M4 3l16 18" />
					</svg>
				</div>
				<strong id="mic-blocked">{t("state.micDenied")}</strong>
				<p>{t("state.micDeniedBody")}</p>
				<MicSteps />
				{/*
				 * 버튼을 세로로 쌓는다(`.stack`). 셋을 한 줄에 넣으면 글자가
				 * 긴 언어에서 줄바꿈이 생겨 높이가 언어마다 달라진다 —
				 * 「대신 키보드로 쓰기」가 특히 길다.
				 */}
				<div className="modal-tools stack">
					<button
						type="button"
						className="go"
						data-action="retryMic"
						onClick={onRetry}
					>
						{t("state.micTurnedOn")}
					</button>
					{onTypeInstead && (
						<button
							type="button"
							className="alt"
							data-action="typeInstead"
							onClick={onTypeInstead}
						>
							{t("state.micTypeInstead")}
						</button>
					)}
					<button
						type="button"
						className="ghost"
						data-action="nextExtra"
						onClick={onSkip}
					>
						{t("state.micDeniedSkip")}
					</button>
				</div>
			</div>
		</div>
	);
}
