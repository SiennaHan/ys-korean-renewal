import React from 'react';

// 레슨 데이터의 타입을 정의하는 인터페이스
interface LessonData {
  lessonNumber: number; // 레슨 번호 (예: 1)
  title: string;        // 레슨 제목 (예: "Basics of geometry")
  progress: number;     // 진행률 (0-100)
  totalChapters: number;   // 총 카드 수 (예: 35)
  color?: string;       // 프로그레스 바 색상 (기본값: 'bg-purple-500')
}

// 컴포넌트의 props 타입을 정의
interface LessonProgressCardProps {
  lesson: LessonData;
}

const ProgressCard: React.FC<LessonProgressCardProps> = ({ lesson }) => {
  const { lessonNumber, title, progress, totalChapters, color = 'bg-purple-500' } = lesson;

  // 진행률을 0-100 범위로 제한
  const safeProgress = Math.min(Math.max(progress, 0), 100);
  const progressWidth = `${safeProgress}%`;

  return (
    <div className="px-[16px] py-[12px] rounded-[12px] bg-gray-100 mt-[12px]">
      {/* 상단 섹션: 레슨 번호와 제목 */}
      <div className="flex justify-between items-center">
        <h3 className="text-[16px] font-bold text-gray-800">
          Lessons#{lessonNumber}
        </h3>
        <span className="text-[18px] text-gray-600">
          {title}
        </span>
      </div>

      {/* 중간 섹션: 진행률과 총 카드 수 */}
      <div className="flex justify-between items-end mt-[10px]">
        <span className="text-[30px] text-gray-900 font-bold leading-[34px]">
          {safeProgress}%
        </span>
        <span className="text-[14px] text-gray-600">
          {totalChapters} chapters
        </span>
      </div>

      {/* 프로그레스 바 */}
      <div className="relative h-2 bg-white rounded-full mt-[5px]">
        <div
          className={`absolute top-0 left-0 h-full rounded-full ${color}`}
          style={{ width: progressWidth, transition: 'width 0.5s ease-in-out' }}
        />
      </div>
    </div>
  );
};

export default ProgressCard;