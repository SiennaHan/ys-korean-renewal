import { useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export const HeaderBackButton = () => {
	const router = useRouter();
	const goBack = () => {
		router.history.back();
	};

	return (
		<button
			type="button"
			onClick={goBack}
			className="flex h-full w-full cursor-pointer items-center justify-center hover:bg-gray-200 active:bg-gray-300"
		>
			<ChevronLeft />
		</button>
	);
};
