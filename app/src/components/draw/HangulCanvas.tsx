import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { uploadWriting } from "@/api/analyzeApi";
import { FeedbackMessage } from "@/components/main/activity";
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
	/*
	 * useCallback([]) 으로 감싼다 — 읽는 것이 canvasRef 하나뿐이라(ref 는 안정하다)
	 * 의존성이 비어도 낡지 않는다. 이렇게 해 두면 아래 startDrawing·draw 의
	 * 의존성에 그냥 넣을 수 있다. 감싸지 않으면 매 렌더 새 함수라 넣는 순간
	 * 두 콜백이 매 렌더마다 새로 만들어진다.
	 */
	const getCoordinates = useCallback((event: CanvasEvent): Point => {
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
	}, []);

	/*
	 * 획을 쌓아 둔다 — 되돌리기 때문이다.
	 *
	 * 이 판은 캔버스에 바로 그리므로(베지어로 이어 붙인다) 한 획만 물러나려면
	 * **다시 그리는 수밖에 없다.** 그래서 획마다 점들을 모아 두고, 되돌릴 때
	 * 마지막 획을 빼고 남은 것을 처음부터 다시 그린다.
	 *
	 * 따라쓰기(HangulTracingCanvas)의 undo 는 여기 쓸 수 없다 — 그쪽은 목표 글자의
	 * **정해진 획 순서**를 되감는 것이라 자유 필기와 뜻이 다르다.
	 */
	const strokesRef = useRef<Point[][]>([]);
	const currentStrokeRef = useRef<Point[]>([]);

	/** 보관한 획을 처음부터 다시 그린다. 지우기·되돌리기가 같이 쓴다 */
	const repaint = useCallback((): void => {
		const canvas = canvasRef.current;
		const context = contextRef.current;
		if (!canvas || !context) return;
		context.clearRect(0, 0, canvas.width, canvas.height);
		for (const stroke of strokesRef.current) {
			if (stroke.length === 0) continue;
			context.beginPath();
			context.moveTo(stroke[0].x, stroke[0].y);
			let last = stroke[0];
			for (const pt of stroke.slice(1)) {
				// 그릴 때와 같은 곡선식이라야 되돌린 뒤 모양이 안 바뀐다
				context.quadraticCurveTo(
					last.x,
					last.y,
					last.x + (pt.x - last.x) * 0.5,
					last.y + (pt.y - last.y) * 0.5,
				);
				last = pt;
			}
			context.stroke();
			context.closePath();
		}
	}, []);

	/** 마지막 획 하나만 물린다 */
	const undoLast = useCallback((): void => {
		strokesRef.current = strokesRef.current.slice(0, -1);
		currentStrokeRef.current = [];
		lastPointRef.current = null;
		repaint();
		setHasLine(strokesRef.current.length > 0);
		setIsCorrect(null);
	}, [repaint]);

	/**
	 * 그리기 시작 (경로 시작)
	 */
	const startDrawing = useCallback(
		(event: CanvasEvent): void => {
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
				currentStrokeRef.current = [currentPoint];
			}
		},
		[getCoordinates],
	);

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
				// 되돌리기용 — 이 획의 점을 모아 둔다(위 strokesRef 주석)
				currentStrokeRef.current.push(currentPoint);
			}
		},
		[getCoordinates, isDrawing],
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
		if (currentStrokeRef.current.length > 0) {
			strokesRef.current = [...strokesRef.current, currentStrokeRef.current];
			currentStrokeRef.current = [];
		}
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
		strokesRef.current = [];
		currentStrokeRef.current = [];
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
			/*
			 * 틀렸을 때는 hasLine 을 내리지 않는다.
			 *
			 * 전에는 정답·오답 가리지 않고 내려서, "Try again" 이 떴는데 **획은 화면에
			 * 그대로 남고 되돌리기·전체 지우기만 잠기는** 상태가 됐다. 고칠 수도
			 * 지울 수도 없으니 사실상 갇힌다.
			 *
			 * 맞았을 때는 1초 뒤 returnImage 로 슬롯에 넣고 모달을 닫으므로 그때
			 * 내려도 된다 — 닫히는 동안 다시 누르는 것을 막는 값이기도 하다.
			 */
			if (_isCorrect) setHasLine(false);
			setIsUploading(false);
		}
	};

	return (
		<div className="flex flex-col items-center justify-center">
			<div className="w-full max-w-sm rounded-xl bg-white transition-all hover:shadow-3xl">
				{/* Signature Canvas Area */}
				<div className="mb-[10px] w-full text-center">
					여기에 손가락으로 쓰세요.
				</div>
				<div
					className="mx-auto cursor-crosshair rounded-lg border-4 border-gray-300 border-dashed bg-white shadow-inner"
					style={{ width: `${CANVAS_SIZE}px`, height: `${CANVAS_SIZE}px` }}
				>
					{/*
					  * 손으로 긋는 판이라 키보드로는 대신할 수 없다. 이름이라도 붙여
					  * 보조기술이 "여기가 쓰는 자리" 라고 읽게 한다. 넘어갈 길은
					  * 상단 바의 건너뛰기다(word-write.tsx 의 onSkip).
					  */}
					<canvas
						ref={canvasRef}
						role="img"
						aria-label="글자를 손으로 쓰는 판"
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

				{/*
				  * 따라쓰기 화면(combine.tsx 의 trace 단계)과 **같은 꼴**로 맞춘다.
				  * 목업(activity__write_canvas)이 정한 모양이 이것이다 — 캔버스 아래
				  * 오른쪽에 글자 도구 버튼(.tools > .tool), 확정은 아래쪽 .primary.
				  * 전에는 여기만 둥근 아이콘 버튼 둘이 좌우로 갈라져 있어서 같은
				  * "손으로 쓰는 판" 인데 다르게 보였다.
				  *
				  * 도구 둘도 따라쓰기와 같은 순서다 — 되돌리기, 전체 지우기.
				  * 되돌리기는 이 판에 없던 기능이라 새로 넣었다(위 strokesRef 주석).
				  */}
				<div className="tools">
					<button
						type="button"
						className="tool"
						onClick={undoLast}
						disabled={!hasLine || isUploading}
					>
						되돌리기
					</button>
					<button
						type="button"
						className="tool"
						onClick={clearCanvas}
						disabled={!hasLine || isUploading}
					>
						전체 지우기
					</button>
				</div>

				{/*
				  * 채점 표시는 다른 화면과 같은 **피드백 알약**을 쓴다
				  * (components/main/activity/feedback.tsx). 손으로 만들면 또
				  * 이 화면만 달라진다. 다만 **자리는 .feedback-slot 을 쓰지 않는다** —
				  * 그것은 활동 화면 바닥에 깔리는 띠라 회색 배경을 갖고, 흰 모달
				  * 안에서는 회색 박스로 보인다. flex:0 0 44px 도 모달이 flex 열이
				  * 아니라 안 먹어서 알약이 뜰 때마다 높이가 들쭉날쭉했다.
				  */}
				<div className="canvas-feedback" aria-live="polite">
					{isUploading && <span className="canvas-busy">분석중…</span>}
					{!isUploading && isCorrect === true && <FeedbackMessage kind="correct" />}
					{!isUploading && isCorrect === false && <FeedbackMessage kind="wrong" />}
				</div>

				<div className="dock">
					<div className="main">
						<button
							type="button"
							className={`primary ${hasLine && !isUploading ? "on" : ""}`}
							onClick={saveSignature}
							disabled={!hasLine || isUploading}
						>
							확인
						</button>
					</div>
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
