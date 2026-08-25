import { chatBaseTextItem } from "@/components/chat/chat-text";
import clsx from "clsx";
import { Check, ChevronUp } from "lucide-react";
import { useState } from "react";

interface DialogKeywordItem {
	id: number | string;
	keyword: string;
	content?: string;
	dialog_id: string;
}

interface DialogScenarioProps {
	scenario: string;
	scenarioEng: string;
	scenarioImgUrl: string;
	missionList: DialogKeywordItem[];
	completedList: string[];
}

export function DialogScenario({
	scenario,
	scenarioEng,
	scenarioImgUrl,
	missionList,
	completedList,
}: DialogScenarioProps) {
	const [isShowImage, setIsShowImage] = useState(false);
	const [isShowMissions, setIsShowMissions] = useState(false);

	return (
		<>
			{/* Scenario Header */}
			<button
				type="button"
				className="w-full cursor-pointer bg-[#0180FF] py-2 pr-4 pl-4 text-left"
				onClick={() => setIsShowImage((prev) => !prev)}
			>
				<div className={clsx(chatBaseTextItem, "flex justify-between")}>
					<span className="font-semibold text-base text-white">{scenario}</span>
					<ChevronUp
						style={{
							transform: isShowImage ? "rotate(180deg)" : "rotate(90deg)",
						}}
						color="#fff"
						strokeWidth={2}
						size={20}
					/>
				</div>
				<div className="text-[#A2D1FF] text-xs">{scenarioEng}</div>
				{isShowImage && (
					<div className="mt-[5px] mb-2 flex justify-center">
						<img src={scenarioImgUrl} className="rounded-xl" alt={scenario} />
					</div>
				)}
			</button>

			{/* Mission List Bar */}
			<div className="flex h-[50px] items-center justify-between bg-[#F9FAFC] px-4">
				<div className="scrollbar-hide flex flex-row items-center gap-5 overflow-x-auto">
					{missionList.map((item) => {
						const isCompleted = completedList.includes(item.keyword);
						return (
							<div key={item.id} className="flex items-center">
								<Check
									color={isCompleted ? "#11C378" : "#d0d0d0"}
									strokeWidth={3}
									size={12}
								/>
								<span
									className="ml-[3px] whitespace-nowrap text-sm"
									style={{
										color: isCompleted ? "#11C378" : "#d0d0d0",
									}}
								>
									{item.keyword}
								</span>
							</div>
						);
					})}
				</div>
				<button
					type="button"
					className={clsx(
						chatBaseTextItem,
						"cursor-pointer rounded-lg bg-[#DBEDFF] p-2 font-bold active:opacity-90",
					)}
					onClick={() => setIsShowMissions((prev) => !prev)}
				>
					<div className="whitespace-nowrap text-[#0073E6] text-xs">
						{isShowMissions ? "미션 숨기기" : "미션 보기"}
					</div>
				</button>
			</div>

			{/* Mission Detail Panel */}
			{isShowMissions && (
				<div className="flex w-full flex-col gap-1 bg-[#F9FAFC] px-4 pb-4">
					<div className="grid gap-2 rounded-b-xl rounded-tl-xl bg-[#DBEDFF] p-3">
						{missionList.map((item) => (
							<div key={item.id} className="flex items-center">
								<div className="flex justify-center whitespace-nowrap rounded-md bg-white px-2 py-1 font-bold text-[#0073E6] text-sm">
									{item.keyword}
								</div>
								<div className="ml-[7px] text-[#4B505A] text-sm">
									{item.content}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</>
	);
}
