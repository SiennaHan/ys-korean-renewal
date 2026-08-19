import { chatBaseTextItem } from "@/components/chat/chat-text";
import { Check, ChevronUp } from "lucide-react";
import clsx from "clsx";
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
				className="w-full py-2 pl-4 pr-4 bg-[#0180FF] cursor-pointer text-left"
				onClick={() => setIsShowImage((prev) => !prev)}
			>
				<div
					className={clsx(
						chatBaseTextItem,
						"flex items-top justify-between",
					)}
				>
					<span className="text-base text-white font-semibold">
						{scenario}
					</span>
					<ChevronUp
						style={{
							transform: isShowImage
								? "rotate(180deg)"
								: "rotate(90deg)",
						}}
						color="#fff"
						strokeWidth={2}
						size={20}
					/>
				</div>
				<div className="text-xs text-[#A2D1FF]">{scenarioEng}</div>
				{isShowImage && (
					<div className="flex justify-center mt-[5px] mb-2">
						<img
							src={scenarioImgUrl}
							className="rounded-xl"
							alt={scenario}
						/>
					</div>
				)}
			</button>

			{/* Mission List Bar */}
			<div className="h-[50px] flex justify-between items-center px-4 bg-[#F9FAFC]">
				<div className="flex flex-row gap-5 items-center overflow-x-auto scrollbar-hide">
					{missionList.map((item) => {
						const isCompleted = completedList.includes(
							item.keyword,
						);
						return (
							<div key={item.id} className="flex items-center">
								<Check
									color={
										isCompleted ? "#11C378" : "#d0d0d0"
									}
									strokeWidth={3}
									size={12}
								/>
								<span
									className="ml-[3px] text-sm whitespace-nowrap"
									style={{
										color: isCompleted
											? "#11C378"
											: "#d0d0d0",
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
						"p-2 rounded-lg font-bold bg-[#DBEDFF] cursor-pointer active:opacity-90",
					)}
					onClick={() => setIsShowMissions((prev) => !prev)}
				>
					<div className="text-xs text-[#0073E6] whitespace-nowrap">
						{isShowMissions ? "미션 숨기기" : "미션 보기"}
					</div>
				</button>
			</div>

			{/* Mission Detail Panel */}
			{isShowMissions && (
				<div className="w-full flex flex-col gap-1 bg-[#F9FAFC] px-4 pb-4">
					<div className="bg-[#DBEDFF] p-3 rounded-b-xl rounded-tl-xl grid gap-2">
						{missionList.map((item) => (
							<div key={item.id} className="flex items-center">
								<div className="flex whitespace-nowrap justify-center text-sm text-[#0073E6] bg-white font-bold rounded-md px-2 py-1">
									{item.keyword}
								</div>
								<div className="ml-[7px] text-sm text-[#4B505A]">
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
