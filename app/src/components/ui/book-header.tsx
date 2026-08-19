import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";




export const BookHeader = ({title, previousPage}: {title?: string, previousPage: string}) => {

	const navigate = useNavigate();
		
	const goPrevious = () => {
			navigate({to: previousPage});
	}

	return <div className="h-[54px] flex justify-between items-center">
		<div className="w-[54px] h-[54px]">
			<div onClick={goPrevious} className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-gray-200 active:bg-gray-300">
				<ChevronLeft />
			</div>
		</div>
		<div className="text-[18px] text-[#000] font-bold">{title}</div>
		<div className="w-[54px] h-[54px]"></div>
	</div>
}