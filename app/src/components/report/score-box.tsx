interface Props {
	count: number;
	completedCount: number;
}
export default function(props: Props) {

	const percent = props.completedCount > 0 ? Math.floor(props.completedCount / props.count * 100) : 0;

	return <div className="grid grid-cols-2 gap-[8px] h-[70px]">
		<div className="bg-[#fff] rounded-[10px] pt-[12px]">
			<div className="text-[12px] text-[#7F848D] text-center font-semibold">{'완료한 키워드'}</div>
			<div className="text-[18px] text-[#4396F4] text-center font-bold">{props.completedCount + ' / ' + props.count}</div>
		</div>
		<div className="bg-[#fff] rounded-[10px] pt-[12px]">
			<div className="text-[12px] text-[#7F848D] text-center font-semibold">{'점수'}</div>
			<div className="text-[18px] text-[#4396F4] text-center font-bold">{percent + '%'}</div>
		</div>
	</div>
}