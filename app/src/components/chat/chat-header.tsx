import { useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { ChevronRight, X } from "lucide-react";

interface HeaderInterface {
	chapterSeq?: number;
	unitTitle?: string;
	skip?: () => void;
	isCompleted: boolean;
	goResult: () => void;
}

const baseButton =
	"size-[48px] flex items-center justify-center cursor-pointer hover:bg-gray-200 active:bg-gray-300";
const baseTextButton =
	"flex items-center justify-center px-[10px] rounded-[6px] py-[5px] bg-[#F9FAFC] text-[#0180FF] text-[14px] font-semibold cursor-pointer hover:text-blue-500 active:text-blue-300";

export function ChatHeader(props: HeaderInterface) {
	const router = useRouter();
	const goBack = () => {
		router.history.back();
	};

	return (
		<div className="flex items-center justify-between">
			<div onClick={goBack} className={baseButton}>
				<X />
			</div>
			<div className="flex items-center pl-[16px] font-semibold text-[#383A3F] text-[17px]">
				{props.chapterSeq}
				{"과"}
			</div>
			<div className="flex items-center pr-[16px]">
				{props.isCompleted ? (
					<button
						className={clsx(baseTextButton, "text-[12px]")}
						onClick={props.goResult}
					>
						finish
					</button>
				) : (
					props.skip && (
						<button
							className={clsx(baseTextButton, "text-[12px]")}
							onClick={props.skip}
						>
							skip
						</button>
					)
				)}
			</div>
		</div>
	);
}
