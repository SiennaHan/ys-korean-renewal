import type { Meta, StoryObj } from "@storybook/react";
import { ProgressBar, SEGMENT_MAX, type SegmentState } from "./progress-bar";

/**
 * 스토리 목록은 셸 명세 §3 의 상태표를 그대로 옮긴 것이다 (§5.1).
 * 2모드(분절 ≤15 / 연속 ≥16) × 4상태.
 */
const meta = {
	title: "Shell/ProgressBar",
	component: ProgressBar,
	// 진행바는 헤더 안에서 가로를 꽉 채우므로 스토리도 같은 폭을 준다
	decorators: [
		(Story) => (
			<div className="w-full bg-background-base px-5 py-4">
				<Story />
			</div>
		),
	],
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const fill = (n: number, s: SegmentState): SegmentState[] =>
	Array.from({ length: n }, () => s);

/** 분절 · 미응답 — 활동에 막 들어온 상태 */
export const SegmentUnanswered: Story = {
	args: { segments: fill(8, "unanswered"), current: 0 },
};

/** 분절 · 정답 — 첫 시도에 맞힌 것만 fill-correct */
export const SegmentCorrect: Story = {
	args: {
		segments: [
			...fill(3, "correct"),
			...fill(5, "unanswered"),
		] as SegmentState[],
		current: 3,
	},
};

/** 분절 · 오답 — 재시도로 맞혀도 유지된다 */
export const SegmentWrong: Story = {
	args: {
		segments: [
			"correct",
			"wrong",
			"correct",
			"wrong",
			...fill(4, "unanswered"),
		],
		current: 4,
	},
};

/** 분절 · 채점 없는 활동 — 발음 · 플래시카드 · 롤플레잉은 의미색을 쓰지 않는다 */
export const SegmentNeutral: Story = {
	args: {
		segments: [...fill(4, "neutral"), ...fill(4, "unanswered")],
		current: 4,
	},
};

/** 분절 상한 — 15문항까지는 분절이다 */
export const SegmentAtLimit: Story = {
	args: {
		segments: [
			...fill(9, "correct"),
			...fill(SEGMENT_MAX - 9, "unanswered"),
		] as SegmentState[],
		current: 9,
	},
};

/** 연속 — 16문항부터. 플래시카드는 과당 최대 45장이라 이 경로가 반드시 동작해야 한다 */
export const ContinuousStart: Story = {
	args: { segments: fill(45, "unanswered"), current: 0 },
};

export const ContinuousMiddle: Story = {
	args: {
		segments: [
			...fill(20, "correct"),
			...fill(25, "unanswered"),
		] as SegmentState[],
		current: 20,
	},
};

export const ContinuousEnd: Story = {
	args: { segments: fill(45, "correct"), current: 44 },
};

/** 경계 — 16문항이면 연속으로 넘어간다 */
export const ContinuousAtThreshold: Story = {
	args: { segments: fill(SEGMENT_MAX + 1, "unanswered"), current: 0 },
};
