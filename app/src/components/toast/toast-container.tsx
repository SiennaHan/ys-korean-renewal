import type React from "react";
import Toast from "./toast";
import { useToastState } from "./toast-context";

const ToastContainer: React.FC = () => {
	const toasts = useToastState();

	return (
		<div className="-translate-x-1/2 pointer-events-none absolute bottom-20 left-1/2 z-50 items-center">
			{toasts.map((toast) => (
				// pointer-events-auto를 사용하여 토스트 내부 요소(닫기 버튼)에 상호작용 가능하게 만듦
				<div key={toast.id} className="pointer-events-auto">
					<Toast toast={toast} />
				</div>
			))}
		</div>
	);
};

export default ToastContainer;
