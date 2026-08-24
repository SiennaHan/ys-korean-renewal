import { useEffect, useRef, useState } from "react";

const DURATION = 30000;

const CircularProgress = ({
	isStart = false,
	sqSize = 50,
	strokeWidth = 2,
	progressColor = "stroke-blue-400",
	onEnd = () => {},
}) => {
	const radius = (sqSize - strokeWidth) / 2;
	const viewBox = `0 0 ${sqSize} ${sqSize}`;
	const circumference = radius * 2 * Math.PI;

	const [percentage, setPercentage] = useState(0);
	const animationFrameRef = useRef<number | null>(null);
	const startTimeRef = useRef<number | null>(null);

	/*
	 * onEnd 는 ref 로 잡아 둔다. 의존성에 넣으면 **부모가 리렌더될 때마다 애니메이션이
	 * 처음부터 다시 시작한다** — 기본값이 `() => {}` 이고 쓰는 쪽도 인라인 화살표라
	 * 매 렌더마다 새 함수다. 빼 두면 반대로 클로저가 낡는다.
	 * ref 에 매 렌더 최신 것을 넣고 그것을 부르면 둘 다 피한다.
	 */
	const onEndRef = useRef(onEnd);
	onEndRef.current = onEnd;

	useEffect(() => {
		if (isStart) {
			startTimeRef.current = performance.now();

			const animate = (timestamp: number) => {
				if (!startTimeRef.current) {
					startTimeRef.current = timestamp;
				}

				const elapsed = timestamp - startTimeRef.current;
				const currentProgress = (elapsed / DURATION) * 100;

				if (currentProgress >= 100) {
					setPercentage(100);

					if (animationFrameRef.current) {
						cancelAnimationFrame(animationFrameRef.current);
						animationFrameRef.current = null;
					}
					onEndRef.current();
					return;
				}

				setPercentage(currentProgress);
				animationFrameRef.current = requestAnimationFrame(animate);
			};

			animationFrameRef.current = requestAnimationFrame(animate);
		} else {
			if (animationFrameRef.current !== null) {
				cancelAnimationFrame(animationFrameRef.current);
				animationFrameRef.current = null;
			}
			startTimeRef.current = null;
			setPercentage(0);
		}

		return () => {
			if (animationFrameRef.current !== null) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, [isStart]);

	const strokeDashoffset = circumference - (percentage / 100) * circumference;

	return (
		<div className="relative" style={{ width: sqSize, height: sqSize }}>
			<svg aria-hidden="true" className="block h-full w-full" viewBox={viewBox}>
				<circle
					className={`${progressColor} -rotate-90 origin-center transform`}
					strokeWidth={strokeWidth}
					cx={sqSize / 2}
					cy={sqSize / 2}
					r={radius}
					fill="transparent"
					strokeDasharray={circumference}
					strokeDashoffset={strokeDashoffset}
				/>
			</svg>
		</div>
	);
};

export default CircularProgress;
