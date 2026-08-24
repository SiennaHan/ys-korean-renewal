import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

type MicPermissionApi = {
	hasPermission: boolean;
	requestPermission: () => Promise<boolean>;
};

const MicPermissionContext = createContext<MicPermissionApi | null>(null);

export function MicPermissionProvider({
	children,
}: { children: React.ReactNode }) {
	const [hasPermission, setHasPermission] = useState(false);

	const requestPermission = useCallback(async () => {
		if (hasPermission) return true;
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			stream.getTracks().forEach((track) => track.stop());
			setHasPermission(true);
			return true;
		} catch (err) {
			setHasPermission(false);
			return false;
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
