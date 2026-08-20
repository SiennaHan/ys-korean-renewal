import { useWeekDays } from "./week-days";

/** 가장 높은 막대가 차지하는 높이 */
const MAX_HEIGHT = 80;
/** 아직 오지 않은 날의 빈 막대 */
const EMPTY_HEIGHT = 24;

/**
 * 주간 활동 — 요일별 막대 일곱.
 *
 * 최댓값을 그 주 안에서 다시 잡는다. 절대 기준을 두면 적게 한 주가
 * 통째로 납작해져 무엇을 더 했는지가 안 보인다.
 */
export default function WeeklyChart({
	data,
	todayIndex,
}: {
	/** 월~일 일곱 개 */
	data: number[];
	todayIndex: number;
}) {
	const days = useWeekDays();
	const max = Math.max(...data, 1);

	return (
		<div className="chart">
			{data.map((value, i) => (
				<div className="col" key={days[i]}>
					<div className="bx">
						<div
							className={`bar ${value ? "" : "empty"}`}
							style={{
								height: value
									? Math.round((value / max) * MAX_HEIGHT)
									: EMPTY_HEIGHT,
							}}
						/>
					</div>
					<div
						className={`lb ${i === todayIndex ? "today" : i > todayIndex ? "future" : ""}`}
					>
						{days[i]}
					</div>
				</div>
			))}
		</div>
	);
}
