import {
	SESSION_CLEARED_EVENT,
	getAccessToken,
	getGuestId,
	removeAccessToken,
	removeGuestId,
} from "@/api/api";
import type { LoginToken } from "@/api/apiType";
import { signUpWithCode } from "@/api/join-code";
import {
	checkSign,
	loginAsStudent,
	migrateGuestData,
	signUpStudent,
} from "@/api/sign";
import { clearAll as clearContentCache } from "@/shared/content/cache";
import { useEntitlementStore } from "@/shared/store/entitlement-store";
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
	/** 학생 자체 회원가입 — access_and_pricing_v1 §09 의 4단계 */
	signUp: (
		email: string,
		password: string,
		name: string,
		code?: string,
	) => Promise<{ success: boolean; error?: string }>;
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
		/*
		 * **권한을 다시 받는다 — 로그인·가입과 같은 이유다.**
		 *
		 * 게스트 토큰은 방금 여기서 생겼다. 그 전에 `/entitlement` 를 부른 적이
		 * 있으면(앱 셸의 미리받기가 앱을 열자마자 한 번 부른다) 토큰이 없어 401 이
		 * 나고, 스토어는 `asked=true · entitlement=null` 로 굳는다. `load()` 는
		 * `asked` 로 조기 반환하므로 **그 뒤로 게스트는 권한을 영영 못 받는다** —
		 * 잠금이 아예 안 그려지고 무료 범위 미리받기도 안 돈다(2026-08-31 실측).
		 *
		 * 세 자리(로그인 · 가입 · 로그아웃)에만 있던 것이 빠져 있던 자리다.
		 */
		await useEntitlementStore.getState().reload();
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

			/*
			 * **권한을 다시 받는다.** 스토어는 한 번 받으면 다시 안 받는다
			 * (`load()` 가 `asked` 로 조기 반환한다). 로그인은 SPA 이동이라
			 * 새로고침이 없으므로, 이걸 안 부르면 **게스트로 둘러보다 로그인한
			 * 사람이 게스트 잠금을 그대로 본다.**
			 *
			 * `entitlement-store.ts` 의 주석은 "api.ts 의 세션 정리 이벤트에서
			 * 부른다" 고 적어 뒀지만 **부르는 곳이 한 곳도 없었다**(2026-08-28 실측).
			 * 세션이 바뀌는 자리는 여기이므로 여기서 부른다.
			 */
			await useEntitlementStore.getState().reload();

			return { success: true };
		}

		return { success: false, error: result.error };
	};

	/**
	 * 가입 — 로그인과 **같은 뒷정리**를 한다.
	 *
	 * 처음에는 화면에서 `signUpStudent` 를 직접 부르고 `checkSign()` 만 했는데,
	 * 그러면 둘이 빠진다. `handleCheckSign` 은 토큰만 읽으므로 `user` 가 null 로
	 * 남아 **가입 직후 인사말이 이름 대신 "반갑습니다"** 였고, 게스트 id 도
	 * 지워지지 않았다. 로그인이 이미 그 둘을 하고 있으니 같은 자리에 둔다.
	 *
	 * 게스트 기록 이전은 **서버가 가입과 한 번에 한다**(`user_business.signUpStudent`
	 * 가 guestId 를 받는다) — 로그인처럼 따로 부르지 않는다. 계정이 생긴 뒤
	 * 별도 호출이 실패하면 "가입은 됐는데 기록은 안 옮겨진" 상태가 남는다.
	 */
	const handleSignUp = async (
		email: string,
		password: string,
		name: string,
		code?: string,
	): Promise<{ success: boolean; error?: string }> => {
		/*
		 * 기관 발급 코드가 있으면 다른 라우트로 간다 — 그쪽은 코드가 가리키는
		 * 학교를 계정에 박는다. **여기서 갈라 두는 이유는 뒷정리 때문이다.**
		 * 화면이 `signUpWithCode` 를 직접 부르면 위 주석이 말하는 둘(user 설정 ·
		 * 게스트 id 정리)이 또 빠진다.
		 */
		const result = code
			? await signUpWithCode(code, email, password, name)
			: await signUpStudent(email, password, name);
		if (!result.success || !result.user) {
			return { success: false, error: result.error };
		}
		setUser(result.user);
		setIsSignedIn(true);
		removeGuestId();
		/* 로그인과 같은 이유 — 가입도 권한의 출처를 바꾼다(기관 코드면 school 이 된다) */
		await useEntitlementStore.getState().reload();
		return { success: true };
	};

	const signOut = useCallback(() => {
		removeAccessToken();
		removeGuestId();
		localStorage.removeItem("koreanUser");
		/*
		 * 받아 둔 교재 본문도 같이 버린다(PD-03).
		 *
		 * 권한 도장(`cache.ts` 의 syncStamp)만으로는 부족하다. 도장은 **다음에
		 * 콘텐츠를 읽을 때** 맞춰 보는 것이라, 나간 뒤 서버에 못 닿으면 옛 도장이
		 * 그대로 남아 유료 과가 이 기기에 계속 산다. 나가는 것은 기기 안에서
		 * 끝나는 일이니 여기서 확실히 지운다.
		 */
		clearContentCache();
		setUser(null);
		setIsSignedIn(false);
		/* 나가는 쪽도 마찬가지다 — 안 버리면 다음 사람이 남의 권한을 본다 */
		void useEntitlementStore.getState().reload();
	}, []);

	/*
	 * 서버가 세션을 거절하면(401·403) api.ts 가 저장소를 정리하고 알린다.
	 * 여기서 상태를 내려야 라우트 가드(main.tsx)가 돌아 로그인으로 간다 —
	 * 저장소만 지우면 이 상태가 그대로 남아 앱이 로그인된 줄로 믿는다.
	 *
	 * signOut 을 그대로 쓰지 않는 이유는 guestId 다. signOut 은 그것까지 지우는데,
	 * 게스트 토큰이 만료돼 여기 온 경우 guestId 를 지우면 서버에 쌓인 그 사람의
	 * 기록을 나중에 계정으로 옮길 길이 끊긴다.
	 *
	 * 같은 이유로 **콘텐츠 캐시도 여기서는 안 지운다.** 나간 것이 아니라 토큰만
	 * 잃은 것이라 그 캐시는 여전히 같은 사람 것이다. 권한이 실제로 줄었으면
	 * 도장(`cache.ts` 의 syncStamp)이 다음 읽기에서 버린다.
	 */
	useEffect(() => {
		const onCleared = () => {
			setUser(null);
			setIsSignedIn(false);
		};
		window.addEventListener(SESSION_CLEARED_EVENT, onCleared);
		return () => window.removeEventListener(SESSION_CLEARED_EVENT, onCleared);
	}, []);

	// 초기 마운트 시에만 인증 상태 확인 (로그인/로그아웃은 직접 상태를 관리).
	// handleCheckSign 은 useCallback(…, []) 으로 안정하니 의존성에 넣어도
	// 마운트 1회 그대로다 — 그래서 옛 eslint 주석을 걷고 그냥 넣었다.
	useEffect(() => {
		handleCheckSign().then(() => {
			/* 초기 로딩 완료 */
		});
	}, [handleCheckSign]);

	const value = {
		isSignedIn,
		isLoading,
		isLoggedInUser,
		user,
		checkSign: handleCheckSign,
		signUp: handleSignUp,
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
