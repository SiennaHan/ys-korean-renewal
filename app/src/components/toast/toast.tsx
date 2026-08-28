import type React from "react";
import { useEffect } from "react";
import { useToastDispatch } from "./toast-context"; // useToastDispatch는 ToastContext.tsx에서 정의했다고 가정
import type { Toast as ToastType } from "./types";

interface ToastProps {
	toast: ToastType;
}

const Toast: React.FC<ToastProps> = ({ toast }) => {
	const dispatch = useToastDispatch();

	/*
	 * 색은 semantic 토큰에서 온다 — 전에는 Tailwind 기본 팔레트(bg-red-400 꼴)를
	 * 써서 브랜드 색이 바뀌어도 안 따라왔다. tokens.css 가 "화면 코드는 semantic
	 * 만 쓴다" 고 정해 둔 자리다.
	 */
	const typeStyles: Record<ToastType["type"], string> = {
		error: "bg-fill-wrong text-text-inverse",
		info: "bg-text-strong text-text-inverse",
	};

	const removeToast = () => {
		dispatch({ type: "REMOVE_TOAST", payload: { id: toast.id } });
	};

	// duration 기반으로 자동 사라지기 로직은 useToast 훅에서 처리했습니다.

	/*
	 * radius 12 는 정한 값이다(DESIGN.md 「정해야 할 물음」 2 — 버튼·선택지와 같은
	 * 눈금). 이 자리가 `rounded-lg` 였을 때는 10px 이었다 — globals.css 의
	 * `--radius:0.625rem` 이 만들던 8·10·14 눈금이고, 우리 눈금에 12 가 없었다.
	 * 그 계보는 2026-08-28 에 걷어냈다(물음 12).
	 */
	return (
		<div
			className={`mb-3 flex w-full max-w-xs items-center justify-between rounded-[12px] p-4 shadow-lg transition-opacity duration-300 ease-out ${typeStyles[toast.type]}`}
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
