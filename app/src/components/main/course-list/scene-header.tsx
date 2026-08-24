import { useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export interface SceneHeaderInterface {
	title: string;
	goBack?: () => void;
}

export function SceneHeader(props: SceneHeaderInterface) {
	const router = useRouter();

	const handleBack = () => {
		if (props.goBack) {
			props.goBack();
		} else {
			router.history.back();
		}
	};

	return (
		<div className="sticky top-0 z-10 items-center bg-[#f6f7f8]">
			<div className="flex h-[48px] justify-between">
				<div
					onClick={handleBack}
					className="flex h-[48px] w-[48px] cursor-pointer items-center justify-center hover:bg-gray-200 active:bg-gray-300"
				>
					<ChevronLeft />
				</div>
				<div className="flex items-center font-semibold text-[#383A3F] text-[17px]">
					{props.title}
				</div>
				<div className="w-[48px]" />
			</div>
		</div>
	);
}
