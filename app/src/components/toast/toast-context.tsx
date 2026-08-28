import type React from "react";
import { createContext, useCallback, useContext, useReducer } from "react";
import {
	type Toast,
	type ToastAction,
	ToastContextType,
	type ToastType,
} from "./types";

// 1. Context 생성
const ToastStateContext = createContext<Toast[]>([]);
const ToastDispatchContext = createContext<React.Dispatch<ToastAction>>(
	() => null,
);

// 2. Reducer 정의
const toastReducer = (state: Toast[], action: ToastAction): Toast[] => {
	switch (action.type) {
		case "ADD_TOAST":
			return [...state, action.payload];
		case "REMOVE_TOAST":
			return state.filter((toast) => toast.id !== action.payload.id);
		default:
			return state;
	}
};

// 3. Provider 컴포넌트
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [toasts, dispatch] = useReducer(toastReducer, []);

	return (
		<ToastStateContext.Provider value={toasts}>
			<ToastDispatchContext.Provider value={dispatch}>
				{children}
			</ToastDispatchContext.Provider>
		</ToastStateContext.Provider>
	);
};

// 4. Custom Hook: 토스트 상태 가져오기
export const useToastState = () => useContext(ToastStateContext);

// 5. Custom Hook: 토스트 dispatch 함수 가져오기
export const useToastDispatch = () => useContext(ToastDispatchContext);

/*
 * id 는 세는 수다 — `Date.now()` 가 아니다.
 *
 * 전에는 `Date.now().toString()` 이었는데, **같은 밀리초에 두 개를 띄우면 id 가
 * 겹쳤다.** React 가 "two children with the same key" 를 뱉고, 더 나쁘게는 먼저
 * 걸린 `setTimeout` 이 id 로 지우기 때문에 **둘이 같이 사라졌다.**
 *
 * 2026-08-28 에 콘솔을 열어 보고 찾았다 — 게이트 넷은 전부 통과하고 있었다.
 * 목업이 없어 `parity` 가 이 컴포넌트를 안 보고, 나머지 셋은 실행 시점을 안 본다.
 */
let toastSeq = 0;

// 6. Custom Hook: 토스트를 쉽게 추가하는 함수
export const useToast = () => {
	const dispatch = useToastDispatch();

	// 토스트 추가 함수
	const addToast = useCallback(
		(message: string, type: ToastType = "info", duration = 1000) => {
			const id = String(++toastSeq);
			dispatch({
				type: "ADD_TOAST",
				payload: { id, message, type, duration },
			});

			// duration 후 토스트 제거
			setTimeout(() => {
				dispatch({ type: "REMOVE_TOAST", payload: { id } });
			}, duration);
		},
		[dispatch],
	);

	return { addToast };
};
