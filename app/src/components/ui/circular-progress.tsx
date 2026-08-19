import { useEffect, useState, useRef } from 'react';

const DURATION = 30000;

const CircularProgress = ({
  isStart = false,
  sqSize = 50,
  strokeWidth = 2,
  progressColor = 'stroke-blue-400',
  onEnd = function(){}
}) => {
  const radius = (sqSize - strokeWidth) / 2;
  const viewBox = `0 0 ${sqSize} ${sqSize}`;
  const circumference = radius * 2 * Math.PI;

  const [percentage, setPercentage] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {

    if (isStart) {

      startTimeRef.current = performance.now();
      
      const animate = (timestamp: number) => {

        if (!startTimeRef.current) {
          startTimeRef.current = timestamp;
        }

        const elapsed = timestamp - startTimeRef.current;
        let currentProgress = (elapsed / DURATION) * 100;

        if (currentProgress >= 100) {
          setPercentage(100);

          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          onEnd();
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
      <svg className="block w-full h-full" viewBox={viewBox}>
        <circle
          className={`${progressColor} transform -rotate-90 origin-center`}
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