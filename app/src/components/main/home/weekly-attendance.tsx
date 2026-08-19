import { Check } from "lucide-react";

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

interface WeeklyAttendanceProps {
	/** 0-indexed: 0=월, 1=화, ... 6=일 */
	todayIndex: number;
	/** Which days are completed (0-indexed) */
	completedDays: number[];
	streak: number;
}

export default function WeeklyAttendance({
	todayIndex,
	completedDays,
	streak,
}: WeeklyAttendanceProps) {
	return (
		<div className="flex flex-col items-center gap-[12px]">
			<div className="flex gap-[12px]">
				{DAYS.map((day, i) => {
					const isCompleted = completedDays.includes(i);
					const isToday = i === todayIndex;
					const isPast = i < todayIndex;
					const isFuture = i > todayIndex;

					return (
						<div key={day} className="flex flex-col items-center gap-[4px]">
							<div
								className={`flex items-center justify-center size-[40px] rounded-full ${
									isCompleted
										? "bg-[#0180FF]"
										: isToday
											? "border-[2.5px] border-[#0180FF] bg-white"
											: "bg-[#E5E8EC]"
								}`}
							>
								{isCompleted && <Check className="size-[20px] text-white" strokeWidth={3} />}
							</div>
							<span
								className={`text-[12px] font-medium ${
									isToday
										? "text-[#0180FF] font-bold"
										: isCompleted
											? "text-[#24425F]"
											: "text-[#C8CCD3]"
								}`}
							>
								{isToday ? "오늘" : day}
							</span>
						</div>
					);
				})}
			</div>
			<p className="text-[14px] text-[#6B7B8D]">
				<span className="font-bold text-[#24425F]">{streak}일 연속 학습 중</span>{" "}
				오늘도 해볼까요?
			</p>
		</div>
	);
}
