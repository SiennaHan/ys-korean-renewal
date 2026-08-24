import type React from "react";

// Dialog 컴포넌트 Props 타입 정의
interface DialogProps {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, children }) => {
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
			className="fixed inset-2 z-50 flex items-center justify-center bg-[#0005] p-0"
			onClick={handleOverlayClick}
			role="dialog"
			aria-modal="true"
		>
			{/* 2. 모달 박스: 흰색 배경, 중앙에 위치 */}
			<div
				className="max-w-sm rounded-[20px] bg-white p-4 shadow-2xl"
				// onClick={(e) => e.stopPropagation()} // 단순화를 위해 주석 처리 (선택 사항)
			>
				{children}
			</div>
		</div>
	);
};

export default Dialog;
