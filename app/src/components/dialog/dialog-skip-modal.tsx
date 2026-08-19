import clsx from "clsx";

const skipButtonWhite =
	"h-8 w-1/2 text-base font-bold rounded-full cursor-pointer hover:bg-gray-100 active:bg-gray-200";
const skipButtonBlue =
	"h-8 w-1/2 text-base font-bold rounded-full cursor-pointer hover:bg-blue-400 active:bg-blue-500";

interface DialogSkipModalProps {
	onClose: () => void;
	onGoReport: () => void;
}

export function DialogSkipModal({
	onClose,
	onGoReport,
}: DialogSkipModalProps) {
	return (
		<div className="absolute bottom-0 top-0 w-full h-full flex items-end bg-black/30">
			<div className="w-full bg-white rounded-t-[10px] py-[23px] px-[25px] mt-auto z-20">
				<div className="text-base font-bold leading-[130%]">
					미션을 끝까지 해보세요!
					<br />
					더 좋은 점수를 받을 수 있어요!
				</div>
				<div className="text-[11px] text-[#8d8d8d] mt-[10px] leading-[130%]">
					Try to finish all the missions.
					<br />
					You can get a better score!
				</div>
				<div className="flex justify-between mt-5 gap-2">
					<button
						type="button"
						onClick={onGoReport}
						className={clsx(
							skipButtonWhite,
							"bg-white text-[#4396F4]",
						)}
					>
						끝내기
					</button>
					<button
						type="button"
						onClick={onClose}
						className={clsx(
							skipButtonBlue,
							"bg-[#4396F4] text-white",
						)}
					>
						계속하기
					</button>
				</div>
			</div>
		</div>
	);
}
