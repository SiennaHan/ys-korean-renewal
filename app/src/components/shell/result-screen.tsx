import { useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * 결과 화면 — 구현 사양 §8
 *
 * 두 숫자를 구분한다.
 *  · firstTryWrongCount — 첫 시도에 틀린 것. 재시도로 맞혀도 센다. 오답 목록과 "내일 다시 만나요"
 *  · unresolvedCount    — 끝난 시점에도 해소되지 않은 것. [다시 풀기] 노출 조건
 *
 * 선택지형은 맞힐 때까지 진행되지 않으므로 오답으로는 미해결이 생기지 않는다.
 * 다만 헤더의 건너뛰기가 상시 있어 선택지형에서도 미해결이 나올 수 있다.
 */
export interface WrongItem {
	id: string;
	/** 학습자가 고른 답 */
	userAnswer: string;
	explanation: string;
	/** 3회 이상 틀린 문항은 강조하고 세션에서 먼저 낸다 */
	attempts: number;
}

export interface ResultScreenProps {
	/** 푼 문항 — 주 지표다. 정답률이 아니라 "풀었나" */
	answeredCount: number;
	totalItems: number;
	/** 채점 대상 문항 수. 발음·플래시카드는 0 이라 정답률이 — 가 된다 */
	gradedCount: number;
	correctCount: number;
	firstTryWrongCount: number;
	unresolvedCount: number;
	wrongItems?: WrongItem[];
	/** 다시 풀기 세션이 끝난 화면 */
	reviewDone?: boolean;
	onPracticeAgain?: () => void;
	onNextActivity?: () => void;
	onBack?: () => void;
}

/** 오답이 많을 때 접는다 */
const COLLAPSE_AFTER = 3;
/** 이 횟수 이상 틀리면 강조한다 */
const HARD_ATTEMPTS = 3;

export function ResultScreen({
	answeredCount,
	totalItems,
	gradedCount,
	correctCount,
	firstTryWrongCount,
	unresolvedCount,
	wrongItems = [],
	reviewDone,
	onPracticeAgain,
	onNextActivity,
	onBack,
}: ResultScreenProps) {
	const { t } = useTranslation();
	const [expanded, setExpanded] = useState(false);

	if (reviewDone) {
		return (
			<Frame title={t("review.sessionDone")}>
				<Actions>
					<Primary onClick={onBack}>{t("result.backToLessons")}</Primary>
				</Actions>
			</Frame>
		);
	}

	const perfect = firstTryWrongCount === 0 && unresolvedCount === 0;
	// gradedCount 가 0 이면 정답률이 — 가 된다. 화면 분기는 그것뿐이고 별도 화면을 만들지 않는다
	const accuracy =
		gradedCount === 0
			? "—"
			: `${Math.round((correctCount / gradedCount) * 100)}%`;

	// 3회 이상 틀린 것이 먼저 나온다
	const sorted = [...wrongItems].sort((a, b) => b.attempts - a.attempts);
	const shown = expanded ? sorted : sorted.slice(0, COLLAPSE_AFTER);

	return (
		<Frame title={perfect ? t("result.perfect") : t("result.title")}>
			<div className="flex gap-3 px-5">
				<StatCard
					label={t("result.kAnswered")}
					value={`${answeredCount}/${totalItems}`}
				/>
				<StatCard label={t("result.kAccuracy")} value={accuracy} />
			</div>

			{sorted.length > 0 && (
				<ul className="flex flex-col gap-4 px-5 pt-6">
					{shown.map((w, i) => (
						<li
							key={w.id}
							className="flex flex-col gap-2 border-line-normal border-b pb-4 last:border-b-0"
						>
							<div className="flex items-center gap-2">
								<Chip tone="wrong">
									{t("result.wrongItem", { index: i + 1 })}
								</Chip>
								{w.attempts >= HARD_ATTEMPTS && (
									<Chip tone="hard">{t("result.hardItem")}</Chip>
								)}
							</div>
							<p className="text-base text-text-strong">{w.userAnswer}</p>
							<div className="flex items-start gap-2">
								<Chip tone="explain">
									{t("result.explanation", { index: i + 1 })}
								</Chip>
								<p className="flex-1 text-sm text-text-sub">{w.explanation}</p>
							</div>
						</li>
					))}
					{sorted.length > COLLAPSE_AFTER && !expanded && (
						<li>
							<button
								type="button"
								onClick={() => setExpanded(true)}
								className="w-full py-2 text-sm text-text-sub"
							>
								{t("result.showMore")} ∨
							</button>
						</li>
					)}
				</ul>
			)}

			{unresolvedCount === 0 && firstTryWrongCount > 0 && (
				<p className="px-5 pt-6 text-sm text-text-sub">
					{t("result.toPractice", { count: firstTryWrongCount })}
				</p>
			)}

			<Actions>
				{/* 미해결이 있을 때만 [다시 풀기]. 막지는 않되 권하기는 한다 */}
				{unresolvedCount > 0 && (
					<Secondary onClick={onPracticeAgain}>
						{t("result.practiceAgain")}
					</Secondary>
				)}
				<Primary onClick={onNextActivity}>{t("result.nextActivity")}</Primary>
			</Actions>
		</Frame>
	);
}

function Frame({
	title,
	children,
}: { title: string; children: React.ReactNode }) {
	return (
		<div className="flex min-h-dvh flex-col bg-background-base">
			{/* 파랑 헤더 — fill-primary 채움에 흰 글자 */}
			<header className="bg-fill-primary px-5 pt-8 pb-6">
				<h1 className="font-semibold text-2xl text-text-inverse">{title}</h1>
			</header>
			<div className="-mt-4 flex-1 pb-6">{children}</div>
		</div>
	);
}

function StatCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex-1 rounded-2xl bg-background-surface p-4 shadow-sm">
			<p className="text-sm text-text-sub">{label}</p>
			<p className="pt-1 font-semibold text-2xl text-text-strong">{value}</p>
		</div>
	);
}

function Chip({
	tone,
	children,
}: { tone: "wrong" | "explain" | "hard"; children: React.ReactNode }) {
	const cls = {
		wrong: "bg-background-wrong text-fill-wrong",
		explain: "bg-background-explain text-text-inverse",
		hard: "bg-fill-caution text-text-inverse",
	}[tone];
	return (
		<span
			className={`shrink-0 rounded-md px-2 py-1 font-medium text-xs ${cls}`}
		>
			{children}
		</span>
	);
}

/** 1개면 콘텐츠 폭 전폭 · 2개면 절반씩 간격 12 */
function Actions({ children }: { children: React.ReactNode }) {
	return <div className="flex gap-3 px-5 pt-8">{children}</div>;
}

function Primary({
	children,
	onClick,
}: { children: React.ReactNode; onClick?: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="h-14 flex-1 rounded-xl bg-fill-primary font-semibold text-text-inverse"
		>
			{children}
		</button>
	);
}

function Secondary({
	children,
	onClick,
}: { children: React.ReactNode; onClick?: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="h-14 flex-1 rounded-xl border border-line-normal bg-background-surface font-semibold text-text-strong"
		>
			{children}
		</button>
	);
}
