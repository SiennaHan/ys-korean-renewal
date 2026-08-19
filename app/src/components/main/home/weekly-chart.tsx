const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

interface WeeklyChartProps {
	/** Array of 7 values (0~1 normalized or raw minutes) for Mon~Sun */
	data: number[];
	/** 0-indexed today */
	todayIndex: number;
}

export default function WeeklyChart({ data, todayIndex }: WeeklyChartProps) {
	const maxVal = Math.max(...data, 1);

	return (
		<div>
			<h2 className="text-[16px] font-bold text-[#24425F] mb-[12px]">
				이번 주 학습량
			</h2>
			<div className="flex items-end justify-between gap-[8px] h-[120px]">
				{DAYS.map((day, i) => {
					const heightPercent = (data[i] / maxVal) * 100;
					const isToday = i === todayIndex;
					const isFuture = i > todayIndex;

					return (
						<div
							key={day}
							className="flex-1 flex flex-col items-center gap-[6px]"
						>
							<div className="w-full flex items-end justify-center h-[80px]">
								{isFuture ? (
									<div
										className="w-full max-w-[36px] rounded-[6px] border-[2px] border-dashed border-[#C8CCD3]"
										style={{ height: `${Math.max(heightPercent, 15)}%` }}
									/>
								) : (
									<div
										className={`w-full max-w-[36px] rounded-[6px] transition-all duration-500 ${
											isToday ? "bg-[#0180FF]" : "bg-[#0180FF]"
										}`}
										style={{
											height: `${Math.max(heightPercent, 8)}%`,
											opacity: isToday ? 1 : 0.7,
										}}
									/>
								)}
							</div>
							<span
								className={`text-[12px] ${
									isToday
										? "text-[#0180FF] font-bold"
										: isFuture
											? "text-[#C8CCD3]"
											: "text-[#6B7B8D]"
								}`}
							>
								{isToday ? "오늘" : day}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
