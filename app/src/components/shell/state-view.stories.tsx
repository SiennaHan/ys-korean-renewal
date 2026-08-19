import type { Meta, StoryObj } from "@storybook/react";
import { StateView } from "./state-view";

/** §5.1 스토리 목록 — 5상태(로딩 · 실패 · 음성없음 · 마이크거부 · 종료확인) */
const meta = {
	title: "Shell/StateView",
	component: StateView,
	decorators: [
		(Story) => (
			<div className="min-h-dvh bg-background-base px-4 py-5">
				<Story />
			</div>
		),
	],
	parameters: { layout: "fullscreen" },
} satisfies Meta<typeof StateView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 문항 목록 대기 — 밴드에 스켈레톤 */
export const Loading: Story = { args: { state: "loading" } };

/** API 오류·타임아웃. 진도를 건드리지 않는다 */
export const LoadFailed: Story = { args: { state: "loadFailed" } };

/** TTS 미생성. 문항 자체는 풀 수 있고, 듣기 문항만 건너뛴다 */
export const AudioPreparing: Story = { args: { state: "audioPreparing" } };

/** 롤플레잉·미션 대화 진입. 미션 대화는 키보드 입력으로 계속 갈 수 있다 */
export const MicDenied: Story = { args: { state: "micDenied" } };

/** 미션 대화에서만. 재개 지점이 없어 처음부터 시작되기 때문에 확인을 받는다 */
export const ExitConfirmChat: Story = { args: { state: "exitConfirmChat" } };

/** 가장 긴 문자열 검사 — 보통 베트남어가 가장 길다(§14 검증 8) */
export const MicDeniedVietnamese320: Story = {
	args: { state: "micDenied" },
	globals: { locale: "vi", viewport: { value: "w320" } },
};
