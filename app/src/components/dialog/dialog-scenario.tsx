import { IconDown, IconUp } from "@/components/main/activity";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
	const { t } = useTranslation();
	const [isShowImage, setIsShowImage] = useState(false);
	const [isShowMissions, setIsShowMissions] = useState(false);

	return (
		<>
			<section className={`scenario ${isShowImage ? "expanded" : ""}`}>
				<div className="scenario-copy">
					<div className="ko">{scenario}</div>
					<div className="en">{scenarioEng}</div>
					{isShowImage && (
						<img className="scenario-image" src={scenarioImgUrl} alt="" />
					)}
				</div>
				<button
					type="button"
					className="fold"
					aria-label={
						isShowImage
							? t("missionChat.hideImage")
							: t("missionChat.showImage")
					}
					onClick={() => setIsShowImage((prev) => !prev)}
				>
					{isShowImage ? <IconUp /> : <IconDown />}
				</button>
			</section>

			{/* Mission List Bar */}
			<div className="missions">
				<button
					type="button"
					className={`mission-title ${isShowMissions ? "on" : ""}`}
					onClick={() => setIsShowMissions((prev) => !prev)}
				>
					{isShowMissions
						? t("missionChat.hideMissions")
						: t("missionChat.showMissions")}
				</button>
				<div className="mission-list">
					{missionList.map((item) => {
						const isCompleted = completedList.includes(item.keyword);
						return (
							<span
								key={item.id}
								className={`mission ${isCompleted ? "done" : ""}`}
							>
								{isCompleted ? "✓" : "○"} {item.keyword}
							</span>
						);
					})}
				</div>
			</div>

			{/* Mission Detail Panel */}
			{isShowMissions && (
				<div className="mission-panel">
					<div className="mission-panel-list">
						{missionList.map((item) => (
							<div key={item.id} className="mission-detail">
								<b>{item.keyword}</b>
								<span>{item.content}</span>
							</div>
						))}
					</div>
				</div>
			)}
		</>
	);
}
