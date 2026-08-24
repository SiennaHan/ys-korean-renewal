interface Props {
	count: number;
	completedCount: number;
}
export default function (props: Props) {
	const percent =
		props.completedCount > 0
			? Math.floor((props.completedCount / props.count) * 100)
			: 0;

	return (
		<div className="grid h-[70px] grid-cols-2 gap-[8px]">
			<div className="rounded-[10px] bg-[#fff] pt-[12px]">
				<div className="text-center font-semibold text-[#7F848D] text-[12px]">
					{"완료한 키워드"}
				</div>
				<div className="text-center font-bold text-[#4396F4] text-[18px]">
					{`${props.completedCount} / ${props.count}`}
				</div>
			</div>
			<div className="rounded-[10px] bg-[#fff] pt-[12px]">
				<div className="text-center font-semibold text-[#7F848D] text-[12px]">
					{"점수"}
				</div>
				<div className="text-center font-bold text-[#4396F4] text-[18px]">
					{`${percent}%`}
				</div>
			</div>
		</div>
	);
}
