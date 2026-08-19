
import clsx from "clsx";
import { SceneInterface } from "../content2";

const buttonBase = "h-[124px] grid grid-cols-2 rounded-[12px] cursor-pointer pointer-events-auto hover:opacity-[0.8] active:opacity-[0.9] bg-white"

export default function Practice (props: SceneInterface) {
	const goJamoList = () => {
		props.setScene('jamo');
	}

	const goMissionChat = () => {
		props.setScene('missionchat');
	}

	const goFlashCard = () => {
		props.setScene('flashcard');
	}
	
	return <div className="grid grid-cols-1 gap-[16px]">
		<div onClick={goJamoList} className={clsx(buttonBase, "")}>
			<div className="py-[16px] px-[20px]">
				<div className="text-[16px] font-bold text-[#383A3F]">한글 자모 익히기</div>
				<div className="text-[12px] font-semibold text-[#adb3be]">Learn Hangul Letters</div>
			</div>
			<div className="flex justify-center items-center">
				<object  data="/images/jamo_img.svg"  type="image/svg+xml"  className="pointer-events-none">
					<img src="/images/jamo_img.svg" className="" />
				</object>
			</div>
		</div>
		<div onClick={goMissionChat} className={clsx(buttonBase, "")}>
			<div className="py-[16px] px-[20px]">
				<div className="text-[16px] font-bold text-[#383A3F]">AI 미션 대화</div>
				<div className="text-[12px] font-semibold text-[#8F8F8F]">AI Mission Chat</div>
			</div>
			<div className="flex justify-center items-center">
				<object  data="/images/chat_img.svg"  type="image/svg+xml"  className="pointer-events-none">
					<img src="/images/chat_img.svg" className="" />
				</object>
			</div>
		</div>
		<div onClick={goFlashCard} className={clsx(buttonBase, "")}>
			<div className="py-[16px] px-[20px]">
				<div className="text-[16px] font-bold text-[#383A3F]">단어 플래시카드</div>
				<div className="text-[12px] font-semibold text-[#8F8F8F]">Flashcard</div>
			</div>
			<div className="flex justify-center items-center">
				<object  data="/images/flashcard_img.svg"  type="image/svg+xml"  className="pointer-events-none">
					<img src="/images/flashcard_img.svg" className="" />
				</object>
			</div>
		</div>
	</div>
}
