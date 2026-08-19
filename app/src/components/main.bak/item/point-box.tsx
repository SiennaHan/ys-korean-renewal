import { BadgeDollarSign, Star } from "lucide-react"

const PointBox = (props: {label: string, value: string}) => {
	return <div className="h-[72px] flex-1 bg-[#f7f7f7] rounded-[10px] py-[10px] px-[13px] border-1 border-[#f7f7f7]">
		<div className="text-[12px] text-[#8D8D8D]">{props.label}</div>
		<div className="flex justify-end items-center text-[#000] text-[28px]">
			<span>
				{props.label === 'Point' && <BadgeDollarSign color={"#7796F4"}/>}
				{props.label === 'Streak' && <Star fill={"#7796F4"} strokeWidth={0}/>}
			</span>
			<span className="ml-[8px]">{props.value}</span>
		</div>
	</div>
}

export default PointBox;