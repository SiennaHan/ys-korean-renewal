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
			<div className="flex h-[48px] items-center px-[4px]">
				<button
					type="button"
					onClick={() => router.history.back()}
					className="flex h-[44px] w-[44px] cursor-pointer items-center justify-center"
				>
					<ChevronLeft className="size-[24px] text-[#383A3F]" />
				</button>
				<div className="flex-1 pr-[44px] text-center">
					<p className="text-[#979DA8] text-[14px]">{chapterLabel}</p>
				</div>
			</div>
			<div className="px-[20px] pt-[8px] pb-[20px]">
				<h1 className="font-bold text-[#383A3F] text-[20px] leading-tight">
					{title}
				</h1>
			</div>
		</div>
	);
}
