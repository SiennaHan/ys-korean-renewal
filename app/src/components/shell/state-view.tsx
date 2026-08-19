import { useTranslation } from "react-i18next";

/**
 * 예외 상태 — 구현 사양 §9
 *
 * 문항이 0개인 활동은 목록에서 진입을 막는다. 셸의 상태가 아니다.
 */
export type ShellState =
	| "loading" // 문항 목록 대기 — 밴드에 스켈레톤
	| "loadFailed" // API 오류·타임아웃. 진도를 건드리지 않는다
	| "audioPreparing" // TTS 미생성. 문항 자체는 풀 수 있다
	| "micDenied" // 롤플레잉·미션 대화 진입. 미션 대화는 키보드로 계속 가능
	| "exitConfirmChat"; // 미션 대화에서만. 재개 지점이 없어 처음부터 시작된다

export interface StateViewProps {
	state: ShellState;
	onRetry?: () => void;
	onSkipActivity?: () => void;
	onConfirmExit?: () => void;
	onCancelExit?: () => void;
}

export function StateView({
	state,
	onRetry,
	onSkipActivity,
	onConfirmExit,
	onCancelExit,
}: StateViewProps) {
	const { t } = useTranslation();

	if (state === "loading") {
		return (
			<div className="flex flex-col gap-[10px]" aria-busy="true">
				<div className="h-6 w-2/3 animate-pulse rounded-lg bg-fill-track" />
				{[0, 1, 2].map((i) => (
					<div
						key={i}
						className="min-h-[68px] animate-pulse rounded-[14px] bg-fill-track"
					/>
				))}
				<span className="sr-only">{t("state.loading")}</span>
			</div>
		);
	}

	if (state === "exitConfirmChat") {
		// Dim + 하단 시트, 버튼 2개
		return (
			<div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50">
				<div className="rounded-t-2xl bg-background-surface p-5">
					<p className="text-base text-text-strong">
						{t("state.exitConfirmChat")}
					</p>
					<div className="mt-4 flex gap-2">
						<button
							type="button"
							onClick={onCancelExit}
							className="h-14 flex-1 rounded-xl border border-line-normal text-text-strong"
						>
							{t("player.cancel")}
						</button>
						<button
							type="button"
							onClick={onConfirmExit}
							className="h-14 flex-1 rounded-xl bg-fill-primary text-text-inverse"
						>
							{t("player.exit")}
						</button>
					</div>
				</div>
			</div>
		);
	}

	const COPY: Record<
		Exclude<ShellState, "loading" | "exitConfirmChat">,
		{ text: string; action?: { label: string; onClick?: () => void } }
	> = {
		loadFailed: {
			text: t("state.loadFailed"),
			action: { label: t("state.retry"), onClick: onRetry },
		},
		audioPreparing: { text: t("state.audioPreparing") },
		micDenied: {
			text: t("state.micDenied"),
			action: { label: t("state.micDeniedSkip"), onClick: onSkipActivity },
		},
	};

	const { text, action } = COPY[state];

	return (
		<div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
			<p className="text-base text-text-sub">{text}</p>
			{action && (
				<button
					type="button"
					onClick={action.onClick}
					className="h-14 w-full max-w-[358px] rounded-xl bg-fill-primary text-text-inverse"
				>
					{action.label}
				</button>
			)}
		</div>
	);
}
