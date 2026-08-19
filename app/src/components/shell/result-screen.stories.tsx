import type { Meta, StoryObj } from "@storybook/react";
import { ResultScreen, type WrongItem } from "./result-screen";

/**
 * §5.1 스토리 목록 — 3상태(perfect · hasWrong · reviewDone).
 * §8 의 상태표는 넷이라(완전 정답 · 내일 복습 · 미해결 있음 · 다시 풀기 종료) 그쪽을 따랐다.
 */
const meta = {
	title: "Shell/ResultScreen",
	component: ResultScreen,
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ResultScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

const wrong: WrongItem[] = [
	{
		id: "1",
		userAnswer: "학교에서 버스로 가요",
		explanation: "장소로 가는 방향은 '에'를 씁니다.",
		attempts: 1,
	},
	{
		id: "2",
		userAnswer: "친구와 같이 봤어요",
		explanation: "'하고'는 말할 때 더 자주 씁니다.",
		attempts: 1,
	},
	{
		id: "3",
		userAnswer: "책상이 책이 있어요",
		explanation: "있는 자리를 말할 때는 '에'입니다.",
		attempts: 3,
	},
	{
		id: "4",
		userAnswer: "저가 학생이에요",
		explanation: "'저'에는 '는'이 붙습니다.",
		attempts: 1,
	},
];

/** 완전 정답 — 둘 다 0. 축하 문구 + [다음 활동] 전폭 */
export const Perfect: Story = {
	args: {
		answeredCount: 18,
		totalItems: 18,
		gradedCount: 18,
		correctCount: 18,
		firstTryWrongCount: 0,
		unresolvedCount: 0,
	},
};

/** 내일 복습 — 미해결 0 · 첫 시도 오답 ≥ 1. 선택지형 5종의 기본이다 */
export const HasWrong: Story = {
	args: {
		answeredCount: 18,
		totalItems: 18,
		gradedCount: 18,
		correctCount: 14,
		firstTryWrongCount: 4,
		unresolvedCount: 0,
		wrongItems: wrong,
	},
};

/** 미해결 있음 — 건너뛴 문항이 있다. [다시 풀기] + [다음 활동] 절반씩 */
export const HasUnresolved: Story = {
	args: {
		answeredCount: 16,
		totalItems: 18,
		gradedCount: 16,
		correctCount: 12,
		firstTryWrongCount: 4,
		unresolvedCount: 2,
		wrongItems: wrong,
	},
};

/**
 * 정답률이 없는 활동 — 발음(자모 sub=1·3)과 플래시카드는 채점하지 않는다.
 * gradedCount 가 0 이라 정답률이 — 가 되고, 화면 분기는 그것뿐이다.
 */
export const NoAccuracy: Story = {
	args: {
		answeredCount: 45,
		totalItems: 45,
		gradedCount: 0,
		correctCount: 0,
		firstTryWrongCount: 0,
		unresolvedCount: 0,
	},
};

/** 다시 풀기 종료 — 완료 문구 + [돌아가기] */
export const ReviewDone: Story = {
	args: {
		answeredCount: 10,
		totalItems: 10,
		gradedCount: 10,
		correctCount: 10,
		firstTryWrongCount: 0,
		unresolvedCount: 0,
		reviewDone: true,
	},
};

/** 가장 긴 문자열 검사 — 폭 320 · 베트남어(§14 검증 8) */
export const Vietnamese320: Story = {
	args: { ...HasUnresolved.args },
	globals: { locale: "vi", viewport: { value: "w320" } },
};
