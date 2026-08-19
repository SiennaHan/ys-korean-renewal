import React from 'react';

// Dialog 컴포넌트 Props 타입 정의
interface DialogProps {
  videoId: string | undefined;
  isOpen: boolean;
  onClose: () => void;
}

const DialogYoutube: React.FC<DialogProps> = ({ isOpen, onClose, videoId }) => {
  // isOpen이 false면 아무것도 렌더링하지 않습니다.
  if (!isOpen) return null;

  // 오버레이 클릭 핸들러
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 클릭된 요소가 모달 박스(자식 요소)가 아닌 오버레이 자체일 때만 닫습니다.
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    // 1. 오버레이: 고정(fixed)으로 전체 화면을 덮습니다. 배경은 투명합니다.
    <div
      className="fixed inset-2 z-50 flex items-center justify-center p-0 bg-[#0005]"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      {/* 2. 모달 박스: 흰색 배경, 중앙에 위치 */}
      <div
        className="relative"
        // onClick={(e) => e.stopPropagation()} // 단순화를 위해 주석 처리 (선택 사항)
      >
        <iframe
          src={"https://www.youtube.com/embed/" + videoId}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen={true}
          className='h-full'
        ></iframe>
      </div>
    </div>
  );
};

export default DialogYoutube;