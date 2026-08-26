import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { IconVolume } from "./icons";
import {
	ActivityAppBar,
	ActivityFooter,
	ActivityFrame,
	ActivityProgress,
} from "./shell";

export interface RoleTurn {
	/** 줄을 가리는 키. 같은 문장이 두 번 나올 수 있어 원장 id 를 쓴다 */
	id?: number | string;
	/** 화면에 그대로 나오는 이름 — "나" 또는 상대 */
	who: string;
	mine: boolean;
	ko: string;
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
				{children}
			</div>
			{footer}
		</ActivityFrame>
	);
}

/**
 * 대본 한 줄.
 *
 * 지나온 줄·지금 줄·아직 안 온 줄이 다르게 보이고, 소리 버튼은 **지나온 줄에만**
 * 있다 — 아직 안 나온 문장을 미리 들려주면 연습이 아니게 된다.
 */
function TurnLine({
	turn,
	index,
	state,
	/** 이 줄의 모델 음성이 지금 나오는 중 — 버튼이 아니라 아이콘만 둔다 */
	speaking,
	/** 소리 버튼을 둘지 */
	replayable,
	replayDisabled,
	onJump,
	onReplay,
}: {
	turn: RoleTurn;
	index: number;
	state: "past" | "current" | "future";
	speaking: boolean;
	replayable: boolean;
	replayDisabled: boolean;
	onJump?: (index: number) => void;
	onReplay?: (index: number) => void;
}) {
	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: 줄 전체가 누르는 자리다
		<div
			className={`turn ${state === "current" ? "current" : state === "future" ? "future" : ""} ${turn.mine ? "me" : "ai"}`}
			data-action="roleJump"
			data-index={index}
			onClick={() => onJump?.(index)}
		>
			<span className="who">{turn.who}</span>
			<span className="line">{turn.ko}</span>
			{/* 아직 안 지나온 줄은 소리를 미리 들려주지 않는다 */}
			<span className="listen">
				{speaking ? (
					<IconVolume />
				) : replayable ? (
					<button
						type="button"
						aria-label={turn.who}
						disabled={replayDisabled}
						onClick={() => onReplay?.(index)}
					>
						<IconVolume />
					</button>
				) : null}
			</span>
		</div>
	);
}

/**
 * 롤플레잉.
 *
 * 대본이 통째로 보이고 그 위를 차례가 지나간다 — 대화(chat)와 달리 할 말이
 * 정해져 있어 앞뒤를 다 볼 수 있다. 그래서 실이 자라는 대신 목록이 서 있다.
 *
 * **제품이 그대로 그리는 화면이다**(2026-08-26). 전에는 이 컴포넌트가 대조용
 * 두 번째 판이었고 실제 라우트(`learn/ai-roleplay`)는 `RoleplayLayout` 만
 * 나눠 쓰면서 대본 줄과 도크를 따로 갖고 있었다 — 대조가 보던 대본 줄을
 * 학생은 못 보고 있었다는 뜻이다. 줄과 도크 껍데기까지 여기로 모았다.
 *
 * 도크 **안에 들어가는 조작**만 `control` 로 열어 둔다. 차례가 AI 냐 나냐,
 * 대화가 끝났냐에 따라 듣기·녹음·다음 셋이 오가는데 그 판단은 상태를 쥔
 * 배선의 몫이다. 조작 자체는 셋 다 공용 컴포넌트다.
 */
export function RoleplayScreen({
	lesson,
	turns,
	current,
	/** ai → 나 로 연습할지, 나 → ai 로 할지 */
	direction,
	currentScenario = 0,
	totalScenarios = 1,
	/** 지금 줄의 모델 음성이 나오는 중 */
	speaking = false,
	/** 어느 줄에 소리 버튼을 둘지. 기본은 "지나왔거나 지금인 줄" */
	replayableAt,
	/** 모델 음성이 나오는 동안은 그 재생을 가로채지 않는다 */
	replayDisabled = false,
	/** 녹음을 마친 뒤 그 줄 아래 붙는 확인 카드 */
	result,
	/** 도크 안에 들어가는 조작. null 이면 도크를 아예 안 그린다 */
	control,
	onExit,
	onSkip,
	onJump,
	onScenarioJump,
	onDirection,
	onReplay,
}: {
	lesson: string;
	turns: RoleTurn[];
	current: number;
	direction: "ai" | "me";
	currentScenario?: number;
	totalScenarios?: number;
	speaking?: boolean;
	replayableAt?: (index: number) => boolean;
	replayDisabled?: boolean;
	result?: {
		index: number;
		expected: string;
		recognized: unknown;
		matched: boolean;
		canChooseNext?: boolean;
		onReplay?: () => void;
		onRetry?: () => void;
		onContinue?: () => void;
	};
	control?: ReactNode;
	onExit?: () => void;
	onSkip?: () => void;
	onJump?: (index: number) => void;
	onScenarioJump?: (index: number) => void;
	onDirection?: (direction: "ai" | "me") => void;
	onReplay?: (index: number) => void;
}) {
	return (
		<RoleplayLayout
			lesson={lesson}
			direction={direction}
			currentScenario={currentScenario}
			totalScenarios={totalScenarios}
			onExit={onExit}
			onSkip={onSkip}
			onScenarioJump={onScenarioJump}
			onDirection={onDirection}
			footer={
				control ? (
					<ActivityFooter>
						<div className="dock">
							<div className="main">{control}</div>
						</div>
					</ActivityFooter>
				) : null
			}
		>
			{turns.map((turn, i) => {
				const state =
					i === current ? "current" : i > current ? "future" : "past";
				return (
					<Fragment key={turn.id ?? turn.ko}>
						<TurnLine
							turn={turn}
							index={i}
							state={state}
							speaking={speaking && i === current && !turn.mine}
							replayable={replayableAt ? replayableAt(i) : i <= current}
							replayDisabled={replayDisabled}
							onJump={onJump}
							onReplay={onReplay}
						/>
						{result?.index === i && (
							<RoleplayRecordResult
								expected={result.expected}
								recognized={result.recognized}
								matched={result.matched}
								onReplay={result.onReplay}
								onRetry={result.onRetry}
								onContinue={result.onContinue}
								canChooseNext={result.canChooseNext}
							/>
						)}
					</Fragment>
				);
			})}
		</RoleplayLayout>
	);
}
