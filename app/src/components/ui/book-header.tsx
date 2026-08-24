import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export const BookHeader = ({
	title,
	previousPage,
}: { title?: string; previousPage: string }) => {
	const navigate = useNavigate();

	const goPrevious = () => {
		navigate({ to: previousPage });
	};

	return (
		<div className="flex h-[54px] items-center justify-between">
			<div className="h-[54px] w-[54px]">
				<div
					onClick={goPrevious}
					className="flex h-full w-full cursor-pointer items-center justify-center hover:bg-gray-200 active:bg-gray-300"
				>
					<ChevronLeft />
				</div>
			</div>
			<div className="font-bold text-[#000] text-[18px]">{title}</div>
			<div className="h-[54px] w-[54px]" />
		</div>
	);
};
