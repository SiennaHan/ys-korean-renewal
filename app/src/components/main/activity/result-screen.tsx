import { useTranslation } from "react-i18next";
import {
	ActivityAppBar,
	ActivityFooter,
	ActivityFrame,
	Dock,
	PrimaryButton,
} from "./shell";

export interface WrongItem {
	/**
	 * 왜 미해결로 남았나.
	 *
	 * **건너뛴 것은 오답이 아니다** — 안 푼 것이다(shell_spec §28 · 기획 확정
	 * 2026-08-27). 전에는 둘을 같은 「오답 N」으로 그려서, 건너뛴 카드는 고른
	 * 답 자리가 **빈 줄**로 남았다. 라벨도 사실과 달랐다.
	 */
	kind?: "wrong" | "skipped";
	/** 학생이 고른 답. 건너뛴 문항은 고른 것이 없어 비운다 */
	picked: string;
	/** 왜 틀렸는지 — 건너뛴 문항에서는 정답 안내다 */
	explanation: string;
}

/**
 * 결과 화면.
 *
 * 골격을 쓰되 두 곳이 다르다 — 머리말이 스크롤 밖에 고정으로 붙고,
 * 피드백 칸이 없다. 그래서 activity-content 의 padding 을 0 으로 되돌리고
 * scroll-area 가 자기 여백을 다시 잡는다 (목업 resultView 의 인라인 style 그대로).
 */
export function ResultScreen({
	lesson,
	total,
	answered,
	grading = "graded",
	graded,
	correct,
	wrongs,
	onExit,
	onRetry,
	onNext,
}: {
	lesson: string;
	total: number;
	answered: number;
	/** 채점이 없는 활동은 완료 수만 보여 준다. 정답률 빈 카드를 만들지 않는다 */
	grading?: "graded" | "completion";
	/** 채점된 문항 수. 0 이면 정답률을 낼 수 없어 — 로 둔다 */
	graded?: number;
	correct: number;
	wrongs: WrongItem[];
	onExit?: () => void;
	onRetry?: () => void;
	onNext?: () => void;
}) {
	const { t } = useTranslation();
	const accuracy = graded ? `${Math.round((correct / graded) * 100)}%` : "—";
	const completionOnly = grading === "completion";

	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={onExit} />
			<main className="activity-content" style={{ padding: 0 }}>
				<div className="result-head">
					{/*
					 * 제목이 상태를 말한다 — 정본 §28 이 "완전 정답 · 내일 복습 ·
					 * 미해결 있음" 셋으로 화면을 갈라 두었는데 구현은 셋에 같은
					 * 제목("다 했어요!")을 쓰고 있었다. 완료 기준이 바뀌면서
					 * **0개를 풀어도 "다 했어요!"** 가 되어 바로 아랫줄
					 * ("6개 중 0개 풀었어요")과 한 화면에서 어긋났다(2026-08-27).
					 *
					 * 다 풀었을 때도 "다 맞았어요" 라고는 하지 않는다 — 채점하지
					 * 않는 활동(자모 여섯·롤플레잉·플래시카드)이 있어서 맞았는지를
					 * 이 자리에서 단정할 수 없다.
					 */}
					<h2>
						{t(answered >= total ? "result.title" : "result.titlePartial")}
					</h2>
					<p>{t("result.answered", { total, answered })}</p>
					<div className={`stat-row ${completionOnly ? "single" : ""}`}>
						<div>
							<span>{t("result.kAnswered")}</span>
							<strong>
								{answered} / {total}
							</strong>
						</div>
						{!completionOnly && (
							<div>
								<span>{t("result.kAccuracy")}</span>
								<strong>{accuracy}</strong>
							</div>
						)}
					</div>
				</div>
				<div className="scroll-area" style={{ padding: 16 }}>
					{wrongs.map((w, i) => (
						<div className="wrong-card" key={`${w.picked}-${w.explanation}`}>
							{/* 번호는 자리대로 매긴다 — 아래 「해설 N」과 짝이 맞아야 한다 */}
							<span className={`tag ${w.kind === "skipped" ? "s" : "w"}`}>
								{t(
									w.kind === "skipped"
										? "result.skippedItem"
										: "result.wrongItem",
									{ index: i + 1 },
								)}
							</span>
							{/* 건너뛴 문항은 고른 답이 없다 — 빈 줄을 그리지 않는다 */}
							{w.picked && (
								<p style={{ margin: "8px 0 0", fontSize: 16 }}>{w.picked}</p>
							)}
							<span className="tag e" style={{ marginTop: 10 }}>
								{t("result.explanation", { index: i + 1 })}
							</span>
							<p
								style={{
									margin: "8px 0 0",
									fontSize: 14,
									color: "var(--color-text-sub)",
								}}
							>
								{w.explanation}
							</p>
						</div>
					))}
				</div>
			</main>
			<ActivityFooter>
				<Dock mainStyle={{ gap: 12 }}>
					<PrimaryButton
						label={t("result.practiceAgain")}
						on
						onClick={onRetry}
					/>
					<PrimaryButton label={t("result.nextActivity")} on onClick={onNext} />
				</Dock>
			</ActivityFooter>
		</ActivityFrame>
	);
}
