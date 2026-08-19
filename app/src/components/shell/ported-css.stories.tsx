import type { Meta, StoryObj } from "@storybook/react";

/**
 * 이관 검증 — 각 목업의 CSS 가 앱에서 같은 값을 내는지 확인한다.
 * 마크업은 목업 것을 그대로 쓴다. 컴포넌트로 쪼개는 것은 2단계다.
 */
const meta = {
	title: "이관 검증/목업별",
	parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;
type Story = StoryObj;

/** 내비 · 홈 */
export const NavHome: Story = {
	render: () => (
		<div className="nav-frame" style={{ height: 720 }}>
			<div className="scroll">
				<div className="greet">
					<div className="hi">
						<span className="name">수현</span> 님
					</div>
				</div>
				<div className="week">
					<div className="days">
						{["월", "화", "수", "목", "금", "토", "일"].map((d, i) => (
							<div key={d} className={i < 3 ? "d c" : "d"}>
								{d}
							</div>
						))}
					</div>
					<div className="streak">3일 연속 학습 중</div>
				</div>
				<div className="pad">
					<div className="sec-title">학습 현황</div>
					<div className="status">
						<div className="gauge" />
						<div className="stats">
							<div className="stat2">오늘 활동 수</div>
							<div className="stat2">주간 활동 수</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	),
};

/** 조사 스나이퍼 — 과녁 (게임 팔레트) */
export const SniperPlay: Story = {
	render: () => (
		<div className="game-frame" data-screen="ps_play" style={{ height: 720 }}>
			<div className="ps-stage">
				<div className="ps-range">
					<div className="ps-target-question">
						<div className="ps-sentence">
							저는 한국어
							<span className="ps-blank" />
							공부해요
						</div>
					</div>
					<div className="ps-reticle" />
				</div>
			</div>
		</div>
	),
};

/** VocaShot 시작 */
export const VocashotStart: Story = {
	render: () => (
		<div className="vocashot-start" style={{ height: 720 }}>
			<div className="g-body">
				<div className="g-intro">
					<span className="g-lb">VOCASHOT</span>
				</div>
				<div className="best">
					<span className="k">최고 점수</span>
					<span className="v">210</span>
				</div>
				<div className="lv">
					{["1급", "2급", "3급", "4급"].map((l) => (
						<button key={l} type="button" className="seg">
							{l}
						</button>
					))}
				</div>
			</div>
			<div className="g-dock">
				<button type="button" className="g-go">
					시작하기
				</button>
			</div>
		</div>
	),
};
