/*
 * 두 갈래뿐이다 — 2026-08-28 에 기획자가 정했다(DESIGN.md 「정해야 할 물음」 11).
 *
 * 전에는 success·error·info·warning 넷이었는데 **셋은 한 번도 안 쓰였다.**
 * 호출부 10곳이 전부 type 을 안 넘겨 기본값 info(회색)로 떨어졌고, 그 10곳이
 * 전부 오류 문구였다 — 즉 **오류가 회색으로 뜨고 있었다.** 안 쓰이는 노랑은
 * 흰 글자와 대비 1.6:1 이라 떴으면 못 읽었을 것이다.
 *
 * 갈래를 늘리려면 먼저 그 갈래가 실제로 쓰이는 자리를 만들어라.
 */
export type ToastType = "error" | "info";

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration?: number; // Optional: 토스트가 사라지는 시간 (ms)
}

export type ToastAction =
	| { type: "ADD_TOAST"; payload: Toast }
	| { type: "REMOVE_TOAST"; payload: { id: string } };

export interface ToastContextType {
	toasts: Toast[];
	dispatch: React.Dispatch<ToastAction>;
}
