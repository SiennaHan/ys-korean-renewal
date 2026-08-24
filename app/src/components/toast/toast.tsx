import type React from "react";
import { useEffect } from "react";
import { useToastDispatch } from "./toast-context"; // useToastDispatch는 ToastContext.tsx에서 정의했다고 가정
import type { Toast as ToastType } from "./types";

interface ToastProps {
	toast: ToastType;
}

const Toast: React.FC<ToastProps> = ({ toast }) => {
	const dispatch = useToastDispatch();

	// 타입에 따른 스타일과 아이콘 설정
	const typeStyles = {
		success: "bg-green-400",
		error: "bg-red-400",
		info: "bg-gray-400",
		warning: "bg-yellow-400",
	};

	const removeToast = () => {
		dispatch({ type: "REMOVE_TOAST", payload: { id: toast.id } });
	};

	// duration 기반으로 자동 사라지기 로직은 useToast 훅에서 처리했습니다.

	return (
		<div
			className={`mb-3 flex w-full max-w-xs items-center justify-between rounded-lg p-4 text-white shadow-lg transition-opacity duration-300 ease-out ${typeStyles[toast.type]}
      `}
			role="alert"
		>
			<p className="flex-grow font-medium text-sm">{toast.message}</p>

			{/* 닫기 버튼 */}
			{/* <button
        onClick={removeToast}
        className="ml-4 -mr-1 p-1 rounded-full text-white/80 hover:text-white transition-colors"
        aria-label="Close"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button> */}
		</div>
	);
};

export default Toast;
