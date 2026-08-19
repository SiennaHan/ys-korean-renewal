import { useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';

export const HeaderBackButton = () => {
	const router = useRouter();
	const goBack = () => {
		router.history.back();
	}

	return <div onClick={goBack} className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-gray-200 active:bg-gray-300">
		<ChevronLeft />
	</div>
}