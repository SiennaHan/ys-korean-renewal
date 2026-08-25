import type React from "react";
import { useEffect, useRef } from "react";

// Dialog 컴포넌트 Props 타입 정의
interface DialogProps {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
}

/**
 * 가운데 뜨는 모달. 쓰는 곳은 둘이다 —
 * `learn/jamo/word-write.tsx` · `routes/book/chapter/unit/write2/$code.tsx`.
 *
 * 접근성으로 고친 것 (2026-08-24)
 *   · **Esc 로 닫힌다.** 전에는 바깥을 마우스로 누르는 것이 닫는 유일한 방법이라
 *     키보드만 쓰는 사람은 모달에 갇혔다.
 *   · **열릴 때 모달로 초점이 가고, 닫힐 때 원래 있던 곳으로 돌아온다.**
 *     전에는 초점이 뒤쪽 화면에 그대로 남아 있었다.
 *   · `role="dialog"`·`aria-modal` 을 **상자 쪽으로 옮겼다.** 전에는 화면을 덮는
 *     오버레이에 붙어 있어서, 어두운 배경까지 대화상자의 일부로 읽혔다.
 *
 * 아직 없는 것 — **초점 갇힘(focus trap)이 없다.** Tab 을 계속 누르면 초점이
 * 모달 밖 뒤쪽 화면으로 나간다. 그래서 `aria-modal="true"` 가 아직 정확한 말이
 * 아니다. 제대로 하려면 native `<dialog>` + `showModal()` 로 가는 것이 맞다 —
 * 브라우저가 갇힘·Esc·top layer 를 다 해 준다. 그것은 이 모달을 쓰는 두 화면을
 * 눈으로 확인할 수 있을 때 하는 것이 맞다(둘 다 로그인 뒤라 지금은 못 본다).
 * BLOCKERS.md 에 남겼다.
 */
const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, children }) => {
	const boxRef = useRef<HTMLDivElement>(null);

	// 열릴 때 초점을 모달로, 닫힐 때 원래 자리로 되돌린다
	useEffect(() => {
		if (!isOpen) return;
		const before = document.activeElement as HTMLElement | null;
		boxRef.current?.focus();
		return () => before?.focus?.();
	}, [isOpen]);

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
			onKeyDown={(e) => {
				if (e.key === "Escape") {
					e.stopPropagation();
					onClose();
				}
			}}
		>
			{/* 2. 모달 박스: 흰색 배경, 중앙에 위치 */}
			<div
				ref={boxRef}
				tabIndex={-1}
				// biome-ignore lint/a11y/useSemanticElements: native <dialog> 로 가려면 showModal() 을 부르는 구조 변경이 필요하다 — 위 주석의 "아직 없는 것" 참고
				role="dialog"
				aria-modal="true"
				className="max-w-sm rounded-[20px] border border-[#eef0f3] bg-white p-2 outline-none"
			>
				{children}
			</div>
		</div>
	);
};

export default Dialog;
