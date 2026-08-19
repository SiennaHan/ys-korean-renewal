import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { createPortal } from "react-dom";

interface ConfettiContextType {
	fireBigBang: () => void;
	firePop: (opts?: any) => void;
	startFireworks: () => void;
	stopFireworks: () => void;
	isRunning: boolean;
	isLibLoaded: boolean;
}

const ConfettiContext = createContext<ConfettiContextType | undefined>(undefined);

export const useConfetti = () => {
	const context = useContext(ConfettiContext);
	if (!context) {
		throw new Error("useConfetti must be used within a ConfettiProvider");
	}
	return context;
};

export function ConfettiProvider({ children }: { children: React.ReactNode }) {
	const refAnimationInstance = useRef<any>(null);
	const refCanvas = useRef<HTMLCanvasElement>(null);
	const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
	const [isMounted, setIsMounted] = useState(false);
	const [isRunning, setIsRunning] = useState(false);
	const [isLibLoaded] = useState(true);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		if (isMounted && refCanvas.current && !refAnimationInstance.current) {
			refAnimationInstance.current = confetti.create(refCanvas.current, {
				resize: true,
				useWorker: true,
			});
		}
	}, [isMounted]);

	const makeShot = useCallback((opts: any) => {
		if (refAnimationInstance.current) {
			refAnimationInstance.current({
				...opts,
				origin: { y: 0.8, ...opts.origin },
				particleCount: 30,
			});
		}
	}, []);

	const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

	const fireBigBang = useCallback(() => {
		if (!isLibLoaded) return;
		const fasterTicks = 70;
		makeShot({ spread: 50, startVelocity: 55, ticks: fasterTicks });
		makeShot({ spread: 60, ticks: fasterTicks });
	}, [makeShot, isLibLoaded]);

	const firePop = useCallback(
		(opts: any = {}) => {
			if (!isLibLoaded || !refAnimationInstance.current) return;
			refAnimationInstance.current({
				particleCount: 20,
				spread: 70,
				startVelocity: 25,
				ticks: 60,
				scalar: 0.7,
				origin: { x: 0.5, y: 0.5 },
				...opts,
			});
		},
		[isLibLoaded],
	);

	const startFireworks = useCallback(() => {
		if (isRunning || !isLibLoaded) return;

		const id = setInterval(() => {
			const animationDefaults = {
				startVelocity: 30,
				spread: 360,
				ticks: 60,
				zIndex: 0,
			};

			if (refAnimationInstance.current) {
				refAnimationInstance.current({
					...animationDefaults,
					particleCount: 50,
					origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
				});
				refAnimationInstance.current({
					...animationDefaults,
					particleCount: 50,
					origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
				});
			}
		}, 400);

		setIntervalId(id);
		setIsRunning(true);
	}, [isRunning, isLibLoaded]);

	const stopFireworks = useCallback(() => {
		if (intervalId) {
			clearInterval(intervalId);
			setIntervalId(null);
		}
		setIsRunning(false);
	}, [intervalId]);

	useEffect(() => {
		return () => {
			if (intervalId) clearInterval(intervalId);
		};
	}, [intervalId]);

	const canvasStyles: React.CSSProperties = {
		position: "fixed",
		pointerEvents: "none",
		width: "100%",
		height: "100%",
		top: 0,
		left: 0,
		zIndex: 10000,
	};

	return (
		<ConfettiContext.Provider
			value={{ fireBigBang, firePop, startFireworks, stopFireworks, isRunning, isLibLoaded }}
		>
			{children}
			{isMounted ? createPortal(<canvas ref={refCanvas} style={canvasStyles} />, document.body) : null}
		</ConfettiContext.Provider>
	);
}
