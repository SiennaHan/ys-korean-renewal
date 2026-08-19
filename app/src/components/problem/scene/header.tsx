import { useRouter } from "@tanstack/react-router";
import { X } from "lucide-react";

interface HeaderInterface {
	chapterSeq?: number;
	unitTitle?: string;
}

export function ProblemHeader (props: HeaderInterface) {
	const router = useRouter();
	const goBack = () => {
		router.history.back();
	}

	return <div className="sticky top-0 items-center bg-white z-10">
		<div className="flex justify-between h-[48px]">
			<div onClick={goBack} className="w-[48px] h-[48px] flex items-center justify-center cursor-pointer hover:bg-gray-200 active:bg-gray-300"><X /></div>
			<div className="flex items-center text-[14px] text-[#888]">{props.chapterSeq}{'과 - '}{props.unitTitle}</div>
			<div className="w-[48px]"></div>
		</div>
	</div>
}

export function JamoHeader (props: HeaderInterface) {
	const router = useRouter();
	const goBack = () => {
		router.history.back();
	}

	return <div className="sticky top-0 items-center bg-white z-10">
		<div className="flex justify-between h-[48px]">
			<div onClick={goBack} className="w-[48px] h-[48px] flex items-center justify-center cursor-pointer hover:bg-gray-200 active:bg-gray-300"><X /></div>
			<div className="flex items-center text-[14px] text-[#888]">{props.chapterSeq}{'과 - '}{props.unitTitle}</div>
			<div className="w-[48px]"></div>
		</div>
	</div>
}