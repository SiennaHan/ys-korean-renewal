import { useTranslation } from "react-i18next";

/**
 * 진행바 — 구현 사양 §3
 *
 * 얇은 선이다. 칸 안 아이콘을 버려서 칸 높이가 24 → 6 으로 줄었다.
 * 그래서 정오답은 색으로만 남고, 색각이상 학습자에겐 결과 화면이 그 일을 대신한다(§13).
 * 진행바가 하는 주된 일은 "어디까지 왔나"이고 정오답은 보조 신호다.
 */
export type SegmentState =
	| "correct" // 첫 시도에 맞힌 것만
	| "wrong" // 첫 시도 오답. 재시도로 맞혀도 유지한다
	| "neutral" // 채점 없는 활동 — 발음 · 플래시카드 · 롤플레잉
	| "unanswered"; // 건너뛴 문항 포함

/** 문항 15개까지는 분절, 16개부터는 연속바 + n/N (§3) */
export const SEGMENT_MAX = 15;

const FILL: Record<SegmentState, string> = {
	correct: "bg-fill-correct",
	wrong: "bg-fill-wrong",
	neutral: "bg-fill-primary",
	unanswered: "bg-fill-track",
};

export interface ProgressBarProps {
	/** 문항별 상태. 길이가 곧 총 문항 수다 */
	segments: SegmentState[];
	/** 지금 보고 있는 문항 (0-based) */
	current: number;
}

export function ProgressBar({ segments, current }: ProgressBarProps) {
	const { t } = useTranslation();
	const total = segments.length;
	const continuous = total > SEGMENT_MAX;

	if (continuous) {
		// 채움은 "지금 문항까지 왔다"를 뜻하므로 current + 1 로 센다
		const done = Math.min(current + 1, total);
		const ratio = total === 0 ? 0 : (done / total) * 100;

		return (
			<div className="flex items-center gap-2">
				<div className="relative h-[6px] flex-1 rounded-full bg-fill-track">
					<div
						className="h-full rounded-full bg-fill-primary"
						style={{ width: `${ratio}%` }}
					/>
					{/* 끝의 원형 knob 10 — 재생 헤드처럼 읽힌다 */}
					<div
						className="-translate-y-1/2 absolute top-1/2 size-[10px] rounded-full bg-fill-primary"
						style={{ left: `calc(${ratio}% - 5px)` }}
					/>
				</div>
				<span className="shrink-0 text-text-sub text-xs tabular-nums">
					{t("player.progress", { current: done, total })}
				</span>
			</div>
		);
	}

	return (
		<div className="flex items-end gap-[3px]">
			{segments.map((state, i) => (
				<div
					key={`${i}-${state}`}
					// 현재 위치만 높이 10 — 얇은 바에서 테두리 2px 는 보이지 않아 길이로 구분한다
					className={`flex-1 rounded-full ${FILL[state]} ${
						i === current ? "h-[10px] bg-fill-primary" : "h-[6px]"
					}`}
					aria-label={t("player.a11ySegment", {
						index: i + 1,
						state: t(A11Y_STATE[state]),
					})}
				/>
			))}
		</div>
	);
}

const A11Y_STATE: Record<SegmentState, string> = {
	correct: "player.a11yStateCorrect",
	wrong: "player.a11yStateWrong",
	neutral: "player.a11yStateUnanswered",
	unanswered: "player.a11yStateUnanswered",
};
