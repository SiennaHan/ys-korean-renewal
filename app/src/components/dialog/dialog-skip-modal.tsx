import clsx from "clsx";

const skipButtonWhite =
	"h-8 w-1/2 text-base font-bold rounded-full cursor-pointer hover:bg-gray-100 active:bg-gray-200";
const skipButtonBlue =
	"h-8 w-1/2 text-base font-bold rounded-full cursor-pointer hover:bg-blue-400 active:bg-blue-500";

interface DialogSkipModalProps {
	onClose: () => void;
	onGoReport: () => void;
}

export function DialogSkipModal({ onClose, onGoReport }: DialogSkipModalProps) {
	return (
		<div className="absolute top-0 bottom-0 flex h-full w-full items-end bg-black/30">
			<div className="z-20 mt-auto w-full rounded-t-[10px] bg-white px-[25px] py-[23px]">
				<div className="font-bold text-base leading-[130%]">
					미션을 끝까지 해보세요!
					<br />더 좋은 점수를 받을 수 있어요!
				</div>
				<div className="mt-[10px] text-[#8d8d8d] text-[11px] leading-[130%]">
					Try to finish all the missions.
					<br />
					You can get a better score!
				</div>
				<div className="mt-5 flex justify-between gap-2">
					<button
						type="button"
						onClick={onGoReport}
						className={clsx(skipButtonWhite, "bg-white text-[#4396F4]")}
					>
						끝내기
					</button>
					<button
						type="button"
						onClick={onClose}
						className={clsx(skipButtonBlue, "bg-[#4396F4] text-white")}
					>
						계속하기
					</button>
				</div>
			</div>
		</div>
	);
}
