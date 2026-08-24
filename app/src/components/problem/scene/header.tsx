import { useRouter } from "@tanstack/react-router";
import { X } from "lucide-react";

interface HeaderInterface {
	chapterSeq?: number;
	unitTitle?: string;
}

export function ProblemHeader(props: HeaderInterface) {
	const router = useRouter();
	const goBack = () => {
		router.history.back();
	};

	return (
		<div className="sticky top-0 z-10 items-center bg-white">
			<div className="flex h-[48px] justify-between">
				<button
					type="button"
					onClick={goBack}
					className="flex h-[48px] w-[48px] cursor-pointer items-center justify-center hover:bg-gray-200 active:bg-gray-300"
				>
					<X />
				</button>
				<div className="flex items-center text-[#888] text-[14px]">
					{props.chapterSeq}
					{"과 - "}
					{props.unitTitle}
				</div>
				<div className="w-[48px]" />
			</div>
		</div>
	);
}

export function JamoHeader(props: HeaderInterface) {
	const router = useRouter();
	const goBack = () => {
		router.history.back();
	};

	return (
		<div className="sticky top-0 z-10 items-center bg-white">
			<div className="flex h-[48px] justify-between">
				<button
					type="button"
					onClick={goBack}
					className="flex h-[48px] w-[48px] cursor-pointer items-center justify-center hover:bg-gray-200 active:bg-gray-300"
				>
					<X />
				</button>
				<div className="flex items-center text-[#888] text-[14px]">
					{props.chapterSeq}
					{"과 - "}
					{props.unitTitle}
				</div>
				<div className="w-[48px]" />
			</div>
		</div>
	);
}
