import { useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

interface LearnHeaderProps {
	chapterLabel: string;
	title: string;
}

export default function LearnHeader({ chapterLabel, title }: LearnHeaderProps) {
	const router = useRouter();

	return (
		<div className="sticky top-0 z-10 bg-white">
			<div className="flex items-center h-[48px] px-[4px]">
				<button
					type="button"
					onClick={() => router.history.back()}
					className="w-[44px] h-[44px] flex items-center justify-center cursor-pointer"
				>
					<ChevronLeft className="size-[24px] text-[#383A3F]" />
				</button>
				<div className="flex-1 text-center pr-[44px]">
					<p className="text-[14px] text-[#979DA8]">{chapterLabel}</p>
				</div>
			</div>
			<div className="px-[20px] pt-[8px] pb-[20px]">
				<h1 className="text-[20px] font-bold text-[#383A3F] leading-tight">
					{title}
				</h1>
			</div>
		</div>
	);
}
