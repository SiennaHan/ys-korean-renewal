import { useTranslation } from "react-i18next";
import {
	ActivityAppBar,
	ActivityFooter,
	ActivityFrame,
	Dock,
	PrimaryButton,
} from "./shell";

export interface WrongItem {
	/** 학생이 고른 답 */
	picked: string;
	/** 왜 틀렸는지 */
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
	/** 채점된 문항 수. 0 이면 정답률을 낼 수 없어 — 로 둔다 */
	graded: number;
	correct: number;
	wrongs: WrongItem[];
	onExit?: () => void;
	onRetry?: () => void;
	onNext?: () => void;
}) {
	const { t } = useTranslation();
	const accuracy = graded ? `${Math.round((correct / graded) * 100)}%` : "—";

	return (
		<ActivityFrame>
			<ActivityAppBar lesson={lesson} onExit={onExit} />
			<main className="activity-content" style={{ padding: 0 }}>
				<div className="result-head">
					<h2>{t("result.title")}</h2>
					<p>{t("result.answered", { total, answered })}</p>
					<div className="stat-row">
						<div>
							<span>{t("result.kAnswered")}</span>
							<strong>
								{answered} / {total}
							</strong>
						</div>
						<div>
							<span>{t("result.kAccuracy")}</span>
							<strong>{accuracy}</strong>
						</div>
					</div>
				</div>
				<div className="scroll-area" style={{ padding: 16 }}>
					{wrongs.map((w, i) => (
						<div className="wrong-card" key={`${w.picked}-${w.explanation}`}>
							<span className="tag w">
								{t("result.wrongItem", { index: i + 1 })}
							</span>
							<p style={{ margin: "8px 0 0", fontSize: 16 }}>{w.picked}</p>
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
