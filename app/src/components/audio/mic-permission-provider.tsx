import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

/**
 * 마이크를 못 쓰는 이유. **`false` 하나로는 안내를 고를 수 없다.**
 *
 * `denied` 는 브라우저가 이 사이트를 막은 것이고 사용자가 설정에서 풀 수 있다 —
 * 그때 「켜는 방법」 네 단계가 맞는 말이다. `unavailable` 은 마이크 자체가
 * 없거나 다른 앱이 쥔 것이라 **그 안내가 거짓이 된다.** 2026-09-10 까지
 * `catch (err)` 가 `err.name` 을 버려서 둘을 가를 수가 없었다.
 */
export type MicPermissionResult = "granted" | "denied" | "unavailable";

type MicPermissionApi = {
	hasPermission: boolean;
	requestPermission: () => Promise<MicPermissionResult>;
};

const MicPermissionContext = createContext<MicPermissionApi | null>(null);

export function MicPermissionProvider({
	children,
}: { children: React.ReactNode }) {
	const [hasPermission, setHasPermission] = useState(false);

	const requestPermission = useCallback(async (): Promise<MicPermissionResult> => {
		if (hasPermission) return "granted";
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			stream.getTracks().forEach((track) => track.stop());
			setHasPermission(true);
			return "granted";
		} catch (err) {
			setHasPermission(false);
			/*
			 * **이름을 보고 가른다.** 브라우저가 막은 것은 `NotAllowedError` 이고
			 * (Safari 는 권한 거부에 `SecurityError` 를 내기도 한다), 마이크가
			 * 없거나 다른 앱이 쥐고 있으면 `NotFoundError`·`NotReadableError` 다.
			 * 이름이 없거나 모르는 것이면 **막힌 것으로 단정하지 않는다** —
			 * 「켜는 방법」을 잘못 띄우면 사용자가 있지도 않은 설정을 찾는다.
			 */
			const name = err instanceof Error ? err.name : "";
			return name === "NotAllowedError" || name === "SecurityError"
				? "denied"
				: "unavailable";
		}
	}, [hasPermission]);

	const api = useMemo<MicPermissionApi>(
		() => ({ hasPermission, requestPermission }),
		[hasPermission, requestPermission],
	);

	return (
		<MicPermissionContext.Provider value={api}>
			{children}
		</MicPermissionContext.Provider>
	);
}

export function useMicPermission() {
	const ctx = useContext(MicPermissionContext);
	if (!ctx)
		throw new Error(
			"useMicPermission must be used within MicPermissionProvider",
		);
	return ctx;
}
