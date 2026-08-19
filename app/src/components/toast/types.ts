export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // Optional: 토스트가 사라지는 시간 (ms)
}

export type ToastAction = 
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: { id: string } };

export interface ToastContextType {
  toasts: Toast[];
  dispatch: React.Dispatch<ToastAction>;
}