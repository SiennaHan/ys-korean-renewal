import { ChevronRight, Play } from "lucide-react";

interface ContinueLearningProps {
	bookLabel: string;
	chapterLabel: string;
	moduleLabel: string;
	onClick: () => void;
}

export default function ContinueLearning({
	bookLabel,
	chapterLabel,
	moduleLabel,
	onClick,
}: ContinueLearningProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="w-full rounded-[16px] bg-[#DBEDFF] p-[16px] flex items-center gap-[14px] cursor-pointer active:bg-[#C5DEFF] transition-colors"
		>
			<div className="flex items-center justify-center size-[48px] rounded-[12px] bg-[#0180FF] shrink-0">
				<Play className="size-[22px] text-white fill-white ml-[2px]" />
			</div>
			<div className="flex-1 text-left">
				<p className="text-[16px] font-bold text-[#24425F]">이어서 학습하기</p>
				<p className="text-[13px] text-[#0180FF] mt-[2px]">
					{bookLabel} {chapterLabel} - {moduleLabel}
				</p>
			</div>
			<ChevronRight className="size-[22px] text-[#0180FF] shrink-0" />
		</button>
	);
}
