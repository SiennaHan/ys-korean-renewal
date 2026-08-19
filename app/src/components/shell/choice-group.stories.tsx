import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { type Choice, ChoiceGroup, type ChoiceVerdict } from "./choice-group";
import { FeedbackPill } from "./feedback-pill";

/**
 * §5.1 스토리 목록 — 3배치(2·3·4개) × 4상태 + 오답 진동.
 *
 * 선택지 수는 데이터에서 받는 가변값이다 — 1과가 2지선다, 3과가 3지선다로 실제로 섞인다(§5).
 */
const meta = {
	title: "Shell/ChoiceGroup",
	component: ChoiceGroup,
	decorators: [
		(Story) => (
			<div className="min-h-dvh bg-background-base px-4 py-5">
				<Story />
			</div>
		),
	],
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ChoiceGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const two: Choice[] = [
	{ id: "a", label: "은" },
	{ id: "b", label: "는" },
];
const three: Choice[] = [
	{ id: "a", label: "학생이에요" },
	{ id: "b", label: "학생이여요" },
	{ id: "c", label: "학생예요" },
];
const four: Choice[] = [
	{ id: "a", label: "도서관에서 책을 빌렸어요" },
	{ id: "b", label: "도서관에 책을 빌렸어요" },
	{ id: "c", label: "도서관에서 책이 빌렸어요" },
	{ id: "d", label: "도서관을 책을 빌렸어요" },
];

/** 배치 2개 — 기본 상태 */
export const TwoChoices: Story = {
	args: { choices: two, contentKind: "jamo", correctId: undefined },
};

/** 배치 3개 — 짧은 어휘 */
export const ThreeChoices: Story = {
	args: { choices: three, contentKind: "word" },
};

/** 배치 4개 — 긴 문장은 17/26 · start 정렬 */
export const FourChoices: Story = {
	args: { choices: four, contentKind: "sentence" },
};

/** 정답 — 초록 표면 + ✓ 가 다음 문항 전까지 유지된다 */
export const Correct: Story = {
	args: { choices: three, contentKind: "word", correctId: "a" },
};

/**
 * 오답 진동 — 눌러 보면 좌우 ±6 · 300ms 흔들리고 약 650ms 뒤 기본으로 돌아온다.
 * 정답은 공개하지 않고 선택지를 비활성화하지도 않는다. 같은 것을 또 눌러도 매번 반복된다(§6).
 */
export const WrongShake: Story = {
	args: { choices: three, contentKind: "word" },
	render: (args) => <Playable {...args} answer="a" />,
};

/** 폭 320 · 긴 문장 4개 — min-height 68 과 padding 16 을 유지해야 한다(§14 검증 9) */
export const NarrowLongSentences: Story = {
	args: { choices: four, contentKind: "sentence" },
	globals: { viewport: { value: "w320" } },
};

function Playable({
	answer,
	...args
}: { answer: string } & Parameters<typeof ChoiceGroup>[0]) {
	const [verdict, setVerdict] = useState<ChoiceVerdict | null>(null);
	const [nonce, setNonce] = useState(0);
	const [solved, setSolved] = useState<string | undefined>();

	return (
		<div className="flex flex-col gap-6">
			<ChoiceGroup
				{...args}
				correctId={solved}
				judge={(id) => (id === answer ? "correct" : "wrong")}
				onSelect={(id, v) => {
					setVerdict(v);
					setNonce((n) => n + 1);
					if (v === "correct") setSolved(id);
				}}
			/>
			<FeedbackPill verdict={verdict} nonce={nonce} />
		</div>
	);
}
