import completeMissionAni from "@/assets/complete_mission_ani.json";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import Lottie from "react-lottie-player";

interface LottieEffectContextType {
	playCelebration: () => void;
	startCelebrationLoop: () => void;
	stopCelebrationLoop: () => void;
	isRunning: boolean;
	isLibLoaded: boolean;
}

const LottieEffectContext = createContext<LottieEffectContextType | undefined>(
	undefined,
);

export const useLottieEffect = () => {
	const context = useContext(LottieEffectContext);
	if (!context) {
		throw new Error(
			"useLottieEffect must be used within a LottieEffectProvider",
		);
	}
	return context;
};

export function LottieEffectProvider({
	children,
}: { children: React.ReactNode }) {
	const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isRunningRef = useRef(false);
	const [isMounted, setIsMounted] = useState(false);
	const [isRunning, setIsRunning] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const [animationKey, setAnimationKey] = useState(0);
	const singleShotDurationMs = useMemo(() => {
		const data = completeMissionAni as { fr?: number; op?: number };
		if (!data.fr || !data.op || data.fr <= 0) return 3200;
		return Math.ceil((data.op / data.fr) * 1000) + 300;
	}, []);

	useEffect(() => {
		isRunningRef.current = isRunning;
	}, [isRunning]);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		return () => {
			if (hideTimerRef.current) {
				clearTimeout(hideTimerRef.current);
			}
		};
	}, []);

	const clearHideTimer = useCallback(() => {
		if (hideTimerRef.current) {
			clearTimeout(hideTimerRef.current);
			hideTimerRef.current = null;
		}
	}, []);

	const playCelebration = useCallback(() => {
		clearHideTimer();
		setAnimationKey((prev) => prev + 1);
		setIsVisible(true);
		setIsRunning(false);

		hideTimerRef.current = setTimeout(() => {
			if (!isRunningRef.current) {
				setIsVisible(false);
			}
		}, singleShotDurationMs);
	}, [clearHideTimer, singleShotDurationMs]);

	const startCelebrationLoop = useCallback(() => {
		clearHideTimer();
		setAnimationKey((prev) => prev + 1);
		setIsVisible(true);
		setIsRunning(true);
	}, [clearHideTimer]);

	const stopCelebrationLoop = useCallback(() => {
		clearHideTimer();
		setIsRunning(false);
		setIsVisible(false);
	}, [clearHideTimer]);

	const overlayStyles: React.CSSProperties = {
		position: "fixed",
		pointerEvents: "none",
		width: "100%",
		height: "100%",
		top: 0,
		left: 0,
		zIndex: 10001,
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	};

	return (
		<LottieEffectContext.Provider
			value={{
				playCelebration,
				startCelebrationLoop,
				stopCelebrationLoop,
				isRunning,
				isLibLoaded: true,
			}}
		>
			{children}
			{isMounted && isVisible
				? createPortal(
						<div style={overlayStyles}>
							<Lottie
								key={animationKey}
								animationData={completeMissionAni}
								play
								loop={isRunning}
								onComplete={() => {
									if (!isRunningRef.current) {
										clearHideTimer();
										setIsVisible(false);
									}
								}}
								style={{ width: "min(72vw, 420px)", maxHeight: "72vh" }}
							/>
						</div>,
						document.body,
					)
				: null}
		</LottieEffectContext.Provider>
	);
}
