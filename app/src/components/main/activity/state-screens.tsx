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
/**
 * 마이크를 켜는 방법 — **전체 화면 판과 활동 중 모달이 같은 것을 쓴다.**
 *
 * 한 곳에 두는 이유: 두 자리에 각각 적으면 문구를 고칠 때 한쪽만 고쳐진다.
 * 실제로 그런 사고가 있었다(마이크 안내가 화면과 모달에서 갈렸던 v2.8).
 *
 * **브라우저 이름을 적지 않는다.** 「주소창 왼쪽 아이콘(자물쇠 또는 슬라이더)」은
 * Chrome 이 자물쇠를 슬라이더로 바꾼 뒤에도 맞는 말이고, Safari·Firefox 에서도
 * 대체로 맞는다. 스크린샷도 넣지 않았다 — 브라우저가 바뀌면 거짓이 된다.
 *
 * 네 단계를 배열로 돌리지 않고 키 넷으로 적는다 — 이 저장소의 i18n 은
 * `returnObjects` 를 쓰는 자리가 하나도 없고, 여기서 처음 쓰면 다섯 파일에
 * 배열을 넣는 새 규약이 생긴다.
 */
export function MicSteps() {
	const { t } = useTranslation();
	return (
		<details className="state-steps" open>
			<summary>{t("state.micStepsTitle")}</summary>
			<ol>
				<li>{t("state.micStep1")}</li>
				<li>{t("state.micStep2")}</li>
				<li>{t("state.micStep3")}</li>
				<li>{t("state.micStep4")}</li>
			</ol>
		</details>
	);
}

/**
 * 들어설 때 이미 막혀 있는 경우 — **전체 화면**이다(역할극처럼 목소리 없이는
 * 아무것도 못 하는 활동).
 *
 * **키보드 대안을 두지 않는다**(기획 2026-09-10 · `screen_promotions.md`).
 * 이 자리에 올 활동은 말하기가 활동 자체라 글로 대신할 것이 없다. 대신
 * 활동 중에 막힌 경우(미션대화)는 `MicBlockedDialog` 가 셋째 버튼을 준다.
 */
export function MicDeniedScreen({
	lesson,
	onExit,
	onSkipActivity,
	onRetryMic,
}: {
	lesson: string;
	onExit?: () => void;
	onSkipActivity?: () => void;
	/** 「켰어요」 — 권한을 다시 물어본다. 없으면 버튼이 눌려도 조용하다 */
	onRetryMic?: () => void;
}) {
	const { t } = useTranslation();
	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={onExit} />
			<ActivityBody>
				<div className="state-view">
					<span className="state-icon" aria-hidden="true">
						<IconMicOffLarge />
					</span>
					<strong>{t("state.micDenied")}</strong>
					<p>{t("state.micDeniedBody")}</p>
					<MicSteps />
					{/*
					 * 단계를 따라도 안 되는 경우가 있다 — iOS 설정이나 회사 기기
					 * 정책처럼 **브라우저 밖**에서 막는 것이다. 그때 사용자가
					 * 같은 네 단계를 반복하지 않게 미리 말해 준다.
					 */}
					<p className="state-hint">{t("state.micDeniedHint")}</p>
				</div>
			</ActivityBody>
			<ActivityFooter>
				<Dock mainStyle={{ gap: 12 }}>
					{/*
					 * **건너뛰기가 왼쪽, 「켰어요」가 오른쪽이다.** 오른쪽이 주
					 * 행동인 것은 이 도크의 다른 화면과 같은 규칙이고, 목업이
					 * 그 순서로 캡처돼 있다.
					 */}
					<PrimaryButton
						label={t("state.micDeniedSkip")}
						on={false}
						alt
						action="nextExtra"
						onClick={onSkipActivity}
					/>
					<PrimaryButton
						label={t("state.micTurnedOn")}
						on
						action="retryMic"
						onClick={onRetryMic}
					/>
				</Dock>
			</ActivityFooter>
		</ActivityFrame>
	);
}
