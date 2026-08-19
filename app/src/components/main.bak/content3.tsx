import LearningProgress from "./item/learning-progress";
import ProgressCard from "./item/progress-card";

export default function Content3() {
	const lesson = {
    lessonNumber: 1,
    title: '3주완성 연세한국어',
    progress: 25,
    totalChapters: 15,
    color: 'bg-blue-300', // 보라색을 조금 더 진하게 설정
  };
	
	const progressData = [
		{ name: '1과: 한글(1)', progress: 90, color: 'bg-[#4396F4]' },
		{ name: '3과: 한글(3)', progress: 75, color: 'bg-blue-400' },
		{ name: '10과: 불고기를 먹을까요?', progress: 45, color: 'bg-blue-300' },
		{ name: '15과: 한 개에 만원이에요', progress: 13, color: 'bg-blue-200' },
	];
	return <div className="h-full flex flex-col p-[20px]">
		<div className="w-full text-[16px] font-bold">Learning Note</div>

		{/* <ProgressCard lesson={lesson} />

		<LearningProgress progressData={progressData}/> */}

		<div className="flex flex-1 justify-center items-center mt-[18px] border-1 border-[#efefef] rounded-[10px] p-[10px] text-[12px] text-[#ccc]">
			no data
		</div>
	</div>
}