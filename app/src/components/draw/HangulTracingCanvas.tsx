import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';

interface Point {
  x: number;
  y: number;
}

interface CircleStroke {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
}

interface VowelData {
  vowel_horizontal?: Point[][];
  vowel_vertical?: Point[][];
}

type StrokeData = (Point[] | CircleStroke) [] | VowelData;

interface Challenge {
  id: string;
  waypoints: Point[];
  tolerance: number;
  isClosedLoop: boolean;
  state: {
    progressIndex: number;
    halfwayReached?: boolean;
  };
  completed: boolean;
  finalPath: Point[] | null;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  char: string
  isWriteDone: () => void
}

type CanvasEvent = React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>;

export interface HangulTracingCanvasHandle {
  eraseAll: () => void;
  undo: () => void;
}

const HangulTracingCanvas = forwardRef<HangulTracingCanvasHandle, Props>(({char, isWriteDone}: Props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inputChar, setInputChar] = useState(char);
  const [statusText, setStatusText] = useState('연습할 글자를 입력하고 "연습 시작" 버튼을 누르세요.');
  const [isDrawing, setIsDrawing] = useState(false);
  const [userPath, setUserPath] = useState<Point[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);

  const LINEWIDTH = 25;
  const CANVAS_SIZE = 300;
  const FONT_AREA = { x: 30, y: 30, width: 240, height: 240 };

  // 화살표 관련 상수
  const ARROW_BODY_LENGTH = 30; // 약 2cm에 해당하는 픽셀 길이
  const ARROW_HEAD_SIZE = 6;
  const DISTANCE_OFFSET = 10; // 시작점(dot 중앙)으로부터의 오프셋

  const hangulStrokeData: Record<string, StrokeData> = {
    'ㄱ': [[{ x: 10, y: 20 }, { x: 90, y: 20 }, { x: 85, y: 95 }]],
            
    'ㄴ': [[{ x: 20, y: 0 }, { x: 20, y: 80 }, { x: 100, y: 80 }]],
    'ㄷ': [[{ x: 10, y: 20 }, { x: 90, y: 20 }], [{ x: 10, y: 20 }, { x: 10, y: 80 }, { x: 10, y: 80 }, { x: 90, y: 80 }]],
    
    'ㄹ': [[{ x: 10, y: 20 }, { x: 90, y: 20 }, { x: 90, y: 50 }], 
            [{ x: 10, y: 50 }, { x: 90, y: 50 }], 
            [{ x: 10, y: 50 }, { x: 10, y: 80 }, { x: 90, y: 80 }]],
    'ㅁ': [[{ x: 10, y: 20 }, { x: 10, y: 80 }],
            [{ x: 10, y: 20 }, { x: 90, y: 20 }, { x: 90, y: 80 }],
            [{ x: 10, y: 80 }, { x: 90, y: 80 }]],
    'ㅂ': [[{ x: 10, y: 20 }, { x: 10, y: 80 }],
            [{ x: 90, y: 20 }, { x: 90, y: 80 }],
            [{ x: 10, y: 50 }, { x: 90, y: 50 }],
            [{ x: 10, y: 80 }, { x: 90, y: 80 }]
        ],
    'ㅅ': [[{ x: 55, y: 10 }, { x: 10, y: 90 }], [{ x: 48, y: 25 }, { x: 90, y: 90 }]],
    
    'ㅇ': [{ type: 'circle', cx: 50, cy: 50, r: 45 }],
    'ㅈ': [[{ x: 10, y: 20 }, { x: 90, y: 20 }, { x: 10, y: 80 }], [{ x: 50, y: 50 }, { x: 90, y: 80 }]],
    
    'ㅊ': [[{ x: 50, y: 0 }, { x: 50, y: 20 }],[{ x: 10, y: 20 }, { x: 90, y: 20 }, { x: 10, y: 80 }], [{ x: 50, y: 50 }, { x: 90, y: 80 }]],
    'ㅋ': [[{ x: 10, y: 20 }, { x: 90, y: 20 }, { x: 80, y: 80 }], 
            [{ x: 15, y: 50 }, { x: 83, y: 50 }]],
    'ㅌ': [[{ x: 10, y: 20 }, { x: 90, y: 20 }], 
            [{ x: 10, y: 20 }, { x: 10, y: 80 }, { x: 90, y: 80}], 
            [{ x: 10, y: 50 }, { x: 90, y: 50 }]],

    'ㅍ': [[{ x: 10, y: 20 }, { x: 90, y: 20 }], 
            [{ x: 25, y: 20 }, { x: 25, y: 80 }],
            [{ x: 75, y: 20 }, { x: 75, y: 80 }],
            [{ x: 10, y: 80 }, { x: 90, y: 80 }]],
    'ㅎ': [[{ x: 50, y: 0 }, { x: 50, y: 20 }], [{ x: 0, y: 20 }, { x: 100, y: 20 }], { type: 'circle', cx: 50, cy: 60, r: 35 }],

    /** 쌍자음 */
    'ㄲ': [[{ x: 0, y: 20 }, { x: 40, y: 20 }, { x: 35, y: 80 }], [{ x: 50, y: 20 }, { x: 90, y: 20 }, { x: 85, y: 80 }]],
    'ㄸ': [[{ x: 0, y: 20 }, { x: 45, y: 20 }], 
            [{ x: 0, y: 20 }, { x: 0, y: 80 }, { x: 45, y: 80 }], 
            [{ x: 55, y: 20 }, { x: 100, y: 20 }], 
            [{ x: 55, y: 20 }, { x: 55, y: 80 }, { x: 100, y: 80 }]],
    'ㅃ': [[{ x: 0, y: 10 }, { x: 0, y: 90 }],
            [{ x: 41, y: 10 }, { x: 41, y: 90 }],
            [{ x: 0, y: 50 }, { x: 41, y: 50 }],
            [{ x: 0, y: 90 }, { x: 41, y: 90 }],

            [{ x: 59, y: 10 }, { x: 59, y: 90 }],
            [{ x: 100, y: 10 }, { x: 100, y: 90 }],
            [{ x: 59, y: 50 }, { x: 100, y: 50 }],
            [{ x: 59, y: 90 }, { x: 100, y: 90 }]
    ],
    'ㅆ': [[{ x: 40, y: 10 }, { x: 10, y: 90 }], [{ x: 33, y: 30 }, { x: 45, y: 70 }],
            [{ x: 75, y: 10 }, { x: 40, y: 90 }], [{ x: 67, y: 30 }, { x: 90, y: 90 }]],
    'ㅉ': [[{ x: 10, y: 10 }, { x: 40, y: 10 }, { x: 10, y: 90 }], [{ x: 33, y: 30 }, { x: 45, y: 70 }],
            [{ x: 45, y: 10 }, { x: 75, y: 10 }, { x: 40, y: 90 }], [{ x: 67, y: 30 }, { x: 90, y: 90 }]],

    'ㄳ': [[{ x: 0, y: 10 }, { x: 40, y: 10 }, { x: 35, y: 90 }], 
            [{ x: 75, y: 10 }, { x: 45, y: 90 }], [{ x: 69, y: 30 }, { x: 90, y: 90 }]],
    'ㄵ': [[{ x: 10, y: 10 }, { x: 10, y: 90 }, { x: 40, y: 90 }],
            [{ x: 45, y: 10 }, { x: 75, y: 10 }, { x: 45, y: 90 }], [{ x: 67, y: 30 }, { x: 90, y: 90 }]],
    'ㄶ': [[{ x: 10, y: 10 }, { x: 10, y: 90 }, { x: 40, y: 90 }],
            [{ x: 62, y: 0 }, { x: 62, y: 20 }], [{ x: 42, y: 20 }, { x: 82, y: 20 }], { type: 'circle', cx: 62, cy: 62, r: 28 }],
    'ㄺ': [[{ x: 10, y: 20 }, { x: 40, y: 20 }, { x: 40, y: 50 }], [{ x: 10, y: 50 }, { x: 40, y: 50 }], [{ x: 10, y: 50 }, { x: 10, y: 80 }, { x: 40, y: 80 }], 
            [{ x: 50, y: 20 }, { x: 80, y: 20 }, { x: 80, y: 80 }]],
    'ㄻ': [[{ x: 10, y: 20 }, { x: 40, y: 20 }, { x: 40, y: 50 }], [{ x: 10, y: 50 }, { x: 40, y: 50 }], [{ x: 10, y: 50 }, { x: 10, y: 80 }, { x: 40, y: 80 }], 
            [{ x: 50, y: 20 }, { x: 50, y: 80 }], [{ x: 50, y: 20 }, { x: 80, y: 20 }, { x: 80, y: 80 }], [{ x: 50, y: 80 }, { x: 80, y: 80 }]],
    'ㄼ': [[{ x: 10, y: 20 }, { x: 40, y: 20 }, { x: 40, y: 50 }], [{ x: 10, y: 50 }, { x: 40, y: 50 }], [{ x: 10, y: 50 }, { x: 10, y: 80 }, { x: 40, y: 80 }], 
            [{ x: 50, y: 20 }, { x: 50, y: 80 }], [{ x: 80, y: 20 }, { x: 80, y: 80 }], [{ x: 50, y: 50 }, { x: 80, y: 50 }], [{ x: 50, y: 80 }, { x: 80, y: 80 }]],
    'ㅀ': [[{ x: 10, y: 20 }, { x: 40, y: 20 }, { x: 40, y: 50 }], [{ x: 10, y: 50 }, { x: 40, y: 50 }], [{ x: 10, y: 50 }, { x: 10, y: 80 }, { x: 40, y: 80 }], 
            [{ x: 62, y: 0 }, { x: 62, y: 20 }], [{ x: 47, y: 20 }, { x: 77, y: 20 }], { type: 'circle', cx: 62, cy: 62, r: 28 }],
    'ㄽ': [[{ x: 10, y: 10 }, { x: 40, y: 10 }, { x: 40, y: 50 }], [{ x: 10, y: 50 }, { x: 40, y: 50 }], [{ x: 10, y: 50 }, { x: 10, y: 90 }, { x: 40, y: 90 }], 
            [{ x: 75, y: 10 }, { x: 50, y: 90 }], [{ x: 69, y: 30 }, { x: 90, y: 90 }]],
    'ㄿ': [[{ x: 10, y: 20 }, { x: 40, y: 20 }, { x: 40, y: 50 }], [{ x: 10, y: 50 }, { x: 40, y: 50 }], [{ x: 10, y: 50 }, { x: 10, y: 80 }, { x: 40, y: 80 }], 
            [{ x: 47, y: 20 }, { x: 83, y: 20 }], [{ x: 55, y: 20 }, { x: 55, y: 80 }], [{ x: 75, y: 20 }, { x: 75, y: 80 }], [{ x: 47, y: 80 }, { x: 83, y: 80 }]],
    'ㄾ': [[{ x: 10, y: 20 }, { x: 40, y: 20 }, { x: 40, y: 50 }], [{ x: 10, y: 50 }, { x: 40, y: 50 }], [{ x: 10, y: 50 }, { x: 10, y: 80 }, { x: 40, y: 80 }], 
            [{ x: 50, y: 20 }, { x: 80, y: 20 }], [{ x: 50, y: 20 }, { x: 50, y: 80 }, { x: 80, y: 80 }], [{ x: 50, y: 50 }, { x: 80, y: 50 }]],

    'ㅄ': [[{ x: 10, y: 20 }, { x: 10, y: 80 }], [{ x: 40, y: 20 }, { x: 40, y: 80 }], [{ x: 10, y: 50 }, { x: 40, y: 50 }], [{ x: 10, y: 80 }, { x: 40, y: 80 }], 
            [{ x: 75, y: 10 }, { x: 50, y: 90 }], [{ x: 69, y: 30 }, { x: 90, y: 90 }]],

    

    'ㅏ': [[{ x: 50, y: 0 }, { x: 50, y: 100 }], [{ x: 50, y: 50 }, { x: 100, y: 50 }]],
    'ㅑ': [[{ x: 60, y: 0 }, { x: 60, y: 100 }], [{ x: 60, y: 35 }, { x: 100, y: 35 }], [{ x: 60, y: 65 }, { x: 100, y: 65 }]],
    'ㅗ': [[{ x: 50, y: 0 }, { x: 50, y: 80 }], [{ x: 0, y: 80 }, { x: 100, y: 80 }]],
    'ㅛ': [[{ x: 35, y: 20 }, { x: 35, y: 80 }], [{ x: 65, y: 20 }, { x: 65, y: 80 }], [{ x: 0, y: 80 }, { x: 100, y: 80 }]],
    'ㅓ': [[{ x: 10, y: 50 }, { x: 50, y: 50 }], [{ x: 50, y: 0 }, { x: 50, y: 100 }]],
    'ㅕ': [[{ x: 10, y: 35 }, { x: 50, y: 35 }], [{ x: 10, y: 65 }, { x: 50, y: 65 }], [{ x: 50, y: 0 }, { x: 50, y: 100 }]],
    'ㅜ': [[{ x: 0, y: 20 }, { x: 100, y: 20 }], [{ x: 50, y: 20 }, { x: 50, y: 100 }]],
    'ㅠ': [[{ x: 0, y: 20 }, { x: 100, y: 20 }], [{ x: 35, y: 20 }, { x: 35, y: 100 }], [{ x: 65, y: 20 }, { x: 65, y: 100 }]],
    'ㅡ': [[{ x: 0, y: 50 }, { x: 100, y: 50 }]],
    'ㅣ': [[{ x: 50, y: 0 }, { x: 50, y: 100 }]],
    'ㅐ': [[{ x: 50, y: 0 }, { x: 50, y: 100 }], [{ x: 50, y: 50 }, { x: 100, y: 50 }], [{ x: 100, y: 0 }, { x: 100, y: 100 }]],
    'ㅒ': [[{ x: 50, y: 0 }, { x: 50, y: 100 }], [{ x: 50, y: 35 }, { x: 100, y: 35 }], [{ x: 50, y: 65 }, { x: 100, y: 65 }], [{ x: 100, y: 0 }, { x: 100, y: 100 }]],
    'ㅔ': [[{ x: 10, y: 50 }, { x: 50, y: 50 }], [{ x: 50, y: 0 }, { x: 50, y: 100 }], [{ x: 100, y: 0 }, { x: 100, y: 100 }]],
    'ㅖ': [[{ x: 10, y: 35 }, { x: 50, y: 35 }], [{ x: 10, y: 65 }, { x: 50, y: 65 }], [{ x: 50, y: 0 }, { x: 50, y: 100 }], [{ x: 100, y: 0 }, { x: 100, y: 100 }]],
    
    // 'ㅚ' = 'ㅗ' + 'ㅣ'
    'ㅘ': {
        vowel_horizontal: [[{ x: 50, y: 0 }, { x: 50, y: 80 }], [{ x: 0, y: 80 }, { x: 100, y: 80 }]], // 'ㅗ'의 가로/짧은 세로 획
        vowel_vertical: [[{ x: 50, y: 0 }, { x: 50, y: 100 }], [{ x: 50, y: 50 }, { x: 100, y: 50 }]] // 'ㅣ' 획
    },
    'ㅙ': {
        vowel_horizontal: [[{ x: 50, y: 0 }, { x: 50, y: 80 }], [{ x: 0, y: 80 }, { x: 100, y: 80 }]], // 'ㅗ'의 가로/짧은 세로 획
        vowel_vertical: [[{ x: 20, y: 0 }, { x: 20, y: 100 }], [{ x: 20, y: 50 }, { x: 100, y: 50 }], [{ x: 100, y: 0 }, { x: 100, y: 100 }]] // 'ㅣ' 획
    },
    'ㅚ': {
        vowel_horizontal: [[{ x: 50, y: 0 }, { x: 50, y: 80 }], [{ x: 0, y: 80 }, { x: 100, y: 80 }]], // 'ㅗ'의 가로/짧은 세로 획
        vowel_vertical: [[{ x: 50, y: 0 }, { x: 50, y: 100 }]] // 'ㅣ' 획
    },
    // 'ㅟ' = 'ㅜ' + 'ㅣ'
    'ㅝ': {
        vowel_horizontal: [[{ x: 0, y: 20 }, { x: 100, y: 20 }], [{ x: 50, y: 20 }, { x: 50, y: 100 }]], // 'ㅗ'의 가로/짧은 세로 획
        vowel_vertical: [[{ x: 0, y: 75 }, { x: 50, y: 75 }], [{ x: 50, y: 0 }, { x: 50, y: 100 }]] // 'ㅣ' 획
    },
    'ㅞ': {
        vowel_horizontal: [[{ x: 0, y: 20 }, { x: 100, y: 20 }], [{ x: 50, y: 20 }, { x: 50, y: 100 }]], // 'ㅗ'의 가로/짧은 세로 획
        vowel_vertical: [[{ x: 0, y: 75 }, { x: 50, y: 75 }], [{ x: 50, y: 0 }, { x: 50, y: 100 }], [{ x: 100, y: 0 }, { x: 100, y: 100 }]] // 'ㅣ' 획
    },
    'ㅟ': {
        vowel_horizontal: [[{ x: 0, y: 20 }, { x: 100, y: 20 }], [{ x: 50, y: 20 }, { x: 50, y: 100 }]], // 'ㅗ'의 가로/짧은 세로 획
        vowel_vertical: [[{ x: 50, y: 0 }, { x: 50, y: 100 }]] // 'ㅣ' 획
    },
    // ★★★ 복합 모음: 획 분리 및 타입 지정 (유지) ★★★
    'ㅢ': {
        vowel_horizontal: [[{ x: 0, y: 50 }, { x: 100, y: 50 }]], // 'ㅗ'의 가로/짧은 세로 획
        vowel_vertical: [[{ x: 50, y: 0 }, { x: 50, y: 100 }]] // 'ㅣ' 획
    },
  };

  const CHOSEONG_LIST = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const JUNGSEONG_LIST = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
  const JONGSEONG_LIST = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

  const VOWEL_TYPES = {
    VERTICAL: ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅣ'],
    HORIZONTAL: ['ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ'],
    COMPOSITE: ['ㅘ', 'ㅙ', 'ㅚ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅢ']
  };

  // 화살표 머리(삼각형)를 그리는 헬퍼 함수
  const drawArrowhead = (ctx: CanvasRenderingContext2D, p: Point, angle: number, size: number) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    // 방향 각도에 맞춰 회전
    ctx.rotate(angle);

    ctx.beginPath();
    // 화살표 머리 모양을 정의 (translate 후 (0, 0)이 화살표 머리의 뾰족한 끝이 됨)
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.7);
    ctx.lineTo(-size, size * 0.7);
    ctx.closePath();
    ctx.fillStyle = '#007bff'; // 시작점과 동일한 색상
    ctx.fill();

    ctx.restore();
  };

  // 획의 진행 방향을 표시하는 화살표를 그리는 함수
  const drawDirectionArrow = (ctx: CanvasRenderingContext2D, challenge: Challenge) => {
    const waypoints = challenge.waypoints;
    if (waypoints.length < 2) return;

    let startPoint: Point; // dot의 중심
    let nextPoint: Point;  // 진행 방향을 결정할 다음 점

    if (challenge.isClosedLoop) {
      // 원(폐곡선)의 경우, dot 위치는 waypoints[1], 진행 방향은 [1] -> [2] (반시계)
      startPoint = waypoints[2];
      nextPoint = waypoints[1]; 
    } else {
      // 일반적인 획의 경우, dot 위치는 waypoints[0], 진행 방향은 [0] -> [1]
      startPoint = waypoints[0];
      nextPoint = waypoints[1];
    }

    const dx = nextPoint.x - startPoint.x;
    const dy = nextPoint.y - startPoint.y;
    const totalDistance = Math.hypot(dx, dy);

    if (totalDistance === 0) return;

    const unitDx = dx / totalDistance;
    const unitDy = dy / totalDistance;
    const directionAngle = Math.atan2(unitDy, unitDx);

    // 화살표 몸통의 시작점 (dot 중심에서 DISTANCE_OFFSET만큼 떨어진 곳)
    const arrowBodyStart = {
      x: startPoint.x + DISTANCE_OFFSET * unitDx,
      y: startPoint.y + DISTANCE_OFFSET * unitDy
    };

    // 화살표 몸통의 끝점 (ARROW_BODY_LENGTH만큼 진행한 곳)
    const arrowBodyEnd = {
      x: arrowBodyStart.x + ARROW_BODY_LENGTH * unitDx,
      y: arrowBodyStart.y + ARROW_BODY_LENGTH * unitDy
    };

    // 1. 화살표 몸통(선) 그리기
    ctx.beginPath();
    ctx.moveTo(arrowBodyStart.x, arrowBodyStart.y);
    ctx.lineTo(arrowBodyEnd.x, arrowBodyEnd.y);
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 2. 화살표 머리(삼각형) 그리기
    drawArrowhead(ctx, arrowBodyEnd, directionAngle, ARROW_HEAD_SIZE);
  };

  const transformStroke = (normalizedStroke: Point[], box: Box): Point[] => {
    return normalizedStroke.map(p => ({
      x: box.x + (p.x / 100) * box.width,
      y: box.y + (p.y / 100) * box.height
    }));
  };

  const generateLineWaypoints = (start: Point, end: Point, numPoints: number): Point[] => {
    const waypoints: Point[] = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      waypoints.push({ x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t });
    }
    return waypoints;
  };

  const generateCircleWaypoints = (center: Point, radius: number, numPoints: number): Point[] => {
    const waypoints: Point[] = [];
    const angleStep = (2 * Math.PI) / numPoints;
    for (let i = 0; i <= numPoints; i++) {
      const angle = -Math.PI / 2 - i * angleStep;
      waypoints.push({
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle)
      });
    }
    return waypoints;
  };

  const generateWaypointsFromStroke = (strokePoints: Point[], pointsPerSegment = 50): Point[] => {
    let waypoints: Point[] = [];
    if (strokePoints.length < 2) return strokePoints;

    for (let i = 0; i < strokePoints.length - 1; i++) {
      const start = strokePoints[i];
      const end = strokePoints[i + 1];
      const segmentWaypoints = generateLineWaypoints(start, end, pointsPerSegment);
      waypoints = waypoints.concat(i > 0 ? segmentWaypoints.slice(1) : segmentWaypoints);
    }
    return waypoints;
  };

  const setupChallengesForChar = (char: string) => {
    const newChallenges: Challenge[] = [];
    const charCode = char.charCodeAt(0);

    if (charCode < 0xAC00 || charCode > 0xD7A3) {
      setStatusText("한글 음절만 지원됩니다.");
      return;
    }

    const code = charCode - 0xAC00;
    const choseongIndex = Math.floor(code / (21 * 28));
    const jungseongIndex = Math.floor((code % (21 * 28)) / 28);
    const jongseongIndex = code % 28;

    const ch = CHOSEONG_LIST[choseongIndex];
    const ju = JUNGSEONG_LIST[jungseongIndex];
    const jo = JONGSEONG_LIST[jongseongIndex];

    const boxes: Record<string, Box> = {};
    const { x, y, width, height } = FONT_AREA;
    const hasJongseong = !!jo;

    if (VOWEL_TYPES.VERTICAL.includes(ju)) {
      const chWidth = width / 2;
      const juWidth = width / 2;
      if (hasJongseong) {
        boxes.choseong = { x, y, width: chWidth, height: height / 2 };
        boxes.jungseong = { x: x + chWidth, y, width: juWidth, height: height / 2 };
        boxes.jongseong = { x, y: y + height / 2, width, height: height / 2 };
      } else {
        boxes.choseong = { x, y, width: chWidth, height };
        boxes.jungseong = { x: x + chWidth, y, width: juWidth, height };
      }
    } else if (VOWEL_TYPES.HORIZONTAL.includes(ju)) {
      // if (hasJongseong) {
      //   boxes.choseong = { x, y, width, height: height / 3 };
      //   boxes.jungseong = { x, y: y + height / 3, width, height: height / 3 };
      //   boxes.jongseong = { x, y: y + (height * 2 / 3), width, height: height / 3 };
      // } else {
      //   boxes.choseong = { x, y, width, height: height / 2 };
      //   boxes.jungseong = { x, y: y + height / 2, width, height: height / 2 };
      // }
      if (hasJongseong) {
          boxes.choseong = { x: x + (width * 0.1), y: y, width: width * 0.8, height: height * 0.4 };
          boxes.jungseong = { x: x, y: y + height * 0.4, width: width, height: height * 0.2 };
          boxes.jongseong = { x: x, y: y + (height * 0.6 ), width: width, height: height * 0.4 };
      } else {
          boxes.choseong = { x: x, y: y, width: width, height: (height * 0.5) };
          boxes.jungseong = { x: x, y: y + (height * 0.5), width: width, height: (height * 0.5) };
      }
    } else {
      const vowelVWidth = width * 0.3;
      const leftSectionWidth = width - vowelVWidth;
      const choseongActualSizeFactor = 1;
      const actualChoseongBoxWidth = leftSectionWidth * choseongActualSizeFactor;
      const choseongXOffset = (leftSectionWidth - actualChoseongBoxWidth) / 2;
      const juVXStart = x + leftSectionWidth;
      const juVBoxWidth = vowelVWidth;

      if (hasJongseong) {
        const unitH = height / 3;
        const halfUnitH = unitH * 1.2;
        const choseongBoxH = halfUnitH * choseongActualSizeFactor;
        const juHY = y + choseongBoxH;
        const juHH = halfUnitH * 0.5;

        boxes.choseong = { x: x + choseongXOffset, y, width: actualChoseongBoxWidth, height: choseongBoxH };
        boxes.jungseong_horizontal = { x, y: juHY, width: leftSectionWidth, height: juHH };
        boxes.jungseong_vertical = { x: juVXStart, y, width: juVBoxWidth, height: unitH * 2 };
        boxes.jongseong = { x, y: y + unitH * 2, width, height: unitH };
      } else {
        const halfHeight = height / 2;
        const choseongBoxH = halfHeight * choseongActualSizeFactor;
        const juHY = y + choseongBoxH;
        const juHH = halfHeight;

        boxes.choseong = { x: x + choseongXOffset, y, width: actualChoseongBoxWidth, height: choseongBoxH };
        boxes.jungseong_horizontal = { x, y: juHY, width: leftSectionWidth, height: juHH };
        boxes.jungseong_vertical = { x: juVXStart, y, width: juVBoxWidth, height };
      }
    }

    const jamoList: Array<{ jamo: string; box: Box; type?: string }> = [];

    if (VOWEL_TYPES.COMPOSITE.includes(ju)) {
      jamoList.push({ jamo: ch, box: boxes.choseong });
      const juData = hangulStrokeData[ju] as VowelData;
      if (juData && juData.vowel_horizontal) {
        jamoList.push({ jamo: ju, type: 'vowel_h', box: boxes.jungseong_horizontal });
      }
      if (juData && juData.vowel_vertical) {
        jamoList.push({ jamo: ju, type: 'vowel_v', box: boxes.jungseong_vertical });
      }
      if (hasJongseong) {
        jamoList.push({ jamo: jo, box: boxes.jongseong });
      }
    } else {
      jamoList.push({ jamo: ch, box: boxes.choseong });
      jamoList.push({ jamo: ju, box: boxes.jungseong });
      if (hasJongseong) jamoList.push({ jamo: jo, box: boxes.jongseong });
    }

    let challengeCount = 1;
    for (const item of jamoList) {
      if (hangulStrokeData[item.jamo]) {
        let strokes: any;
        const data = hangulStrokeData[item.jamo];

        if (item.type === 'vowel_h') {
          strokes = (data as VowelData).vowel_horizontal;
        } else if (item.type === 'vowel_v') {
          strokes = (data as VowelData).vowel_vertical;
        } else {
          strokes = data;
        }

        if (!Array.isArray(strokes)) {
          if ((strokes as VowelData).vowel_horizontal) continue;
          strokes = [strokes];
        }

        for (const normalizedStroke of strokes) {
          let waypoints: Point[];
          let isClosed = false;

          if ((normalizedStroke as CircleStroke).type === 'circle') {
            isClosed = true;
            const circleStroke = normalizedStroke as CircleStroke;
            const box = item.box;
            const center = {
              x: box.x + (circleStroke.cx / 100) * box.width,
              y: box.y + (circleStroke.cy / 100) * box.height
            };
            const radius = (Math.min(box.width, box.height) / 100) * circleStroke.r;
            waypoints = generateCircleWaypoints(center, radius, 100);
            waypoints.unshift(waypoints.pop()!);
            waypoints.unshift(waypoints.pop()!);
          } else {
            const realCoordStroke = transformStroke(normalizedStroke as Point[], item.box);
            waypoints = generateWaypointsFromStroke(realCoordStroke, 50);
          }

          if (waypoints && waypoints.length > 0) {
            newChallenges.push({
              id: `${char} - ${challengeCount}획`,
              waypoints,
              tolerance: 25,
              isClosedLoop: isClosed,
              state: { progressIndex: 0 },
              completed: false,
              finalPath: null
            });
            challengeCount++;
          }
        }
      }
    }

    setChallenges(newChallenges);
    setCurrentChallengeIndex(0);
    if (newChallenges.length > 0) {
      setStatusText(`도전 1: '${char}'의 첫 번째 획을 그리세요.`);
    } else {
      setStatusText("아직 학습되지 않은 글자입니다.");
    }
  };

  const drawSmoothPath = (ctx: CanvasRenderingContext2D, path: Point[]) => {
    if (path.length < 2) return;
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length - 1; i++) {
      const mid2 = { x: (path[i].x + path[i + 1].x) / 2, y: (path[i].y + path[i + 1].y) / 2 };
      ctx.quadraticCurveTo(path[i].x, path[i].y, mid2.x, mid2.y);
    }
    if (path.length > 1) {
      ctx.lineTo(path[path.length - 1].x, path[path.length - 1].y);
    }
  };

  const drawAllGuides = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    challenges.forEach((challenge, index) => {
      if (challenge.completed) {
        if (challenge.finalPath) {
          ctx.beginPath();
          drawSmoothPath(ctx, challenge.finalPath);
          ctx.strokeStyle = '#007bff';
          ctx.lineWidth = LINEWIDTH;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        challenge.waypoints.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = index === currentChallengeIndex ? '#aaaaaa' : '#e0e0e0';
        ctx.lineWidth = LINEWIDTH;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // 시작점 위치 계산
        const dotPosition = challenge.isClosedLoop ? challenge.waypoints[1] : challenge.waypoints[0];
        const startPointColor = index === currentChallengeIndex ? '#C489F4' : '#C489F4';

        //화살표 그리기
        // 3. 방향 화살표 그리기 (현재 진행할 획에만 표시)
        // if (index === currentChallengeIndex) {
        drawDirectionArrow(ctx, challenge);
        // }

        // 시작점 그리기
        ctx.beginPath();
        ctx.arc(dotPosition.x, dotPosition.y, LINEWIDTH / 2, 0, 2 * Math.PI);
        ctx.fillStyle = startPointColor;
        ctx.fill();

        // 시작 순서 숫자 표시
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(index + 1), dotPosition.x, dotPosition.y);
      }
    });
  };

  useEffect(() => {
    drawAllGuides();
  }, [challenges, currentChallengeIndex]);

  useEffect(() => {
    setupChallengesForChar(char);
  }, [char]);

  const eraseAll = useCallback(() => {
    setIsDrawing(false);
    setActiveChallenge(null);
    setUserPath([]);
    setupChallengesForChar(char);
  }, [char]);

  const undo = useCallback(() => {
    setIsDrawing(false);
    setActiveChallenge(null);

    if (isDrawing || activeChallenge) {
      setUserPath([]);
      drawAllGuides();
      setStatusText(`${currentChallengeIndex + 1}번째 획을 다시 그려보세요.`);
      return;
    }

    if (currentChallengeIndex === 0) {
      drawAllGuides();
      return;
    }

    const previousIndex = currentChallengeIndex - 1;
    setChallenges(prev =>
      prev.map((challenge, idx) => {
        if (idx === previousIndex) {
          return {
            ...challenge,
            completed: false,
            finalPath: null,
            state: {
              progressIndex: 0,
              halfwayReached: false,
            },
          };
        }

        return challenge;
      }),
    );
    setCurrentChallengeIndex(previousIndex);
    setStatusText(`도전 ${previousIndex + 1}: '${char}'의 ${previousIndex + 1}번째 획을 그리세요.`);
  }, [activeChallenge, char, currentChallengeIndex, isDrawing]);

  useImperativeHandle(ref, () => ({
    eraseAll,
    undo,
  }), [eraseAll, undo]);

  const findClosestPointOnPath = (userPos: Point, waypoints: Point[]) => {
    let minDistance = Infinity;
    let closestIndex = 0;
    waypoints.forEach((point, i) => {
      const distance = Math.hypot(userPos.x - point.x, userPos.y - point.y);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    });
    return { index: closestIndex, distance: minDistance, point: waypoints[closestIndex] };
  };

  const triggerSuccess = (challenge: Challenge) => {
    setIsDrawing(false);
    setUserPath([]);
    const updatedChallenges = [...challenges];
    const idx = updatedChallenges.findIndex(c => c.id === challenge.id);
    if (idx !== -1) {
      updatedChallenges[idx].completed = true;
      updatedChallenges[idx].finalPath = [...userPath];
    }
    setChallenges(updatedChallenges);
    setCurrentChallengeIndex(prev => prev + 1);
    
    if (currentChallengeIndex + 1 >= challenges.length) {
      setStatusText("모든 획을 완벽하게 그렸습니다! 🎉");
      // 완료처리
      isWriteDone();
    } else {
      setStatusText(`성공! 다음 획을 그려보세요. (${currentChallengeIndex + 2}/${challenges.length})`);
    }
    setActiveChallenge(null);
  };

  const getCoordinates = (event: CanvasEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

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

  const handleStart = (e: CanvasEvent) => {
    if (currentChallengeIndex >= challenges.length) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentPoint = getCoordinates(e);
    const pos = { x: currentPoint.x, y: currentPoint.y };
    const current = challenges[currentChallengeIndex];

    let startPointCheck = current.waypoints[0];
    if (current.isClosedLoop && current.waypoints.length > 1) {
      startPointCheck = current.waypoints[1];
    }

    const b = Math.hypot(pos.x - startPointCheck.x, pos.y - startPointCheck.y)
    const check = b < 20;

    if (check) {
      setActiveChallenge(current);
      setIsDrawing(true);
      setUserPath([pos]);
      current.state.progressIndex = 0;
      current.state.halfwayReached = false;
      drawAllGuides();
      setStatusText(`${currentChallengeIndex + 1}번째 획을 따라 그려보세요!`);
    }
  };

  const handleMove = (e: CanvasEvent) => {

    if (!isDrawing || !activeChallenge) return;
    const rect = canvasRef.current?.getBoundingClientRect();

    if (!rect) return;
    const currentPoint = getCoordinates(e);
    const pos = { x: currentPoint.x, y: currentPoint.y };
    const { index: closestIndex, distance } = findClosestPointOnPath(pos, activeChallenge.waypoints);

    if (distance > activeChallenge.tolerance * 1.5) {
      setIsDrawing(false);
      setStatusText("경로를 벗어났습니다!");
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = 'red';
        ctx.stroke();
      }
      setActiveChallenge(null);
      setTimeout(drawAllGuides, 800);
      return;
    }

    const progressIndex = activeChallenge.state.progressIndex;
    const pathLength = activeChallenge.waypoints.length;

    if (activeChallenge.isClosedLoop && progressIndex < pathLength * 0.1 && closestIndex > pathLength * 0.9) {
      setIsDrawing(false);
      setStatusText("반대 방향입니다! 반시계 방향으로 그려주세요.");
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = 'red';
        ctx.stroke();
      }
      setActiveChallenge(null);
      setTimeout(drawAllGuides, 800);
      return;
    }

    const backwardDistance = progressIndex - closestIndex;
    const isMovingSignificantlyBackward = backwardDistance > 5;
    const isWrappingAround = activeChallenge.isClosedLoop && backwardDistance > pathLength * 0.8;

    if (isMovingSignificantlyBackward && !isWrappingAround) {
      setIsDrawing(false);
      setStatusText("방향이 틀렸습니다! (역주행)");
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = 'red';
        ctx.stroke();
      }
      setActiveChallenge(null);
      setTimeout(drawAllGuides, 800);
      return;
    }

    activeChallenge.state.progressIndex = closestIndex;
    const newUserPath = [...userPath, pos];
    setUserPath(newUserPath);

    const canvas = canvasRef.current;
		if (!canvas) return;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAllGuides();
    ctx.beginPath();
    drawSmoothPath(ctx, newUserPath);
    ctx.strokeStyle = '#28a745';
    ctx.lineWidth = LINEWIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    const progressPercentage = closestIndex / pathLength;
    if (progressPercentage > 0.5) {
      activeChallenge.state.halfwayReached = true;
    }

    if (activeChallenge.isClosedLoop) {
      const endPoint = activeChallenge.waypoints[0];
      const distToEnd = Math.hypot(pos.x - endPoint.x, pos.y - endPoint.y);
      if (activeChallenge.state.halfwayReached && progressPercentage > 0.97 && distToEnd < 15) {
        triggerSuccess(activeChallenge);
      }
    } else {
      const endPoint = activeChallenge.waypoints[activeChallenge.waypoints.length - 1];
      const distToEnd = Math.hypot(pos.x - endPoint.x, pos.y - endPoint.y);
      if (progressPercentage > 0.97 && distToEnd < 15) {
        triggerSuccess(activeChallenge);
      }
    }
  };

  const handleEnd = () => {
    if (!isDrawing || !activeChallenge) return;
    setIsDrawing(false);
    const progressPercentage = activeChallenge.state.progressIndex / (activeChallenge.waypoints.length - 1);
    if (progressPercentage > 0.97) {
      triggerSuccess(activeChallenge);
    } else {
      setStatusText("끝까지 도달하지 못했습니다. 다시 시도하세요.");
      drawAllGuides();
    }
    setActiveChallenge(null);
  };

  const handleStartButton = () => {
    if (inputChar) {
      setupChallengesForChar(inputChar);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center mt-[30px]">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        // 터치 이벤트
        onTouchStart={handleStart}
        onTouchEnd={handleEnd}
        onTouchCancel={handleEnd}
        onTouchMove={handleMove}
        className="cursor-crosshair"
      />
    </div>
  );
});

HangulTracingCanvas.displayName = 'HangulTracingCanvas';

export default HangulTracingCanvas;
