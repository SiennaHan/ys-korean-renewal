import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { IconVolume } from "./icons";
import { ListenControl, RecordControl, type RecordMode } from "./record";
import {
	ActivityAppBar,
	ActivityFooter,
	ActivityFrame,
	ActivityProgress,
} from "./shell";

export interface RoleTurn {
	/** 화면에 그대로 나오는 이름 — "나" 또는 상대 */
	who: string;
	mine: boolean;
	ko: string;
	en: string;
}

function diffChars(
	expected: string,
	actual: string,
): { char: string; correct: boolean }[] {
	return Array.from(actual, (char, i) => ({
		char,
		correct: i < expected.length && char === expected[i],
	}));
}

/**
 * 롤플레잉의 녹음 분석 결과. 목표 문장은 바로 위 대본 줄에 있으므로 반복하지
 * 않고, STT가 들은 문장과 그다음에 할 수 있는 행동만 한 카드로 묶는다.
 */
export function RoleplayRecordResult({
	expected,
	recognized,
	matched,
	onReplay,
	onRetry,
	onContinue,
	canChooseNext = false,
}: {
	expected: string;
	recognized: unknown;
	matched: boolean;
	onReplay?: () => void;
	onRetry?: () => void;
	onContinue?: () => void;
	canChooseNext?: boolean;
}) {
	const { t } = useTranslation();
	const safeRecognized =
		typeof recognized === "string" ? recognized.trim() : "";
	const charDiff = diffChars(expected, safeRecognized);

	return (
		<div className="record-card">
			<div className="record-result-head">
				<span className="record-result-label">
					{t("activity.roleRecognized")}
				</span>
				<span className={`record-verdict ${matched ? "match" : "different"}`}>
					{t(matched ? "activity.roleMatched" : "activity.roleDifferent")}
				</span>
			</div>
			<div className="heard">
				{safeRecognized
					? charDiff.map((item, i) => (
							<span
								// biome-ignore lint/suspicious/noArrayIndexKey: 글자의 위치가 비교 결과의 정체성이다
								key={i}
								className={matched || item.correct ? "" : "miss"}
							>
								{item.char}
							</span>
						))
					: t("activity.roleNotRecognized")}
			</div>
			<p className="record-result-help">
				{t(matched ? "activity.roleMatchedHelp" : "activity.roleDifferentHelp")}
			</p>
			<div className="record-result-actions">
				<button type="button" className="record-replay" onClick={onReplay}>
					<IconVolume />
					{t("activity.roleReplayMine")}
				</button>
				{canChooseNext && (
					<>
						<button type="button" className="record-retry" onClick={onRetry}>
							{t("activity.roleRetry")}
						</button>
						<button
							type="button"
							className="record-continue"
							onClick={onContinue}
						>
							{t("activity.roleNextTurn")}
						</button>
					</>
				)}
			</div>
		</div>
	);
}

/**
 * 확정 롤플레잉 화면의 공통 골격.
 *
 * 실제 라우트는 TTS·발음 판정·녹음처럼 상태가 많고, 확인용 RoleplayScreen은
 * 정적 상태만 받는다. 둘이 대본 행까지 억지로 공유하면 실제 기능이 약해지므로
 * 셸·시나리오 진행·순서 선택·대본 컨테이너·도크 자리까지만 공유한다.
 */
export function RoleplayLayout({
	lesson,
	direction,
	currentScenario = 0,
	totalScenarios = 1,
	onExit,
	onSkip,
	onScenarioJump,
	onDirection,
	children,
	footer,
}: {
	lesson: string;
	direction: "ai" | "me";
	currentScenario?: number;
	totalScenarios?: number;
	onExit?: () => void;
	onSkip?: () => void;
	onScenarioJump?: (index: number) => void;
	onDirection?: (direction: "ai" | "me") => void;
	children: ReactNode;
	footer: ReactNode;
}) {
	const { t } = useTranslation();
	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={onExit} onSkip={onSkip} />
			<ActivityProgress
				current={currentScenario}
				total={totalScenarios}
				onJump={onScenarioJump}
			/>
			<section className="role-intro">
				<div className="role-title">{t("activity.roleIntro")}</div>
			</section>
			<div className="turns">
				<div className="script-toolbar">
					<span>{t("activity.rolePracticeOrder")}</span>
					<div
						className="role-order"
						// biome-ignore lint/a11y/useSemanticElements: fieldset 기본 스타일 없이 같은 group 의미를 준다
						role="group"
						aria-label={t("activity.rolePracticeOrder")}
					>
						<button
							type="button"
							className={direction === "ai" ? "on" : ""}
							aria-pressed={direction === "ai"}
							onClick={() => onDirection?.("ai")}
						>
							{t("activity.roleAiFirst")}
						</button>
						<button
							type="button"
							className={direction === "me" ? "on" : ""}
							aria-pressed={direction === "me"}
							onClick={() => onDirection?.("me")}
						>
							{t("activity.roleMeFirst")}
						</button>
					</div>
				</div>
				{children}
			</div>
			{footer}
		</ActivityFrame>
	);
}

/**
 * 롤플레잉.
 *
 * 대본이 통째로 보이고 그 위를 차례가 지나간다 — 대화(chat)와 달리 할 말이
 * 정해져 있어 앞뒤를 다 볼 수 있고, 아무 줄이나 눌러 되돌아갈 수 있다.
 * 그래서 실이 자라는 대신 목록이 서 있다.
 */
export function RoleplayScreen({
	lesson,
	turns,
	current,
	/** ai → 나 로 연습할지, 나 → ai 로 할지 */
	direction,
	recordMode,
	/** 녹음을 마친 뒤 지금 줄 아래 붙는 확인 카드 */
	heard,
	heardMatched = false,
	onExit,
	onSkip,
	onJump,
	/** 진행바 칸을 눌러 그 시나리오로 — 제품(ai-roleplay)은 넘기는데 여기만 빠져 있었다 */
	onScenarioJump,
	onDirection,
	onRecord,
	onReplay,
	onRetry,
	onNext,
}: {
	lesson: string;
	turns: RoleTurn[];
	current: number;
	direction: "ai" | "me";
	recordMode: RecordMode;
	heard?: string;
	heardMatched?: boolean;
	onExit?: () => void;
	onSkip?: () => void;
	onJump?: (index: number) => void;
	onScenarioJump?: (index: number) => void;
	onDirection?: (direction: "ai" | "me") => void;
	onRecord?: () => void;
	onReplay?: () => void;
	onRetry?: () => void;
	onNext?: () => void;
}) {
	const { t } = useTranslation();
	const turn = turns[current];
	const mine = turn?.mine ?? false;
	const choosingAfterResult = Boolean(mine && heard && !heardMatched);

	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={onExit} onSkip={onSkip} />
			<ActivityProgress current={0} total={2} onJump={onScenarioJump} />

			<section className="role-intro">
				<div className="role-title">{t("activity.roleIntro")}</div>
			</section>

			<div className="turns">
				<div className="script-toolbar">
					<span>{t("activity.rolePracticeOrder")}</span>
					<div
						className="role-order"
						// biome-ignore lint/a11y/useSemanticElements: <fieldset> 의 암묵 role 이 곧 group 이라 보조기술에는 차이가 없다. fieldset 은 기본 테두리·여백을 갖고 온다
						role="group"
						aria-label={t("activity.rolePracticeOrder")}
					>
						<button
							type="button"
							className={direction === "ai" ? "on" : ""}
							data-action="roleAi"
							aria-pressed={direction === "ai"}
							onClick={() => onDirection?.("ai")}
						>
							{t("activity.roleAiFirst")}
						</button>
						<button
							type="button"
							className={direction === "me" ? "on" : ""}
							data-action="roleMe"
							aria-pressed={direction === "me"}
							onClick={() => onDirection?.("me")}
						>
							{t("activity.roleMeFirst")}
						</button>
					</div>
				</div>

				{turns.map((row, i) => (
					<Fragment key={row.ko}>
						{/* biome-ignore lint/a11y/useKeyWithClickEvents: 줄 전체가 누르는 자리다 */}
						<div
							className={`turn ${i === current ? "current" : i > current ? "future" : ""} ${row.mine ? "me" : "ai"}`}
							data-action="roleJump"
							data-index={i}
							onClick={() => onJump?.(i)}
						>
							<span className="who">{row.who}</span>
							<span className="line">{row.ko}</span>
							{/* 아직 안 지나온 줄은 소리를 미리 들려주지 않는다 */}
							<span className="listen">
								{i <= current ? <IconVolume /> : null}
							</span>
						</div>
						{row.mine && i === current && heard && (
							<RoleplayRecordResult
								expected={row.ko}
								recognized={heard}
								matched={heardMatched}
								onReplay={onReplay}
								onRetry={onRetry ?? onRecord}
								onContinue={onNext}
								canChooseNext={!heardMatched}
							/>
						)}
					</Fragment>
				))}
			</div>

			{!choosingAfterResult && (
				<ActivityFooter>
					<div className="dock">
						<div className="main">
							{mine ? (
								<RecordControl
									mode={recordMode}
									action="roleRecord"
									onPress={onRecord}
								/>
							) : (
								<ListenControl />
							)}
						</div>
					</div>
				</ActivityFooter>
			)}
		</ActivityFrame>
	);
}
