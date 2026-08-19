import React from 'react';

// ProgressItem의 데이터 구조를 정의하는 타입
interface ProgressItem {
  name: string;
  progress: number; // 0에서 100 사이의 값
  color: string;    // Tailwind CSS 색상 클래스 (예: 'bg-pink-500')
}

// 컴포넌트의 props 타입을 정의
interface LearningProgressProps {
  progressData: ProgressItem[];
}

// 개별 프로그레스 바를 렌더링하는 서브 컴포넌트
const ProgressRow: React.FC<ProgressItem> = ({ name, progress, color }) => {
  // 진행률을 100% 기준으로 제한
  const safeProgress = Math.min(Math.max(progress, 0), 100);
  const progressWidth = `${safeProgress}%`;

  return (
    <div className="p-[12px] rounded-[10px] shadow-[0px_2px_10px_rgba(0,0,0,0.1)]">
      <div className="text-[14px]">{name}</div>
      <div className="relative mt-[5px]">
        <div
          className={`absolute top-0 left-0 h-full rounded-full ${color}`}
          style={{ width: progressWidth, transition: 'width 0.5s ease-in-out' }}
        />
				<div className="h-2 bg-gray-200 rounded-full"></div>
			</div>
			<div className="w-full relative">
        <div className="flex justify-between text-[12px] text-gray-500">
          <span className="font-medium text-gray-200">0</span>
          <span className="font-medium text-gray-200">100</span>
        </div>
				<div className={`absolute top-0 left-[${safeProgress-4}%] text-[12px] font-medium font-bold`}>{safeProgress}%</div>
      </div>
    </div>
  );
};

// 메인 컴포넌트
const LearningProgress: React.FC<LearningProgressProps> = ({ progressData }) => {
  return (
    <div className="w-full mt-[18px] bg-white">
      {/* 제목 */}
      <h2 className="text-[14px] font-bold">
        학습 현황
      </h2>
      
      <div className="grid gap-2 mt-[8px]">
        {progressData.map((item, index) => (
          <div key={item.name} className={``}>
            <ProgressRow {...item} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LearningProgress;