import type { Meta, StoryObj } from "@storybook/react";

/**
 * 이관 대조용 — activity.css 가 목업과 같은 수치를 내는지 눈과 수치로 확인한다.
 * 목업의 마크업을 그대로 쓴다. 컴포넌트로 쪼개는 것은 2단계다.
 */
const meta = {
	title: "Shell/이관 대조",
	parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;
type Story = StoryObj;

/** 문법 · 빈칸 — chip-opt */
export const Grammar: Story = {
	render: () => (
		<div className="activity-frame" style={{ height: 720 }}>
			<div className="appbar">
				<button type="button" className="icon-control">
					✕
				</button>
				<div className="lesson">1급 4과</div>
				<button type="button" className="icon-control">
					→
				</button>
			</div>
			<div className="progress-wrap segmented">
				<div className="progress">
					<i className="done" />
					<i className="now" />
					<i />
					<i />
					<i />
					<i />
					<i />
					<i />
				</div>
			</div>
			<div className="activity-content">
				<div className="scroll-area">
					<div className="problem-card">
						<div className="instruction">빈칸에 알맞은 것을 고르세요.</div>
						<div className="stimulus">
							<div className="blank-card">
								오늘 날씨가 <b>___</b> 밖에 나가고 싶어요.
							</div>
						</div>
						<div className="response-area">
							<div className="chip-wrap">
								<button type="button" className="chip-opt">
									좋아서
								</button>
								<button type="button" className="chip-opt">
									좋지만
								</button>
								<button type="button" className="chip-opt">
									좋으면
								</button>
								<button type="button" className="chip-opt">
									좋아도
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="feedback-slot" />
			<div className="footer">
				<div className="dock">
					<button type="button" className="primary">
						다음
					</button>
				</div>
			</div>
		</div>
	),
};

/** 어휘 문제 — choice 목록 */
export const WordQuiz: Story = {
	render: () => (
		<div className="activity-frame" style={{ height: 720 }}>
			<div className="appbar">
				<button type="button" className="icon-control">
					✕
				</button>
				<div className="lesson">1급 4과</div>
				<button type="button" className="icon-control">
					→
				</button>
			</div>
			<div className="progress-wrap segmented">
				<div className="progress">
					<i className="done" />
					<i className="now" />
					<i />
					<i />
				</div>
			</div>
			<div className="activity-content">
				<div className="scroll-area">
					<div className="problem-card">
						<div className="instruction">알맞은 뜻을 고르세요.</div>
						<div className="stimulus">
							<div className="word-focus">
								<strong>학생</strong>
							</div>
						</div>
						<div className="response-area">
							<div className="choice-list">
								<button type="button" className="choice">
									<span>학교에서 공부하는 사람</span>
								</button>
								<button type="button" className="choice correct">
									<span>학교에서 가르치는 사람</span>
									<span className="choice-mark">✓</span>
								</button>
								<button type="button" className="choice wrong">
									<span>병원에서 일하는 사람</span>
									<span className="choice-mark">✕</span>
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div className="feedback-slot" />
			<div className="footer">
				<div className="dock">
					<button type="button" className="primary on">
						다음
					</button>
				</div>
			</div>
		</div>
	),
};
