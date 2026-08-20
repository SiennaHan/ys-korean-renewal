import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface LearnFooterProps {
	current: number;
	total: number;
	onPrev: () => void;
	onNext: () => void;
}

export default function LearnFooter({
	current,
	total,
	onPrev,
	onNext,
}: LearnFooterProps) {
	const hasPrev = current > 0;
	const hasNext = current < total - 1;

	return (
		<div className="bg-white px-[16px]">
			{/* Arrow row */}
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={onPrev}
					disabled={!hasPrev}
					className={clsx(
						"flex size-[36px] shrink-0 items-center justify-center",
						hasPrev
							? "cursor-pointer text-[#0180FF]"
							: "cursor-default text-[#E5E8EC]",
					)}
				>
					<ChevronLeft className="size-[24px]" />
				</button>

				<div className="flex-1" />

				<button
					type="button"
					onClick={onNext}
					disabled={!hasNext}
					className={clsx(
						"flex size-[36px] shrink-0 items-center justify-center",
						hasNext
							? "cursor-pointer text-[#0180FF]"
							: "cursor-default text-[#E5E8EC]",
					)}
				>
					<ChevronRight className="size-[24px]" />
				</button>
			</div>

			{/* Progress dots */}
			{total > 1 && (
				<div className="flex items-center justify-center gap-[4px] pt-[4px] pb-[8px]">
					{Array.from({ length: total }, (_, i) => (
						<div
							key={i}
							className={clsx(
								"rounded-full transition-all",
								i === current
									? "h-[5px] w-[16px] bg-[#0180FF]"
									: "size-[5px] bg-[#E5E8EC]",
							)}
						/>
					))}
				</div>
			)}
		</div>
	);
}
