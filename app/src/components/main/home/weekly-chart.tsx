import { useWeekDays } from "./week-days";

/** 가장 높은 막대가 차지하는 높이 */
const MAX_HEIGHT = 80;
/** 아직 오지 않은 날의 빈 막대 */
const EMPTY_HEIGHT = 24;

/**
 * 주간 학습 시간 — 요일별 막대 일곱.
 *
 * **값의 단위는 분(分)이다** — 활동 건수가 아니다. 서버가
 * `study_seconds // 60` 을 보낸다(`api/business/dashboard.py`). 바로 위
 * 「오늘 활동 수 · 주간 활동 수」와 세는 것이 다르다. 전에는 제목이
 * "주간 활동" 이라 같은 것으로 읽혔다 — 기획자 확정(2026-08-26)으로 이름을
 * 사실에 맞췄다.
 *
 * 최댓값을 그 주 안에서 다시 잡는다. 절대 기준을 두면 적게 한 주가
 * 통째로 납작해져 무엇을 더 했는지가 안 보인다. 그래서 하루만 공부한 주는
 * 그 하루가 꽉 찬 막대가 된다 — 많이 한 것이 아니라 그 주의 최대치라는 뜻이다.
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
