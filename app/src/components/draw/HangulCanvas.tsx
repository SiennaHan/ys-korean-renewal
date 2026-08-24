import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { uploadWriting } from "@/api/analyzeApi";
import { useSoundEffects } from "@/components/effect/use-sound-effects";
import clsx from "clsx";
import { Check, RotateCcw, Upload } from "lucide-react";

// Tailwind CSS is assumed to be available.

const CANVAS_SIZE: number = 300;

// 마우스 이벤트와 터치 이벤트를 모두 포함하는 타입 별칭
type CanvasEvent =
	| React.MouseEvent<HTMLCanvasElement>
	| React.TouchEvent<HTMLCanvasElement>;
type Point = { x: number; y: number };

interface Props {
	text: string | null;
	returnImage: (base64Img: string) => void;
	onClose: () => void;
}

export default function HangulCanvas({ text, returnImage, onClose }: Props) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const contextRef = useRef<CanvasRenderingContext2D | null>(null);
	const sound = useSoundEffects();

	// ⭐️ 부드러운 선 그리기를 위해 직전에 기록된 실제 좌표를 저장합니다.
	const lastPointRef = useRef<Point | null>(null);
	const [isDrawing, setIsDrawing] = useState<boolean>(false);
	const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
	const [hasLine, setHasLine] = useState(false);
	const [isUploading, setIsUploading] = useState(false);

	// --- 캔버스 초기화 Effect ---
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		// 고해상도(Retina) 디스플레이를 위한 설정
		canvas.width = CANVAS_SIZE * 2;
		canvas.height = CANVAS_SIZE * 2;
		canvas.style.width = `${CANVAS_SIZE}px`;
		canvas.style.height = `${CANVAS_SIZE}px`;

		const context = canvas.getContext("2d");
		if (context) {
			const ctx = context as CanvasRenderingContext2D;

			ctx.scale(2, 2);
			ctx.lineCap = "round";
			ctx.lineJoin = "round"; // 선 연결 부위도 둥글게 처리하여 더욱 부드러움을 더함
			ctx.strokeStyle = "#000000"; // 서명 색상: 검은색
			ctx.lineWidth = 20; // 선 두께
			contextRef.current = ctx;
		}
	}, []);

	/**
	 * 마우스/터치 이벤트로부터 캔버스 내부 좌표를 계산합니다.
	 * @param {CanvasEvent} event - 마우스 또는 터치 이벤트 객체
	 * @returns {Point} 캔버스 상대 좌표
	 */
	const getCoordinates = (event: CanvasEvent): Point => {
		const canvas = canvasRef.current;
		if (!canvas) return { x: 0, y: 0 };

		const rect = canvas.getBoundingClientRect();
		let clientX: number;
		let clientY: number;

		const nativeEvent = event.nativeEvent;

		if (nativeEvent instanceof TouchEvent && nativeEvent.touches.length > 0) {
			clientX = nativeEvent.touches[0].clientX;
			clientY = nativeEvent.touches[0].clientY;
		} else if (nativeEvent instanceof MouseEvent) {
			clientX = nativeEvent.clientX;
			clientY = nativeEvent.clientY;
		} else {
			return { x: 0, y: 0 };
		}

		// 캔버스 좌측 상단 기준 좌표 계산
		return {
			x: clientX - rect.left,
			y: clientY - rect.top,
		};
	};

	/**
	 * 그리기 시작 (경로 시작)
	 */
	const startDrawing = useCallback((event: CanvasEvent): void => {
		// setSignatureData('');
		setHasLine(true);
		const currentPoint = getCoordinates(event);
		const context = contextRef.current;

		if (context) {
			context.beginPath();
			context.moveTo(currentPoint.x, currentPoint.y); // 첫 점으로 이동

			setIsDrawing(true);
			// ⭐️ 마지막 기록점을 현재 위치로 초기화합니다.
			lastPointRef.current = currentPoint;
		}
	}, []);

	/**
	 * 그리기 중 (선 그리기) - 부드러운 곡선 적용
	 */
	const draw = useCallback(
		(event: CanvasEvent): void => {
			if (!isDrawing) return;

			const currentPoint = getCoordinates(event);
			const context = contextRef.current;
			const lastPoint = lastPointRef.current;

			if (context && lastPoint) {
				// ⭐️ 베지어 곡선을 위한 중간점 (곡선의 끝점)을 계산합니다.
				const midPointX = lastPoint.x + (currentPoint.x - lastPoint.x) * 0.5;
				const midPointY = lastPoint.y + (currentPoint.y - lastPoint.y) * 0.5;

				// ⭐️ 2차 베지어 곡선을 그립니다.
				// lastPoint를 제어점(Control Point)으로, midPoint를 새로운 끝점으로 사용합니다.
				// 이렇게 하면 선이 각지지 않고 부드럽게 이어집니다.
				context.quadraticCurveTo(
					lastPoint.x,
					lastPoint.y,
					midPointX,
					midPointY,
				);
				context.stroke();

				// ⭐️ 다음 세그먼트의 제어점 역할을 할 '마지막 기록점'을 현재 위치로 업데이트합니다.
				lastPointRef.current = currentPoint;
			}
		},
		[isDrawing],
	);

	/**
	 * 그리기 종료 (경로 닫기)
	 */
	const stopDrawing = useCallback((): void => {
		const context = contextRef.current;
		if (context) {
			context.closePath();
		}
		setIsDrawing(false);
		lastPointRef.current = null; // 종료 시 마지막 기록점 초기화
	}, []);

	/**
	 * 캔버스 초기화 (서명 지우기)
	 */
	const clearCanvas = useCallback((): void => {
		const canvas = canvasRef.current;
		const context = contextRef.current;
		if (canvas && context) {
			// 캔버스 전체 영역을 지웁니다. (배경 투명성 보장)
			context.clearRect(0, 0, canvas.width / 2, canvas.height / 2);
			// setSignatureData(''); // 저장된 데이터도 초기화
			lastPointRef.current = null; // 마지막 기록점 초기화
		}
		setHasLine(false);
		setIsCorrect(null);
	}, []);

	const saveSignature = async (): Promise<void> => {
		// sound.unlock();
		const canvas = canvasRef.current;
		if (canvas) {
			setIsUploading(true);
			const base64Img: string = canvas.toDataURL("image/png");
			const rawBase64 = `${base64Img}`.split(",")[1].replace(/[\s\n\r]/g, "");
			const response = await uploadWriting(rawBase64);

			const resultText = response.data;
			const _isCorrect = text === resultText;
			setIsCorrect(_isCorrect);

			if (_isCorrect) {
				sound.playCorrect();
				setTimeout(() => {
					returnImage(base64Img);
					onClose();
				}, 1000);
			} else {
				sound.playIncorrect();
			}
			setHasLine(false);
			setIsUploading(false);
		}
	};

	return (
		<div className="flex flex-col items-center justify-center font-inter">
			<div className="w-full max-w-sm rounded-xl bg-white transition-all hover:shadow-3xl">
				{/* Signature Canvas Area */}
				<div className="mb-[10px] w-full text-center">
					여기에 손가락으로 쓰세요.
				</div>
				<div
					className="mx-auto cursor-crosshair rounded-lg border-4 border-gray-300 border-dashed bg-white shadow-inner"
					style={{ width: `${CANVAS_SIZE}px`, height: `${CANVAS_SIZE}px` }}
				>
					<canvas
						ref={canvasRef}
						// 마우스 이벤트
						onMouseDown={startDrawing}
						onMouseUp={stopDrawing}
						onMouseLeave={stopDrawing}
						onMouseMove={draw}
						// 터치 이벤트
						onTouchStart={startDrawing}
						onTouchEnd={stopDrawing}
						onTouchCancel={stopDrawing}
						onTouchMove={draw}
						className="h-full w-full touch-none"
					/>
				</div>

				{/* Control Buttons */}
				<div className="flex items-center justify-between space-x-3 p-2">
					<button
						onClick={clearCanvas}
						className="transform cursor-pointer rounded-lg border-1 bg-white px-4 py-3 font-bold text-[#4396f4] shadow-md transition duration-300 hover:scale-[1.02] hover:bg-gray-100 focus:outline-none active:scale-[0.98]"
					>
						<RotateCcw />
					</button>
					<div className="flex items-center font-bold text-white">
						{isCorrect === true && (
							<div className="rounded-[10px] bg-green-400 pr-2 pl-2 text-[20px]">
								Correct
							</div>
						)}
						{isCorrect === false && (
							<div className="rounded-[10px] bg-red-400 pr-2 pl-2 text-[20px]">
								Incorrect
							</div>
						)}
						{isUploading === true && (
							<div className="!text-gray-400 !font-normal rounded-[5px] bg-gray-white pr-2 pl-2 text-[14px]">
								분석중...
							</div>
						)}
					</div>
					<button
						onClick={saveSignature}
						className="transform cursor-pointer rounded-lg bg-[#4396f4] px-4 py-3 font-semibold text-white shadow-md transition duration-300 hover:scale-[1.02] hover:bg-blue-500 focus:outline-none active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white disabled:text-gray-300 disabled:opacity-70 disabled:shadow-none disabled:hover:bg-white"
						disabled={!hasLine || isUploading}
					>
						{isUploading ? (
							<div className="h-6 w-6 animate-spin rounded-full border-[#4396f4] border-b-2" />
						) : (
							<Upload />
						)}
					</button>
				</div>

				{/* Signature Data Output */}
				{/* {signatureData && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-sm font-bold text-green-700 mb-2">
              ✅ 저장된 서명 데이터 (Base64) - 배경 투명
            </h3>
            <div className="flex justify-center">
                <img 
                    src={signatureData} // 저장된 Base64 데이터를 이미지 소스로 사용하여 화면에 출력
                    alt="Captured Signature" 
                    className="max-w-full h-auto border-4 border-gray-700 rounded-md shadow-lg bg-gray-200"
                    style={{ maxHeight: '150px' }}
                />
            </div>
            <p className="mt-2 text-xs text-gray-600 break-all truncate">
                {signatureData.substring(0, 100)}... (전체 길이: {signatureData.length} bytes)
            </p>
          </div>
        )} */}
			</div>
		</div>
	);
}
