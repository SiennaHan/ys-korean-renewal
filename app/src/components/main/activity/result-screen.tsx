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
	/**
	 * **정답 그 자체.** 넘기면 「**정답은** X 이에요.」로 그린다 — 앞머리만
	 * 굵게(`.mistake-exp b`), 시안 B 승인분(2026-09-10).
	 *
	 * 문장을 미리 만들어 넘기지 않는 이유: 어디까지 굵게 할지는 화면의 일이고,
	 * 언어마다 다르다. 부르는 쪽이 문장을 만들면 그 결정이 다섯 군데로 흩어진다.
	 */
	answer?: string;
	/**
	 * 자유 문구 해설. **`answer` 가 없을 때만 쓴다** — 원장에 해설이 있는 활동
	 * (빈칸 채우기의 `grammar_focus`)이 그렇다. 이쪽은 앞머리를 굵게 하지 않는다:
	 * 「정답은」으로 시작하는 문장이 아니라 설명이다.
	 */
	explanation?: string;
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
					{/*
					 * **시안 B — 카드 여러 장이 아니라 목록 하나다**(기획 승인
					 * 2026-09-10 · 시각 정본 `screens_ref/activity__result.html`).
					 *
					 * 시안 A 는 문항마다 흰 카드를 쌓았고, 카드마다 「오답 N」과
					 * 「해설 N」 딱지가 둘씩 붙어 **네 문항이면 딱지가 여덟 개**였다.
					 * 묶음 하나에 줄로 넣으면 「무엇을 다시 볼지」가 한눈에 들어온다.
					 *
					 * 틀린 것이 없으면 목록을 아예 그리지 않는다 — 빈 상자를
					 * 남기지 않는다. 그 경우 머리말이 「잘 했어요!」다.
					 */}
					{wrongs.length > 0 && (
						<div className="mistake-list">
							<div className="mistake-heading">
								<strong>{t("result.mistakeHeading")}</strong>
								<span>{t("result.mistakeCount", { count: wrongs.length })}</span>
							</div>
							{wrongs.map((w, i) => (
								<div
									className="mistake-row"
									key={`${w.picked}-${w.answer ?? w.explanation ?? ""}`}
								>
									<div className="mistake-top">
										{/* 번호는 자리대로 매긴다 — 오답과 건너뜀이 한 줄에 섞여 있다 */}
										<span
											className={`mistake-no ${w.kind === "skipped" ? "skipped" : ""}`.trim()}
										>
											{t(
												w.kind === "skipped"
													? "result.skippedItem"
													: "result.wrongItem",
												{ index: i + 1 },
											)}
										</span>
										<span className="mistake-kind">
											{t("result.explanationLabel")}
										</span>
									</div>
									{/* 건너뛴 문항은 고른 답이 없다 — 빈 줄을 그리지 않는다 */}
									{w.picked && <p className="mistake-answer">{w.picked}</p>}
									<p className="mistake-exp">
										{w.answer ? (
											<>
												<b>{t("result.answerLead")}</b>{" "}
												{t("result.answerTail", { answer: w.answer })}
											</>
										) : (
											w.explanation
										)}
									</p>
								</div>
							))}
						</div>
					)}
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
