import { IconCheck } from "@/components/main/nav/icons";
import { useTranslation } from "react-i18next";
import { useWeekDays } from "./week-days";

/**
 * 주간 출석 — 원 일곱 개.
 *
 * 오늘은 채우지 않고 테두리만 둔다. 아직 안 한 날이지 못 한 날이 아니라서다.
 */
export default function WeeklyAttendance({
	todayIndex,
	completedDays,
	streak,
}: {
	/** 0=월 … 6=일 */
	todayIndex: number;
	completedDays: number[];
	streak: number;
}) {
	const { t } = useTranslation();
	const days = useWeekDays();

	return (
		<div className="week">
			<div className="days">
				{days.map((day, i) => {
					const done = completedDays.includes(i);
					const today = i === todayIndex;
					return (
						<div className="d" key={day}>
							<div className={`c ${done ? "done" : today ? "today" : ""}`}>
								{done && <IconCheck />}
							</div>
							<div
								className={`lb ${today ? "today" : i > todayIndex ? "future" : ""}`}
							>
								{day}
							</div>
						</div>
					);
				})}
			</div>
			<div className="streak">
				<b>{t("home.streakDays", { count: streak })}</b> {t("home.streakTail")}
			</div>
		</div>
	);
}
