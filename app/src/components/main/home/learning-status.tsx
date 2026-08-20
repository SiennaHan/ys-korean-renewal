import { useTranslation } from "react-i18next";

/** 게이지 반지름 40 — 목업 SVG 가 90 뷰박스에 8 굵기로 그린 값이다 */
const R = 40;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * 학습 현황 — 왼쪽에 지금 급의 진행, 오른쪽에 활동 수 둘.
 *
 * 게이지는 과 단위다. 활동 단위로 잡으면 숫자가 커져 하루치 변화가 안 보인다.
 */
export default function LearningStatus({
	chapterCompleted,
	chapterTotal,
	chapterLabel,
	todayActivities,
	weeklyActivities,
}: {
	chapterCompleted: number;
	chapterTotal: number;
	/** "1급 학습 중" 처럼 지금 어디인지 */
	chapterLabel: string;
	todayActivities: number;
	weeklyActivities: number;
}) {
	const { t } = useTranslation();
	const ratio = chapterTotal > 0 ? chapterCompleted / chapterTotal : 0;

	return (
		<div className="status">
			<div className="gauge">
				<svg viewBox="0 0 90 90" aria-hidden="true">
					<circle
						cx="45"
						cy="45"
						r={R}
						fill="none"
						stroke="var(--color-line-normal)"
						strokeWidth="8"
					/>
					<circle
						cx="45"
						cy="45"
						r={R}
						fill="none"
						stroke="var(--color-fill-primary)"
						strokeWidth="8"
						strokeLinecap="round"
						strokeDasharray={CIRCUMFERENCE}
						strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
					/>
				</svg>
				<div className="mid">
					<div className="v">
						{chapterCompleted}
						<small>/{chapterTotal}</small>
					</div>
					<div className="lb">{chapterLabel}</div>
				</div>
			</div>
			<div className="stats">
				<div className="stat2">
					<span className="n">{todayActivities}</span>
					<span className="l">{t("home.todayActivities")}</span>
				</div>
				<div className="stat2">
					<span className="n">{weeklyActivities}</span>
					<span className="l">{t("home.weeklyActivities")}</span>
				</div>
			</div>
		</div>
	);
}
