import React, { createContext, useReducer, useContext, useCallback } from 'react';
import { Toast, ToastAction, ToastContextType, ToastType } from './types';

// 1. Context 생성
const ToastStateContext = createContext<Toast[]>([]);
const ToastDispatchContext = createContext<React.Dispatch<ToastAction>>(() => null);

// 2. Reducer 정의
const toastReducer = (state: Toast[], action: ToastAction): Toast[] => {
  switch (action.type) {
    case 'ADD_TOAST':
      return [...state, action.payload];
    case 'REMOVE_TOAST':
      return state.filter(toast => toast.id !== action.payload.id);
    default:
      return state;
  }
};

// 3. Provider 컴포넌트
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

// 6. Custom Hook: 토스트를 쉽게 추가하는 함수
export const useToast = () => {
  const dispatch = useToastDispatch();

  // 토스트 추가 함수
  const addToast = useCallback((message: string, type: ToastType = 'info', duration: number = 1000) => {
    const id = Date.now().toString(); // 고유 ID 생성
    dispatch({ 
      type: 'ADD_TOAST', 
      payload: { id, message, type, duration } 
    });

    // duration 후 토스트 제거
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', payload: { id } });
    }, duration);
  }, [dispatch]);

  return { addToast };
};