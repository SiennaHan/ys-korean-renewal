import { useNavigate } from "@tanstack/react-router";

interface Props {
	unitId: number
}
export default function RecentActivity(props: Props) {

	const navigate = useNavigate()
		
	const goStudy = (unitId: number) => {
		navigate({to: '/book/chapter/unit/' + unitId});
	}

	return <div className="mt-[8px] bg-white rounded-[10px] px-[16px] pt-[8px] pb-[12px] border-1 border-[#f3f3f3] shadow-[0px_2px_10px_rgba(0,0,0,0.1)]">
		<div>
			<span className="text-[14px] font-bold">연세대 3주완성 1권</span>
			<span className="ml-[5px] text-[12px] text-[#ccc]">Yonsei Korean in 3 Week - 1</span>
		</div>
		<div className="mt-[10px] bg-[#f7f7f7] rounded-[5px] px-[10px] pb-[3px]">
			<span className="text-[14px] text-[#333]">1과. 한글(1)</span>
			<span className="ml-[5px] text-[10px] text-[#ccc]">Chapter 1. Hangul(1)</span>
		</div>
		<div className="ml-[10px]">
			<span className="text-[12px] text-[#555]">모음 1: ㅏ, ㅓ, ㅗ, ㅜ, ㅡ, ㅣ, ㅚ, ㅟ</span>
			<span className="ml-[5px] text-[10px] text-[#ccc]">Vowel 1</span>
		</div>
		<div className="mt-[10px]">
			<div className="relative w-full">
				<div className="h-[5px] bg-[#efefef] rounded-full"></div>
				<div className="absolute top-0 left-0 w-[80%] h-[5px] bg-[#777] rounded-full"></div>
			</div>
			<div className="flex justify-between">
				<span className="text-[10px] text-[#999]"></span>
				<span className="text-[10px] text-[#999]">80%</span>
			</div>
		</div>
		<div onClick={e=>goStudy(props.unitId)} className="h-[32px] text-white bg-[#4396F4] rounded-full flex items-center justify-center mt-[10px] cursor-pointer hover:opacity-75 active:opacity-90">
			공부하러 가기
		</div>
	</div>
}