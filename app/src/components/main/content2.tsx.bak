
import Practice from "./item/practice";
import Jamo from "./course-list/jamo";
import MissionChat from "./course-list/mission-chat";
import Flashcard from "./course-list/flashcard";
import { Tab2SceneType, useTab2SceneStore } from "@/shared/store/menu-store";


export interface SceneInterface {
	setScene: (scene: Tab2SceneType) => void;
}

export default function Content2() {

	const bookId = 1;

	const {scene, setScene} = useTab2SceneStore();

	const goBack = () => {
		setScene('main');
	}

	const MainScene = () => {
		return <div className="h-full flex flex-col px-[16px]">
			<div className="h-[48px] text-[20px] font-bold py-[8px]">과정목록</div>
			<div className="">
				<div className="h-[40px] text-[16px] font-semibold py-[8px]">Practice</div>
				<Practice setScene={setScene}/>
				<div className="text-[16px] font-bold mt-[18px]">Game</div>
				<div className="h-[60px] flex justify-center items-center mt-[8px] bg-[#dbedff] rounded-[8px] text-[14px] text-[#3578EC] font-bold">
					COMING SOON
				</div>
			</div>
		</div>
	}

	return <div>
		{scene === 'main' && <MainScene />}
		{scene === 'jamo' && <Jamo goBack={goBack} />}
		{scene === 'missionchat' && <MissionChat goBack={goBack} />}
		{scene === 'flashcard' && <Flashcard goBack={goBack} />}
	</div>
}		