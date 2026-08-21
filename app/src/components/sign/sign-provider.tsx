import {
	getAccessToken,
	getGuestId,
	removeAccessToken,
	removeGuestId,
} from "@/api/api";
import type { LoginToken } from "@/api/apiType";
import { checkSign, loginAsStudent, migrateGuestData } from "@/api/sign";
import type React from "react";
import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

interface UserInfo {
	id: number;
	email: string;
	name: string;
	role: string;
	schoolCode: string | null;
}

interface AuthContextType {
	isSignedIn: boolean;
	isLoading: boolean;
	isLoggedInUser: boolean;
	user: UserInfo | null;
	checkSign: () => Promise<boolean>;
	guestSign: () => Promise<boolean>;
	login: (
		email: string,
		password: string,
	) => Promise<{ success: boolean; error?: string }>;
	signOut: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(
	undefined,
);

interface AuthProviderProps {
	children: ReactNode;
}

/*
 * 이 값이 깨져 있으면 앱이 부팅에서 죽는다 — 최상위 Provider 의 초기 상태라
 * 던지면 화면이 아무것도 안 뜬다. 실제로 문자열 "undefined" 가 저장돼서
 * JSON.parse 가 던졌고, 저장소를 직접 비우지 않으면 되돌릴 길이 없었다.
 * 그래서 못 읽으면 지우고 게스트로 떨어뜨린다.
 */
function readStoredUser(): UserInfo | null {
	const raw = localStorage.getItem("koreanUser");
	if (!raw || raw === "undefined" || raw === "null") {
		if (raw !== null) localStorage.removeItem("koreanUser");
		return null;
	}
	try {
		return JSON.parse(raw) as UserInfo;
	} catch {
		localStorage.removeItem("koreanUser");
		return null;
	}
}

export const SignProvider: React.FC<AuthProviderProps> = ({ children }) => {
	const initialSignedIn = !!getAccessToken();
	const [isSignedIn, setIsSignedIn] = useState<boolean>(initialSignedIn);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [user, setUser] = useState<UserInfo | null>(() => readStoredUser());

	const isLoggedInUser = user !== null;

	const handleCheckSign = useCallback(async (): Promise<boolean> => {
		setIsLoading(true);

		const hasToken = !!getAccessToken();
		setIsSignedIn(hasToken);
		setIsLoading(false);
		return hasToken;
	}, []);

	// 게스트로 시작하기 (명시적 호출 시에만 게스트 토큰 생성)
	const handleGuestSign = useCallback(async (): Promise<boolean> => {
		setIsLoading(true);
		const response = await checkSign();
		setIsSignedIn(response ?? false);
		setIsLoading(false);
		return response ?? false;
	}, []);

	const handleLogin = async (
		email: string,
		password: string,
	): Promise<{ success: boolean; error?: string }> => {
		const guestId = getGuestId();
		const result = await loginAsStudent(email, password);

		if (result.success && result.user) {
			setUser(result.user);
			setIsSignedIn(true);

			// 게스트 데이터가 있으면 마이그레이션 시도
			if (guestId && guestId !== "undefined") {
				await migrateGuestData(guestId);
				removeGuestId();
			}

			return { success: true };
		}

		return { success: false, error: result.error };
	};

	const signOut = useCallback(() => {
		removeAccessToken();
		removeGuestId();
		localStorage.removeItem("koreanUser");
		setUser(null);
		setIsSignedIn(false);
	}, []);

	// 초기 마운트 시에만 인증 상태 확인 (로그인/로그아웃은 직접 상태를 관리)
	useEffect(() => {
		handleCheckSign().then(() => {
			/* 초기 로딩 완료 */
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const value = {
		isSignedIn,
		isLoading,
		isLoggedInUser,
		user,
		checkSign: handleCheckSign,
		guestSign: handleGuestSign,
		login: handleLogin,
		signOut,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};
