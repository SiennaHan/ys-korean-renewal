import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { IconMicOffLarge, IconRetryLarge } from "./icons";
import {
	ActivityAppBar,
	ActivityBody,
	ActivityFooter,
	ActivityFrame,
	ActivityProgress,
	Dock,
	PrimaryButton,
} from "./shell";

/**
 * 활동이 정상으로 흐르지 않을 때의 세 화면.
 *
 * 셋 다 골격을 그대로 쓰고 본문만 바꾼다 — 상단 바와 하단 버튼이 그대로 있어야
 * 학생이 갇히지 않는다. 그래서 별도 레이아웃을 만들지 않았다.
 * 셋 다 건너뛰기가 없으므로 상단 오른쪽은 빈 칸이다.
 */

/** 문항을 기다리는 중. 진행 막대는 남겨 둔다 — 몇 번째인지가 사라지면 불안하다 */
export function LoadingScreen({
	lesson,
	current,
	total,
	onExit,
}: {
	lesson: string;
	current: number;
	total: number;
	onExit?: () => void;
}) {
	const { t } = useTranslation();
	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={onExit} />
			<ActivityProgress current={current} total={total} />
			<ActivityBody>
				<div className="skeleton">
					<i className="s" />
					<i />
					<i />
					<i />
				</div>
			</ActivityBody>
			<ActivityFooter>
				<Dock>
					<PrimaryButton label={t("player.next")} on={false} />
				</Dock>
			</ActivityFooter>
		</ActivityFrame>
	);
}

/** 불러오기 실패. 진행 막대가 없다 — 몇 문항인지를 아직 모른다 */
export function FailedScreen({
	lesson,
	onExit,
	onRetry,
}: {
	lesson: string;
	onExit?: () => void;
	onRetry?: () => void;
}) {
	const { t } = useTranslation();
	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={onExit} />
			<ActivityBody>
				<div className="state-view">
					<span className="state-icon" aria-hidden="true">
						<IconRetryLarge />
					</span>
					<strong>{t("state.loadFailed")}</strong>
					<p>{t("state.loadFailedBody")}</p>
				</div>
			</ActivityBody>
			<ActivityFooter>
				<Dock>
					<PrimaryButton
						label={t("state.retry")}
						on
						action="retry"
						onClick={onRetry}
					/>
				</Dock>
			</ActivityFooter>
		</ActivityFrame>
	);
}

/**
 * 마이크 거부. 말하기 활동은 여기서 더 갈 수 없으므로
 * 유일한 출구가 "이 활동 건너뛰기"다.
 */
export function MicDeniedScreen({
	lesson,
	onExit,
	onSkipActivity,
}: {
	lesson: string;
	onExit?: () => void;
	onSkipActivity?: () => void;
}) {
	const { t } = useTranslation();
	// 목업은 설명을 <br> 로 끊는다. 어디서 끊을지는 언어마다 다르므로
	// 번역문의 \n 을 그대로 따른다 — 여기서 문장부호로 자르지 않는다
	const lines = t("state.micDeniedBody").split("\n");
	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={onExit} />
			<ActivityBody>
				<div className="state-view">
					<span className="state-icon" aria-hidden="true">
						<IconMicOffLarge />
					</span>
					<strong>{t("state.micDenied")}</strong>
					<p>
						{lines.map((line, i) => (
							<Fragment key={line}>
								{i > 0 && <br />}
								{line}
							</Fragment>
						))}
					</p>
				</div>
			</ActivityBody>
			<ActivityFooter>
				<Dock>
					<PrimaryButton
						label={t("state.micDeniedSkip")}
						on
						action="nextExtra"
						onClick={onSkipActivity}
					/>
				</Dock>
			</ActivityFooter>
		</ActivityFrame>
	);
}
