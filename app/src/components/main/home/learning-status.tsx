interface LearningStatusProps {
	chapterCompleted: number;
	chapterTotal: number;
	chapterLabel: string;
	todayActivities: number;
	weeklyActivities: number;
}

function CircularProgress({
	completed,
	total,
}: { completed: number; total: number }) {
	const radius = 45;
	const stroke = 8;
	const normalizedRadius = radius - stroke / 2;
	const circumference = normalizedRadius * 2 * Math.PI;
	const percent = total > 0 ? (completed / total) * 100 : 0;
	const strokeDashoffset = circumference - (percent / 100) * circumference;

	return (
		<div className="relative size-[110px]">
			<svg className="size-full -rotate-90" viewBox="0 0 90 90">
				<circle
					cx="45"
					cy="45"
					r={normalizedRadius}
					fill="none"
					stroke="#E5E8EC"
					strokeWidth={stroke}
				/>
				<circle
					cx="45"
					cy="45"
					r={normalizedRadius}
					fill="none"
					stroke="#0180FF"
					strokeWidth={stroke}
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={strokeDashoffset}
					className="transition-all duration-700"
				/>
			</svg>
			<div className="absolute inset-0 flex items-center justify-center">
				<span className="text-[22px] font-bold text-[#0180FF]">
					{completed}
					<span className="text-[14px] font-normal text-[#9BA5B0]">
						/{total}
					</span>
				</span>
			</div>
		</div>
	);
}

function StatCard({ value, label }: { value: number; label: string }) {
	return (
		<div className="flex items-center gap-[12px] rounded-[12px] bg-white p-[14px]">
			<div className="flex size-[44px] shrink-0 items-center justify-center rounded-[10px] bg-[#0180FF] text-[20px] font-bold text-white">
				{value}
			</div>
			<p className="text-[13px] font-semibold text-[#24425F]">{label}</p>
		</div>
	);
}

export default function LearningStatus({
	chapterCompleted,
	chapterTotal,
	chapterLabel,
	todayActivities,
	weeklyActivities,
}: LearningStatusProps) {
	return (
		<div>
			<h2 className="mb-[12px] text-[16px] font-bold text-[#24425F]">
				나의 학습 현황
			</h2>
			<div className="rounded-[16px] bg-[#F6F7F8] p-[16px]">
				<div className="flex gap-[12px]">
					{/* Left: circular progress */}
					<div className="flex flex-1 flex-col items-center justify-center rounded-[12px] bg-white py-[20px]">
						<CircularProgress
							completed={chapterCompleted}
							total={chapterTotal}
						/>
						<p className="mt-[8px] text-[13px] font-semibold text-[#24425F]">
							현재 과 진행
						</p>
						<p className="mt-[2px] text-[11px] text-[#9BA5B0]">
							{chapterLabel}
						</p>
					</div>

					{/* Right: stat cards */}
					<div className="flex flex-1 flex-col gap-[8px]">
						<StatCard value={todayActivities} label="오늘 활동 수" />
						<StatCard value={weeklyActivities} label="주간 활동 수" />
					</div>
				</div>
			</div>
		</div>
	);
}
