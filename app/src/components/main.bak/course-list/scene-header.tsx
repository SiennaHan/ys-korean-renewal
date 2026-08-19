import { useRouter } from "@tanstack/react-router";
import { X, ChevronLeft } from "lucide-react";

export interface SceneHeaderInterface {
	title: string;
	goBack: () => void;
}

export function SceneHeader (props: SceneHeaderInterface) {
	const router = useRouter();
	const goBack = () => {
		props.goBack();
	}

	return <div className="sticky top-0 items-center z-10 bg-[#f6f7f8]">
		<div className="flex justify-between h-[48px]">
			<div onClick={goBack} className="w-[48px] h-[48px] flex items-center justify-center cursor-pointer hover:bg-gray-200 active:bg-gray-300"><ChevronLeft /></div>
			<div className="flex items-center text-[17px] font-semibold text-[#383A3F]">{props.title}</div>
			<div className="w-[48px]"></div>
		</div>
	</div>
}